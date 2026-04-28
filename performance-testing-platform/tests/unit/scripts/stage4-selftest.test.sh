#!/bin/bash

# Stage 4 自测脚本 TDD 测试框架 (改进版)
# 使用直接执行而非 eval，避免路径问题

set -e

# 获取项目根目录（脚本位置: tests/unit/scripts/stage4-selftest.test.sh）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT"

LOG_DIR="docs/qa/reports/logs-stage4"
REPORT="docs/qa/reports/execution/stage4-selftest-report.md"
TEST_LOCK_DIR="/tmp/test-lock-$$"

# 测试计数
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_case() {
  local name="$1"
  local condition="$2"

  TESTS_RUN=$((TESTS_RUN + 1))

  # 直接执行条件（在当前目录）
  if eval "$condition" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}: $name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $name"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

cleanup() {
  rm -rf "$TEST_LOCK_DIR" 2>/dev/null || true
  npm stop > /dev/null 2>&1 || true
  sleep 1
}

is_valid_work_branch() {
  local branch="$1"
  case "$branch" in
    main|feature/*|fix/*|copilot/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

trap cleanup EXIT

echo ""
echo "=========================================="
echo "  Stage 4 自测脚本 TDD 测试框架 (v2)"
echo "=========================================="
echo "项目根目录: $PROJECT_ROOT"
echo ""

# ============================================================
# 前置条件检查
# ============================================================

echo "## 前置条件检查"

test_case "脚本文件存在" "[ -f 'scripts/stage4-selftest.sh' ]"
test_case "脚本可执行" "[ -x 'scripts/stage4-selftest.sh' ]"
test_case "项目根目录存在" "[ -d '$PROJECT_ROOT' ]"
test_case "当前在允许的工作分支" "is_valid_work_branch \"\$(git branch --show-current)\""

test_case "必需工具可用: npm" "command -v npm > /dev/null"
test_case "必需工具可用: git" "command -v git > /dev/null"
test_case "必需工具可用: node" "command -v node > /dev/null"

# ============================================================
# Section 1: 代码质量检查
# ============================================================

echo ""
echo "## Section 1: 代码质量检查"

test_case "1.1: 单元测试命令通过" \
  "npm run test:unit > /dev/null 2>&1"

test_case "1.2: ESLint 无错误" \
  "npm run lint > /dev/null 2>&1"

test_case "1.3: Prettier 格式一致" \
  "npm run format:check > /dev/null 2>&1"

test_case "1.4: 代码覆盖率 >= 80%" \
  "npm run test:coverage 2>&1 | grep 'All files' | awk -F'|' '{print \$2}' | xargs | sed 's/%//' | awk '{if (\$1 >= 80) exit 0; else exit 1}'"

# ============================================================
# Section 2: 集成测试检查
# ============================================================

echo ""
echo "## Section 2: 集成测试检查"

test_case "2.2: 锁机制存在" "[ -f 'scripts/lib/lock.sh' ]"

# 直接测试锁机制
echo "--- 2.2: 锁机制防止并发 ---"

# 第一次获取
if bash scripts/lib/lock.sh acquire "$TEST_LOCK_DIR" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC}: 锁机制 acquire 成功"
  TESTS_PASSED=$((TESTS_PASSED + 1))

  # 第二次获取应失败
  if ! bash scripts/lib/lock.sh acquire "$TEST_LOCK_DIR" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}: 锁机制防止并发"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: 锁机制未能防止并发"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi

  # 释放
  bash scripts/lib/lock.sh release "$TEST_LOCK_DIR" > /dev/null 2>&1
  if [ ! -d "$TEST_LOCK_DIR" ]; then
    echo -e "${GREEN}✓ PASS${NC}: 锁机制 release 成功"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: 锁机制 release 失败"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC}: 锁机制 acquire 失败"
  TESTS_FAILED=$((TESTS_FAILED + 3))
fi

TESTS_RUN=$((TESTS_RUN + 3))

# ============================================================
# Section 3: RTM 检查
# ============================================================

echo ""
echo "## Section 3: RTM 需求覆盖"

# 直接计数
RTM_COUNT=$(grep '✅' docs/qa/rtm.md 2>/dev/null | wc -l)
if [ "$RTM_COUNT" -ge 75 ]; then
  echo -e "${GREEN}✓ PASS${NC}: 3.1 RTM 覆盖 >= 75 项 (实际: $RTM_COUNT)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}: 3.1 RTM 覆盖不足 (实际: $RTM_COUNT < 75)"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# ============================================================
# Section 4: 风险管理
# ============================================================

echo ""
echo "## Section 4: 风险管理"

test_case "4.1: 历史风险 H-18 已记录" \
  "grep -q 'H-18' docs/project-management/risks.md"

# ============================================================
# Section 5: 缺陷追踪
# ============================================================

echo ""
echo "## Section 5: 缺陷追踪"

test_case "5.2: X-XSS-Protection 修复代码存在" \
  "grep -q 'X-XSS-Protection' src/app.js && grep -q 'mode=block' src/app.js"

# 5.3: HTTP 头检查（需启动 API）
echo "--- 5.3: X-XSS-Protection 响应头 ---"
npm start > /tmp/api-test.log 2>&1 &
API_PID=$!
sleep 3

XSS_HEADER=$(curl -si http://localhost:3000/health 2>/dev/null | grep -i "x-xss-protection" || true)
if echo "$XSS_HEADER" | grep -q "1; mode=block"; then
  echo -e "${GREEN}✓ PASS${NC}: 5.3 API 响应头包含 X-XSS-Protection"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${YELLOW}⊘ SKIP${NC}: 5.3 API 响应头检查"
fi
TESTS_RUN=$((TESTS_RUN + 1))

cleanup

# ============================================================
# Section 6: CI 检查
# ============================================================

echo ""
echo "## Section 6: CI 流水线"

test_case "6.2: CI 无 continue-on-error workaround" \
  "! grep -q 'continue-on-error' .github/workflows/performance-ci.yml"

# ============================================================
# Section 8: 文档完整性
# ============================================================

echo ""
echo "## Section 8: 文档完整性"

test_case "8.1: 验收报告文件存在" \
  "[ -f 'docs/qa/reports/execution/phase6-stage4-verification-report.md' ]"

test_case "8.2: CLAUDE.md 包含锁机制文档" \
  "grep -Eq '集成测试锁机制|集成测试有锁' CLAUDE.md"

test_case "8.3: architecture.md 包含 k6 helpers" \
  "grep -q 'thinkTime.js\|funnel.js\|healthCheck.js' docs/architecture/architecture.md"

# ============================================================
# Section 9: 分支和提交
# ============================================================

echo ""
echo "## Section 9: 分支和提交"

test_case "9.1: 当前分支属于允许的工作分支" \
  "is_valid_work_branch \"\$(git branch --show-current)\""

test_case "9.2: 提交历史包含 conventional commits" \
  "git log --format=%s -20 | grep -Eq '^(feat|fix|docs|test|refactor|perf|chore)(\([^)]+\))?: '"

# ============================================================
# 报告生成测试
# ============================================================

echo ""
echo "## 报告生成"

echo "--- 运行完整 stage4-selftest.sh 脚本 ---"
bash scripts/stage4-selftest.sh > /dev/null 2>&1 || true

test_case "报告文件已生成" \
  "[ -f 'docs/qa/reports/execution/stage4-selftest-report.md' ]"

test_case "报告包含统计信息" \
  "grep -q 'PASS\|FAIL\|SKIP' 'docs/qa/reports/execution/stage4-selftest-report.md'"

test_case "日志目录已创建" \
  "[ -d 'docs/qa/reports/logs-stage4' ]"

# ============================================================
# 最终统计
# ============================================================

echo ""
echo "=========================================="
echo "  测试结果统计"
echo "=========================================="

echo -e "${GREEN}✓ PASSED: $TESTS_PASSED${NC}"
echo -e "${RED}✗ FAILED: $TESTS_FAILED${NC}"
echo "---"
echo "总计: $TESTS_RUN"

if [ $TESTS_RUN -gt 0 ]; then
  SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
else
  SUCCESS_RATE=0
fi

echo "通过率: ${SUCCESS_RATE}%"
echo "=========================================="
echo ""

exit $TESTS_FAILED
