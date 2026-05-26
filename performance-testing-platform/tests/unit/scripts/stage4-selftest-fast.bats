#!/usr/bin/env bats

# Stage 4 自测脚本 — Fast BATS 套件
#
# 设计原则：
#   - 仅做"快速静态断言"：文件存在、grep 文档内容、shell 库契约
#   - 不调用 npm test / eslint / prettier / coverage（这些已在 unit-tests / Code Quality job 覆盖）
#   - 不启动 API、不跑 stage4-selftest.sh 整脚本（那些用例在 stage4-selftest-integration.bats）
#   - 目标：单次运行 ≤ 30s，作为 CI 关键路径阻塞 smoke 的快速门禁

setup() {
  export PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_DIRNAME")/../.." && pwd)"
  export SCRIPT="${PROJECT_ROOT}/scripts/stage4-selftest.sh"
  export TEST_LOCK_DIR="/tmp/test-lock-$$"
  rm -rf "$TEST_LOCK_DIR"
}

teardown() {
  rm -rf "$TEST_LOCK_DIR"
}

# ============================================================
# 前置条件检查
# ============================================================

@test "前置: 脚本文件存在" {
  [ -f "$SCRIPT" ]
}

@test "前置: 脚本可执行" {
  [ -x "$SCRIPT" ]
}

@test "前置: 当前在有效工作分支上" {
  cd "$PROJECT_ROOT"
  branch=$(git branch --show-current 2>/dev/null)
  if [ -z "$branch" ]; then
    branch="${GITHUB_HEAD_REF:-}"
  fi
  [ -n "$branch" ]
}

@test "前置: 必需工具可用 (npm, git, node)" {
  command -v npm > /dev/null
  command -v git > /dev/null
  command -v node > /dev/null
}

# ============================================================
# 集成测试检查 (Section 2) — 仅 lock.sh 的 shell 单元契约
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
# RTM 检查 (Section 3)
# ============================================================

@test "3.1: RTM 需求覆盖应 >= 75" {
  cd "$PROJECT_ROOT"
  rtm_count=$(grep "✅" docs/qa/rtm.md 2>/dev/null | wc -l)
  [ "$rtm_count" -ge 75 ]
}

# ============================================================
# 风险管理 (Section 4)
# ============================================================

@test "4.1: 历史风险 H-18 应已记录" {
  cd "$PROJECT_ROOT"
  grep -q "H-18" docs/project-management/risks.md
}

# ============================================================
# 缺陷追踪 (Section 5) — 仅静态代码断言
# ============================================================
#
# 注: 5.3 (X-XSS-Protection 响应头) 已迁移至 Jest 集成测试
# tests/integration/middleware/security-headers.integration.test.js (SEC-INT-03)
# 不再在 BATS 中启动 API + curl

@test "5.2: X-XSS-Protection 修复代码应存在" {
  cd "$PROJECT_ROOT"
  grep -q 'res.set.*X-XSS-Protection.*1; mode=block' src/app.js
}

# ============================================================
# CI 检查 (Section 6)
# ============================================================

@test "6.2: CI 中 continue-on-error 须有文档化豁免注释" {
  cd "$PROJECT_ROOT"
  CI_WF="../.github/workflows/performance-ci.yml"
  count=$(grep -c "continue-on-error: true" "$CI_WF" 2>/dev/null || echo 0)
  exempted=$(grep -B1 "continue-on-error: true" "$CI_WF" 2>/dev/null | grep -cE "exemption|risks\.md|R-[0-9]+" || echo 0)
  [ "$count" -eq "$exempted" ]
}

# ============================================================
# 文档完整性 (Section 8)
# ============================================================

@test "8.1: 验收报告文件应存在" {
  cd "$PROJECT_ROOT"
  [ -f "docs/qa/reports/execution/phase6-stage4-verification-report.md" ]
}

@test "8.2: CLAUDE.md 应包含锁机制文档" {
  cd "$PROJECT_ROOT"
  grep -qE "集成测试锁机制|集成测试有锁" CLAUDE.md
}

# ============================================================
# 分支和提交 (Section 9)
# ============================================================

@test "9.1: 当前分支应为有效工作分支" {
  cd "$PROJECT_ROOT"
  branch=$(git branch --show-current 2>/dev/null)
  if [ -z "$branch" ]; then
    branch="${GITHUB_HEAD_REF:-}"
  fi
  echo "$branch" | grep -qE "^(main|feature/|fix/|docs/|copilot/|hotfix/)"
}

@test "9.2: 最近 20 条提交应包含 conventional commits" {
  cd "$PROJECT_ROOT"
  # 浅克隆环境跳过检查（CI 已设 fetch-depth: 50，正常情况下足够）
  if [ -f ".git/shallow" ] && [ "$(git rev-list --count HEAD 2>/dev/null || echo 1)" -le 1 ]; then
    skip "浅克隆环境无法验证 conventional commits"
  fi
  # --no-merges 替代后置 grep -v " Merge "，更可靠
  git log --oneline -n 20 --no-merges | grep -qE "(feat|fix|docs|test|refactor|perf|chore)[:(]"
}
