#!/usr/bin/env bats

# P1 Gate Check 脚本 — TDD 测试套件 (Bats)
#
# 覆盖项：
#   - 脚本基础结构、--fast / --full / --help 模式
#   - 5 个 P1 检查项的"骨架"行为
#
# 运行：
#   cd performance-testing-platform
#   npx bats tests/unit/scripts/p1-gate-check.bats

setup() {
  PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_DIRNAME")/../.." && pwd)"
  export PROJECT_ROOT
  export SCRIPT="${PROJECT_ROOT}/scripts/p1-gate-check.sh"
  export LIB="${PROJECT_ROOT}/scripts/lib/gate-check-common.sh"

  TEST_TMP="$(mktemp -d)"
  export TEST_TMP
  export GATE_REPORT_DIR="${TEST_TMP}/reports"
  export GATE_LOG_DIR="${TEST_TMP}/logs"
  mkdir -p "$GATE_REPORT_DIR" "$GATE_LOG_DIR"

  # 默认 mock：让所有 npm 命令成功
  mkdir -p "$TEST_TMP/bin"
  cat > "$TEST_TMP/bin/npm" << 'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$TEST_TMP/bin/npm"
}

teardown() {
  rm -rf "$TEST_TMP"
}

# ============================================================
# 前置条件
# ============================================================

@test "前置: P1 脚本文件存在" {
  [ -f "$SCRIPT" ]
}

@test "前置: P1 脚本可执行" {
  [ -x "$SCRIPT" ]
}

@test "前置: 脚本启用 set -uo pipefail" {
  grep -qE 'set -[a-z]*u[a-z]*o pipefail' "$SCRIPT"
}

# ============================================================
# CLI / 模式
# ============================================================

@test "CLI: --help 输出 5 个检查项与两个模式" {
  run bash "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"P1 Gate Check"* ]]
  [[ "$output" == *"k6"* ]]
  [[ "$output" == *"jmeter"* || "$output" == *"JMeter"* ]]
  [[ "$output" == *"integration"* || "$output" == *"集成"* ]]
  [[ "$output" == *"continue-on-error"* ]]
  [[ "$output" == *"--fast"* ]]
  [[ "$output" == *"--full"* ]]
}

@test "CLI: -h 等价于 --help" {
  run bash "$SCRIPT" -h
  [ "$status" -eq 0 ]
}

@test "CLI: 未知参数应报错" {
  run bash "$SCRIPT" --bogus
  [ "$status" -ne 0 ]
  [[ "$output" == *"unknown"* || "$output" == *"未知"* ]]
}

# ============================================================
# --fast 模式：跳过 k6 / JMeter / 集成测试，只检查 CI 相关
# ============================================================

@test "--fast: P1-01 (k6 smoke) 应被 SKIP" {
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  # P1-01 行应包含 SKIP 标记
  [[ "$output" == *"P1-01"* ]]
  [[ "$output" == *"SKIP"* ]]
}

@test "--fast: P1-02 (JMeter smoke) 应被 SKIP" {
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"P1-02"* ]]
}

@test "--fast: P1-03 (集成测试) 应被 SKIP" {
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"P1-03"* ]]
}

@test "--fast: 默认模式即 --fast（无参数运行）" {
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"fast"* || "$output" == *"快速"* ]]
}

# ============================================================
# P1-05: continue-on-error workaround 检查
# ============================================================

@test "P1-05: 工作流不存在时应 SKIP" {
  export PATH="$TEST_TMP/bin:$PATH"
  # 通过 --workflow 指向一个不存在的文件
  run bash "$SCRIPT" --fast --workflow "$TEST_TMP/nonexistent.yml" \
    --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"P1-05"* ]]
  [[ "$output" == *"SKIP"* ]]
}

@test "P1-05: 工作流无 continue-on-error 时 PASS" {
  cat > "$TEST_TMP/wf.yml" << 'EOF'
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
EOF
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --workflow "$TEST_TMP/wf.yml" \
    --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"P1-05"* ]]
  echo "$output" | grep -E "PASS.*P1-05"
}

@test "P1-05: 工作流含未豁免 continue-on-error 时 FAIL" {
  cat > "$TEST_TMP/wf.yml" << 'EOF'
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
        continue-on-error: true
EOF
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --workflow "$TEST_TMP/wf.yml" \
    --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -ne 0 ]
  [[ "$output" == *"P1-05"* ]]
  [[ "$output" == *"FAIL"* ]]
}

@test "P1-05: 工作流含已豁免（带 exemption 注释）的 continue-on-error 时 PASS" {
  cat > "$TEST_TMP/wf.yml" << 'EOF'
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      # exemption: R-001 see risks.md
      - run: npm test
        continue-on-error: true
EOF
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --workflow "$TEST_TMP/wf.yml" \
    --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"P1-05"* ]]
  # 输出格式为 "✅ PASS: P1-05 — ..."，因此 PASS 在 P1-05 前
  echo "$output" | grep -E "PASS.*P1-05"
}

# ============================================================
# P1-04: CI 状态查询（gh CLI 不可用应 SKIP）
# ============================================================

@test "P1-04: 无 CI 历史/无 gh 时应 SKIP（不应 FAIL）" {
  # 保留系统 PATH（teardown 需要 rm 等基础命令），只让 npm 走 mock。
  # 在 sandbox 中：gh 可能不存在；即便存在，远端查询也会失败 → 都应得到 SKIP。
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [[ "$output" == *"P1-04"* ]]
  echo "$output" | grep -E "SKIP.*P1-04"
  ! echo "$output" | grep -qE "FAIL.*P1-04"
}

# ============================================================
# 报告生成
# ============================================================

@test "报告: 运行后生成 p1-gate-report.md" {
  export PATH="$TEST_TMP/bin:$PATH"
  run bash "$SCRIPT" --fast --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ -f "$GATE_REPORT_DIR/p1-gate-report.md" ]
  grep -q "P1" "$GATE_REPORT_DIR/p1-gate-report.md"
}

# ============================================================
# 端到端：--fast 全 PASS（CI 工作流干净 + gh 不可用 SKIP）
# ============================================================

@test "端到端: --fast 模式下若 P1-05 PASS 且其余 SKIP 则退出码为 0" {
  cat > "$TEST_TMP/wf.yml" << 'EOF'
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
EOF
  export PATH="$TEST_TMP/bin:/usr/bin:/bin"
  run bash "$SCRIPT" --fast --workflow "$TEST_TMP/wf.yml" \
    --report-dir "$GATE_REPORT_DIR" --log-dir "$GATE_LOG_DIR"
  [ "$status" -eq 0 ]
}
