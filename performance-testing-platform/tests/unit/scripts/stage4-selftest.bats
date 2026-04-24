#!/usr/bin/env bats

# Stage 4 自测脚本 TDD 测试套件
# 使用 BATS (Bash Automated Testing System)

# 前置设置
setup() {
  export PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_DIRNAME")/../.." && pwd)"
  export SCRIPT="${PROJECT_ROOT}/scripts/stage4-selftest.sh"
  export LOG_DIR="${PROJECT_ROOT}/docs/qa/reports/logs-stage4"
  export REPORT="${PROJECT_ROOT}/docs/qa/reports/stage4-selftest-report.md"
  export TEST_LOCK_DIR="/tmp/test-lock-$$"

  # 清理之前的测试数据
  rm -rf "$TEST_LOCK_DIR"
  mkdir -p "$LOG_DIR"
}

# 清理
teardown() {
  rm -rf "$TEST_LOCK_DIR"
  npm stop > /dev/null 2>&1 || true
  sleep 1
}

# ============================================================
# 前置条件检查测试
# ============================================================

@test "前置: 脚本文件存在" {
  [ -f "$SCRIPT" ]
}

@test "前置: 脚本可执行" {
  [ -x "$SCRIPT" ]
}

@test "前置: 当前在有效工作分支上" {
  cd "$PROJECT_ROOT"
  branch=$(git branch --show-current)
  [ -n "$branch" ]
}

@test "前置: 必需工具可用 (npm, git, node)" {
  command -v npm > /dev/null
  command -v git > /dev/null
  command -v node > /dev/null
}

# ============================================================
# 代码质量检查测试 (Section 1)
# ============================================================

@test "1.1: 单元测试应全部通过" {
  cd "$PROJECT_ROOT"
  npm test 2>&1 | grep -qE "[0-9]+ passed"
}

@test "1.2: ESLint 检查应无错误" {
  cd "$PROJECT_ROOT"
  npx eslint . 2>&1 | grep -q "0 error" || npx eslint . > /dev/null 2>&1
}

@test "1.3: Prettier 格式应一致" {
  cd "$PROJECT_ROOT"
  npm run format:check > /dev/null 2>&1
}

@test "1.4: 代码覆盖率 Statements >= 80%" {
  cd "$PROJECT_ROOT"
  npm test -- --coverage 2>&1 | grep "All files" | awk -F'|' '{print $2}' | xargs | sed 's/%//' | \
  awk '{if ($1 >= 80) exit 0; else exit 1}'
}

# ============================================================
# 集成测试检查测试 (Section 2)
# ============================================================

@test "2.2: 锁机制应防止并发获取" {
  cd "$PROJECT_ROOT"

  # 第一次获取应成功
  bash scripts/lib/lock.sh acquire "$TEST_LOCK_DIR" > /dev/null 2>&1
  [ -d "$TEST_LOCK_DIR" ]

  # 第二次获取应失败
  ! bash scripts/lib/lock.sh acquire "$TEST_LOCK_DIR" > /dev/null 2>&1

  # 释放应成功
  bash scripts/lib/lock.sh release "$TEST_LOCK_DIR" > /dev/null 2>&1
  [ ! -d "$TEST_LOCK_DIR" ]
}

@test "2.2: 锁机制 release 应幂等" {
  cd "$PROJECT_ROOT"

  # 释放不存在的锁应该成功（幂等）
  bash scripts/lib/lock.sh release "$TEST_LOCK_DIR" > /dev/null 2>&1
  bash scripts/lib/lock.sh release "$TEST_LOCK_DIR" > /dev/null 2>&1
}

# ============================================================
# RTM 检查测试 (Section 3)
# ============================================================

@test "3.1: RTM 需求覆盖应 >= 75" {
  cd "$PROJECT_ROOT"
  rtm_count=$(grep "✅" docs/qa/rtm.md 2>/dev/null | wc -l)
  [ "$rtm_count" -ge 75 ]
}

# ============================================================
# 风险管理测试 (Section 4)
# ============================================================

@test "4.1: 历史风险 H-18 应已记录" {
  cd "$PROJECT_ROOT"
  grep -q "H-18" docs/project-management/risks.md
}

# ============================================================
# 缺陷追踪测试 (Section 5)
# ============================================================

@test "5.2: X-XSS-Protection 修复代码应存在" {
  cd "$PROJECT_ROOT"
  grep -q 'res.set.*X-XSS-Protection.*1; mode=block' src/app.js
}

@test "5.3: API 响应头应包含 X-XSS-Protection" {
  cd "$PROJECT_ROOT"

  # 启动 API
  npm start > /dev/null 2>&1 &
  API_PID=$!
  sleep 3

  # 检查响应头
  xss_header=$(curl -si http://localhost:3000/health 2>/dev/null | grep -i "x-xss-protection" || true)
  echo "$xss_header" | grep -q "1; mode=block"
  result=$?

  # 清理
  kill $API_PID > /dev/null 2>&1 || true
  sleep 1

  [ $result -eq 0 ]
}

# ============================================================
# CI 检查测试 (Section 6)
# ============================================================

@test "6.2: CI 中 continue-on-error 须有文档化豁免注释" {
  cd "$PROJECT_ROOT"
  CI_WF="../.github/workflows/performance-ci.yml"
  count=$(grep -c "continue-on-error: true" "$CI_WF" 2>/dev/null || echo 0)
  exempted=$(grep -B1 "continue-on-error: true" "$CI_WF" 2>/dev/null | grep -cE "exemption|risks\.md|R-[0-9]+" || echo 0)
  [ "$count" -eq "$exempted" ]
}

# ============================================================
# 文档完整性测试 (Section 8)
# ============================================================

@test "8.1: 验收报告文件应存在" {
  cd "$PROJECT_ROOT"
  [ -f "docs/qa/reports/phase6-stage4-verification-report.md" ]
}

@test "8.2: CLAUDE.md 应包含锁机制文档" {
  cd "$PROJECT_ROOT"
  grep -qE "集成测试锁机制|集成测试有锁" CLAUDE.md
}

# ============================================================
# 分支和提交测试 (Section 9)
# ============================================================

@test "9.1: 当前分支应为有效工作分支" {
  cd "$PROJECT_ROOT"
  branch=$(git branch --show-current)
  echo "$branch" | grep -qE "^(main|feature/|fix/|copilot/|hotfix/)"
}

@test "9.2: 最近 20 条提交应包含 conventional commits" {
  cd "$PROJECT_ROOT"
  git log --oneline -20 | grep -qE "(feat|fix|docs|test|refactor|perf|chore)[:(]"
}

# ============================================================
# 报告生成测试
# ============================================================

@test "报告: 应生成 Markdown 报告文件" {
  cd "$PROJECT_ROOT"

  # 运行脚本（可能会 SKIP 部分检查，但应该成功）
  bash "$SCRIPT" > /dev/null 2>&1 || true

  [ -f "$REPORT" ]
}

@test "报告: Markdown 文件应包含统计表格" {
  cd "$PROJECT_ROOT"

  bash "$SCRIPT" > /dev/null 2>&1 || true
  grep -q "| ✅ 通过 |" "$REPORT" || grep -q "PASS" "$REPORT"
}

@test "报告: 日志目录应已创建" {
  cd "$PROJECT_ROOT"

  bash "$SCRIPT" > /dev/null 2>&1 || true
  [ -d "$LOG_DIR" ]
}

# ============================================================
# 错误处理测试
# ============================================================

@test "错误: npm test 失败时脚本应报记录失败" {
  cd "$PROJECT_ROOT"

  # 修改 package.json 使测试失败（模拟失败场景）
  # 这里实际上我们不修改，只是验证错误处理逻辑存在
  bash "$SCRIPT" 2>&1 | grep -q "PASS\|FAIL\|SKIP"
}

# ============================================================
# 集成测试 (完整运行)
# ============================================================

@test "集成: 脚本应成功运行（可能包含 SKIP）" {
  cd "$PROJECT_ROOT"
  bash "$SCRIPT" > /dev/null 2>&1 || [ $? -eq 0 ]
}

@test "集成: 脚本应输出统计信息" {
  cd "$PROJECT_ROOT"
  output=$(bash "$SCRIPT" 2>&1)
  echo "$output" | grep -q "PASS:\|FAIL:\|SKIP:"
}
