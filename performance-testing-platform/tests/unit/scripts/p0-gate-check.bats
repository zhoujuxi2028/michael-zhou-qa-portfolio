#!/usr/bin/env bats

# P0 Gate Check 脚本 — TDD 测试套件 (Bats)
#
# 覆盖项：
#   - 脚本基础结构（存在、可执行、help、错误处理）
#   - 公共库 lib/gate-check-common.sh 的工具函数
#   - 5 个 P0 检查项的"骨架"行为（不实跑慢命令，使用 PATH 注入 mock）
#
# 运行：
#   cd performance-testing-platform
#   npx bats tests/unit/scripts/p0-gate-check.bats

setup() {
  PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_DIRNAME")/../.." && pwd)"
  export PROJECT_ROOT
  export SCRIPT="${PROJECT_ROOT}/scripts/p0-gate-check.sh"
  export LIB="${PROJECT_ROOT}/scripts/lib/gate-check-common.sh"

  # 隔离测试输出目录（防止污染真实 reports/）
  TEST_TMP="$(mktemp -d)"
  export TEST_TMP
  export GATE_REPORT_DIR="${TEST_TMP}/reports"
  export GATE_LOG_DIR="${TEST_TMP}/logs"
  mkdir -p "$GATE_REPORT_DIR" "$GATE_LOG_DIR"
}

teardown() {
  rm -rf "$TEST_TMP"
}

# ---- mock npm 工具：写入 $TEST_TMP/bin/npm 并加到 PATH 前 ----
# 用法：mock_npm <script-name> <exit-code> [stdout]
mock_npm() {
  local target="$1" code="$2" out="${3:-}"
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << EOF
#!/usr/bin/env bash
# Mock npm — 仅识别 'run <target>' 与 'test'
if [ "\$1" = "run" ] && [ "\$2" = "${target}" ]; then
  printf '%s\n' "${out}"
  exit ${code}
fi
# 兜底：未声明的目标返回成功
echo "mock-npm: unhandled args: \$*" >&2
exit 0
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"
}

# ============================================================
# 前置条件
# ============================================================

@test "前置: P0 脚本文件存在" {
  [ -f "$SCRIPT" ]
}

@test "前置: P0 脚本可执行" {
  [ -x "$SCRIPT" ]
}

@test "前置: 公共库 lib/gate-check-common.sh 存在" {
  [ -f "$LIB" ]
}

@test "前置: 脚本声明 #!/usr/bin/env bash 或 #!/bin/bash" {
  head -1 "$SCRIPT" | grep -qE '^#!.*bash$'
}

@test "前置: 脚本启用 set -uo pipefail（不允许未定义变量）" {
  grep -qE 'set -[a-z]*u[a-z]*o pipefail|set -uo pipefail|set -euo pipefail' "$SCRIPT"
}

# ============================================================
# CLI / 帮助
# ============================================================

@test "CLI: --help 输出包含 'P0 Gate Check' 与所有 5 个检查项" {
  run bash "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"P0 Gate Check"* ]]
  [[ "$output" == *"test:unit"* ]]
  [[ "$output" == *"lint"* ]]
  [[ "$output" == *"format:check"* ]]
  [[ "$output" == *"test:coverage"* ]]
  [[ "$output" == *"jmeter:dryrun"* ]]
}

@test "CLI: -h 等价于 --help" {
  run bash "$SCRIPT" -h
  [ "$status" -eq 0 ]
  [[ "$output" == *"P0 Gate Check"* ]]
}

@test "CLI: 未知参数应报错并 exit != 0" {
  run bash "$SCRIPT" --bogus-flag
  [ "$status" -ne 0 ]
  [[ "$output" == *"unknown"* || "$output" == *"未知"* ]]
}

# ============================================================
# 公共库工具函数
# ============================================================

@test "lib: log_result PASS 自增 PASS 计数" {
  run bash -c "source '$LIB'; log_result 'P0-01' PASS 'demo'; echo \"P=\$PASS F=\$FAIL S=\$SKIP\""
  [ "$status" -eq 0 ]
  [[ "$output" == *"P=1 F=0 S=0"* ]]
}

@test "lib: log_result FAIL 自增 FAIL 计数" {
  run bash -c "source '$LIB'; log_result 'P0-01' FAIL 'demo'; echo \"P=\$PASS F=\$FAIL S=\$SKIP\""
  [ "$status" -eq 0 ]
  [[ "$output" == *"P=0 F=1 S=0"* ]]
}

@test "lib: log_result SKIP 自增 SKIP 计数" {
  run bash -c "source '$LIB'; log_result 'P0-01' SKIP 'demo'; echo \"P=\$PASS F=\$FAIL S=\$SKIP\""
  [ "$status" -eq 0 ]
  [[ "$output" == *"P=0 F=0 S=1"* ]]
}

@test "lib: extract_coverage 从覆盖率行解析四列百分比" {
  # Jest 覆盖率表行: "All files |   85.5 |   72.3 |   80.1 |   84.9 |"
  run bash -c "source '$LIB'; line='All files |   85.5 |   72.3 |   80.1 |   84.9 |'; extract_coverage \"\$line\""
  [ "$status" -eq 0 ]
  [[ "$output" == *"85.5"* ]]
  [[ "$output" == *"72.3"* ]]
  [[ "$output" == *"80.1"* ]]
  [[ "$output" == *"84.9"* ]]
}

@test "lib: meets_threshold 大于等于阈值返回 0" {
  run bash -c "source '$LIB'; meets_threshold 80.0 80"
  [ "$status" -eq 0 ]
}

@test "lib: meets_threshold 小于阈值返回 1" {
  run bash -c "source '$LIB'; meets_threshold 79.9 80"
  [ "$status" -eq 1 ]
}

@test "lib: write_report 生成包含统计的 Markdown 文件" {
  run bash -c "source '$LIB'; PASS=3 FAIL=1 SKIP=1 RESULTS=$'\n  ✅ P0-01: x' write_report 'P0' '$TEST_TMP/r.md' 5"
  [ "$status" -eq 0 ]
  [ -f "$TEST_TMP/r.md" ]
  grep -q "P0" "$TEST_TMP/r.md"
  grep -qE "通过|PASS" "$TEST_TMP/r.md"
}

# ============================================================
# 端到端：P0 全 PASS 场景（mock 所有 npm 命令成功）
# ============================================================

@test "端到端: 5 项全 PASS 时退出码为 0 并生成报告" {
  # 写一个能识别所有 P0 命令的 mock
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:unit")
    echo "Tests: 148 passed, 148 total"
    exit 0
    ;;
  "run lint")
    echo "0 errors"
    exit 0
    ;;
  "run format:check")
    echo "All matched files use Prettier code style!"
    exit 0
    ;;
  "run test:coverage")
    cat << 'COV'
File         | % Stmts | % Branch | % Funcs | % Lines |
-------------|---------|----------|---------|---------|
All files    |   85.50 |    72.10 |   81.30 |   84.90 |
COV
    exit 0
    ;;
  "run jmeter:dryrun")
    echo "  ✅ Dry-run passed — 5/5 requests successful"
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"

  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -eq 0 ]
  [[ "$output" == *"P0-01"* ]]
  [[ "$output" == *"P0-02"* ]]
  [[ "$output" == *"P0-03"* ]]
  [[ "$output" == *"P0-04"* ]]
  [[ "$output" == *"P0-05"* ]]
  [ -f "$GATE_REPORT_DIR/p0-gate-report.md" ]
}

# ============================================================
# 端到端：单元测试失败场景
# ============================================================

@test "端到端: 单元测试失败时整体退出码非 0（fail-late）" {
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:unit")
    echo "Tests: 1 failed, 147 passed, 148 total"
    exit 1
    ;;
  "run test:coverage")
    echo "All files    |   85.50 |    72.10 |   81.30 |   84.90 |"
    exit 0
    ;;
  *) exit 0 ;;
esac
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"

  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -ne 0 ]
  # fail-late：尽管 P0-01 失败，仍应继续执行后续检查项
  [[ "$output" == *"P0-05"* ]]
}

# ============================================================
# 端到端：覆盖率不达标场景
# ============================================================

@test "端到端: 覆盖率 stmt < 80% 时 P0-04 应 FAIL" {
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:coverage")
    echo "All files    |   75.50 |    72.10 |   81.30 |   84.90 |"
    exit 0
    ;;
  *) exit 0 ;;
esac
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"

  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -ne 0 ]
  [[ "$output" == *"P0-04"* ]]
  [[ "$output" == *"FAIL"* ]]
}

@test "端到端: 覆盖率 branch < 70% 时 P0-04 应 FAIL" {
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:coverage")
    echo "All files    |   85.50 |    65.10 |   81.30 |   84.90 |"
    exit 0
    ;;
  *) exit 0 ;;
esac
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"

  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -ne 0 ]
  [[ "$output" == *"P0-04"* ]]
}
