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
  grep -qE 'set -[a-z]*u[a-z]*o pipefail' "$SCRIPT"
}

@test "前置: 覆盖率脚本不得使用 Bash 特殊变量 LINES 保存 line coverage" {
  ! grep -Eq 'read .* LINES|\$LINES' "$SCRIPT"
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

@test "lib: extract_coverage_summary 从 coverage-summary.json 解析 total 百分比" {
  local summary="${TEST_TMP}/coverage-summary.json"
  cat > "$summary" << 'EOF'
{
  "total": {
    "statements": { "pct": 95.82 },
    "branches": { "pct": 92.64 },
    "functions": { "pct": 100 },
    "lines": { "pct": 97.37 }
  }
}
EOF

  run bash -c "source '$LIB'; extract_coverage_summary '$summary'"
  [ "$status" -eq 0 ]
  [ "$output" = "95.82 92.64 100 97.37" ]
}

@test "lib: meets_threshold 大于等于阈值返回 0" {
  run bash -c "source '$LIB'; meets_threshold 80.0 80"
  [ "$status" -eq 0 ]
}

@test "lib: meets_threshold 小于阈值返回 1" {
  run bash -c "source '$LIB'; meets_threshold 79.9 80"
  [ "$status" -eq 1 ]
}

@test "lib: below_threshold 实际值小于阈值返回 0（用于错误率上限）" {
  run bash -c "source '$LIB'; below_threshold 0.5 1"
  [ "$status" -eq 0 ]
}

@test "lib: below_threshold 实际值等于或大于阈值返回 1" {
  run bash -c "source '$LIB'; below_threshold 1.0 1"
  [ "$status" -eq 1 ]
  run bash -c "source '$LIB'; below_threshold 2.5 1"
  [ "$status" -eq 1 ]
}

@test "lib: sanitize_number 清洗多行/非数字输入" {
  run bash -c "source '$LIB'; sanitize_number ''"
  [ "$output" = "0" ]
  run bash -c "source '$LIB'; sanitize_number $'3\n'"
  [ "$output" = "3" ]
  run bash -c "source '$LIB'; sanitize_number 'abc'"
  [ "$output" = "0" ]
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
  export COV_SUMMARY_PATH="${TEST_TMP}/coverage-summary.json"
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
    cat > "${COV_SUMMARY_PATH}" << 'JSON'
{"total":{"statements":{"pct":85.50},"branches":{"pct":72.10},"functions":{"pct":81.30},"lines":{"pct":84.90}}}
JSON
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

@test "端到端: 覆盖率 summary 未重新生成时 P0-04 应 FAIL" {
  export COV_SUMMARY_PATH="${TEST_TMP}/coverage-summary.json"
  cat > "$COV_SUMMARY_PATH" << 'JSON'
{"total":{"statements":{"pct":100},"branches":{"pct":100},"functions":{"pct":100},"lines":{"pct":100}}}
JSON

  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:coverage")
    echo "coverage command succeeded without summary"
    exit 0
    ;;
  *) exit 0 ;;
esac
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"

  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -ne 0 ]
  [[ "$output" == *"coverage summary 未生成"* ]]
}

@test "端到端: 覆盖率 summary 无效时 P0-04 应报告解析失败" {
  export COV_SUMMARY_PATH="${TEST_TMP}/coverage-summary.json"
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:coverage")
    echo '{"total":{"statements":{"pct":95.82}}}' > "${COV_SUMMARY_PATH}"
    exit 0
    ;;
  *) exit 0 ;;
esac
EOF
  chmod +x "$TEST_TMP/bin/npm"
  export PATH="$TEST_TMP/bin:$PATH"

  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -ne 0 ]
  [[ "$output" == *"未能解析 coverage summary"* ]]
  [[ "$output" != *"覆盖率不达标 (stmt=%"* ]]
}

# ============================================================
# 端到端：单元测试失败场景
# ============================================================

@test "端到端: 单元测试失败时整体退出码非 0（fail-late）" {
  export COV_SUMMARY_PATH="${TEST_TMP}/coverage-summary.json"
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:unit")
    echo "Tests: 1 failed, 147 passed, 148 total"
    exit 1
    ;;
  "run test:coverage")
    cat > "${COV_SUMMARY_PATH}" << 'JSON'
{"total":{"statements":{"pct":85.50},"branches":{"pct":72.10},"functions":{"pct":81.30},"lines":{"pct":84.90}}}
JSON
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
  export COV_SUMMARY_PATH="${TEST_TMP}/coverage-summary.json"
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:coverage")
    cat > "${COV_SUMMARY_PATH}" << 'JSON'
{"total":{"statements":{"pct":75.50},"branches":{"pct":72.10},"functions":{"pct":81.30},"lines":{"pct":84.90}}}
JSON
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
  export COV_SUMMARY_PATH="${TEST_TMP}/coverage-summary.json"
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "run test:coverage")
    cat > "${COV_SUMMARY_PATH}" << 'JSON'
{"total":{"statements":{"pct":85.50},"branches":{"pct":65.10},"functions":{"pct":81.30},"lines":{"pct":84.90}}}
JSON
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
