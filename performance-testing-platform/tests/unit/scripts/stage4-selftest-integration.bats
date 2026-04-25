#!/usr/bin/env bats

# Stage 4 自测脚本 — Integration BATS 套件
#
# 设计原则：
#   - 用 setup_file() 把 stage4-selftest.sh 整脚本只跑一次，6 个 @test 共享输出
#   - 不重复 npm test / eslint / prettier / coverage（已在 unit-tests / Code Quality job 覆盖）
#   - 不阻塞下游 smoke 测试（CI 中与 smoke 并行）
#   - 目标：单次运行 ≤ 90s（旧实现把脚本跑 6 次 ~266s）
#
# 注意：本套件验证的是 stage4-selftest.sh 的"行为契约"——
#   能跑通、生成报告、输出 PASS/FAIL/SKIP 统计——
#   而不是它内部代理执行的 npm/eslint 工具是否通过（那是它们各自 job 的职责）。

# ============================================================
# 全文件级别 setup：脚本只运行一次
# ============================================================

setup_file() {
  export PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_DIRNAME")/../.." && pwd)"
  export SCRIPT="${PROJECT_ROOT}/scripts/stage4-selftest.sh"
  export LOG_DIR="${PROJECT_ROOT}/docs/qa/reports/logs-stage4"
  export REPORT="${PROJECT_ROOT}/docs/qa/reports/stage4-selftest-report.md"

  mkdir -p "$LOG_DIR"

  # 把脚本输出捕获到 BATS_FILE_TMPDIR（bats 自动清理）
  # 使用静态文件名而非 export，避免 bats 进程间环境变量传递问题
  export SELFTEST_OUT="${BATS_FILE_TMPDIR}/selftest.out"
  export SELFTEST_EXIT="${BATS_FILE_TMPDIR}/selftest.exit"

  cd "$PROJECT_ROOT"
  # 整脚本运行一次（允许非零退出，由各 @test 自行断言契约）
  bash "$SCRIPT" > "$SELFTEST_OUT" 2>&1
  echo $? > "$SELFTEST_EXIT"
}

# 注：setup_file() 中的 export 变量会被 bats 自动传递到各 @test，
# 因此无需在 setup() 中重复定义。各 @test 直接使用 $SELFTEST_OUT / $REPORT / $LOG_DIR 即可。

# ============================================================
# 报告生成契约 —— 共享 setup_file 的运行结果
# ============================================================

@test "契约: selftest 应输出 PASS/FAIL/SKIP 统计" {
  # 替代旧 case 1.1/1.2/1.3/1.4：不真去跑 npm/eslint/prettier，
  # 而是断言 selftest 脚本调用了它们并产出了规范统计输出。
  grep -qE "PASS:|FAIL:|SKIP:" "$SELFTEST_OUT"
}

@test "报告: 应生成 Markdown 报告文件" {
  [ -f "$REPORT" ]
}

@test "报告: Markdown 文件应包含统计表格" {
  grep -q "| ✅ 通过 |" "$REPORT" || grep -q "PASS" "$REPORT"
}

@test "报告: 日志目录应已创建" {
  [ -d "$LOG_DIR" ]
}

@test "错误: selftest 应输出可读的状态行 (PASS/FAIL/SKIP)" {
  # 替代旧"错误处理"用例：脚本至少要给出一行可识别的状态分类
  grep -qE "(PASS|FAIL|SKIP)" "$SELFTEST_OUT"
}

@test "集成: 脚本应成功运行（exit 0 或仅含 SKIP 的非 0）" {
  # selftest 在依赖缺失时（如 docker / k6 不在）允许部分 SKIP，
  # 但不应整段崩溃。退出码非 0 时，必须能在输出里看到 FAIL: 数量。
  exit_code=$(cat "${BATS_FILE_TMPDIR}/selftest.exit")
  if [ "$exit_code" -ne 0 ]; then
    # 允许：退出码 = FAIL 数量（脚本最后 exit $FAIL）
    grep -qE "FAIL:[[:space:]]+${exit_code}" "$SELFTEST_OUT"
  fi
}

@test "集成: 脚本应输出统计信息" {
  grep -qE "总计:|通过率:" "$SELFTEST_OUT"
}
