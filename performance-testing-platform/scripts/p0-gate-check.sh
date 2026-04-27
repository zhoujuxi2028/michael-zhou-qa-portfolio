#!/usr/bin/env bash

# scripts/p0-gate-check.sh — Stage 4 P0 门禁一键自检
#
# 覆盖 5 个 P0 验收项（详见 docs/qa/stage4-gate-template.md）：
#   P0-01  单元测试            npm run test:unit
#   P0-02  Lint                npm run lint
#   P0-03  格式检查            npm run format:check
#   P0-04  覆盖率              npm run test:coverage
#                              （stmt ≥ 80, branch ≥ 70, func ≥ 80, line ≥ 80）
#   P0-05  JMeter dry-run      npm run jmeter:dryrun
#
# 用法：
#   bash scripts/p0-gate-check.sh                # 跑全部 5 项
#   bash scripts/p0-gate-check.sh --help         # 帮助
#
# 退出码：
#   0  — 无 FAIL
#   1  — 至少一项 FAIL
#   2  — 命令行参数错误

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/gate-check-common.sh
source "$SCRIPT_DIR/lib/gate-check-common.sh"

# ============================================================
# 默认参数（可被环境变量 / CLI 覆盖，便于 Bats 测试）
# ============================================================

REPORT_DIR="${GATE_REPORT_DIR:-${PROJECT_DIR}/docs/qa/reports}"
LOG_DIR="${GATE_LOG_DIR:-${PROJECT_DIR}/docs/qa/reports/logs-p0}"

# 覆盖率阈值（与 stage4-gate-template.md 一致）
COV_STMT_MIN=80
COV_BRANCH_MIN=70
COV_FUNC_MIN=80
COV_LINE_MIN=80

# ============================================================
# CLI 解析
# ============================================================

print_help() {
  cat << 'HELP'
P0 Gate Check — Stage 4 阻塞级一键自检

用法:
  bash scripts/p0-gate-check.sh [选项]

选项:
  -h, --help              显示本帮助
  --report-dir <DIR>      报告输出目录（默认 docs/qa/reports）
  --log-dir <DIR>         日志输出目录（默认 docs/qa/reports/logs-p0）

覆盖的 5 项检查（依据 docs/qa/stage4-gate-template.md）:
  P0-01  单元测试         npm run test:unit
  P0-02  Lint             npm run lint            （0 errors）
  P0-03  格式检查         npm run format:check    （0 warnings）
  P0-04  覆盖率           npm run test:coverage
                          stmt ≥ 80, branch ≥ 70, func ≥ 80, line ≥ 80
  P0-05  JMeter dry-run   npm run jmeter:dryrun   （0 errors）

退出码:
  0  全部 PASS（或仅含 SKIP）
  1  至少一项 FAIL
  2  命令行参数错误

报告:
  Markdown:  <report-dir>/p0-gate-report.md
  日志:      <log-dir>/{unit-tests,lint,format,coverage,jmeter-dryrun}.log
HELP
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help)
      print_help
      exit 0
      ;;
    --report-dir)
      REPORT_DIR="${2:-}"
      shift 2
      ;;
    --report-dir=*)
      REPORT_DIR="${1#*=}"
      shift
      ;;
    --log-dir)
      LOG_DIR="${2:-}"
      shift 2
      ;;
    --log-dir=*)
      LOG_DIR="${1#*=}"
      shift
      ;;
    *)
      echo "❌ unknown option: $1" >&2
      echo "运行 'bash scripts/p0-gate-check.sh --help' 查看帮助" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$REPORT_DIR" "$LOG_DIR"
cd "$PROJECT_DIR" || {
  echo "❌ 无法进入项目目录: $PROJECT_DIR" >&2
  exit 2
}

REPORT_PATH="${REPORT_DIR}/p0-gate-report.md"

# ============================================================
# 执行
# ============================================================

gate_init
print_banner "P0"

# ---- P0-01 单元测试 ----
echo ""
echo "--- P0-01: 单元测试 (npm run test:unit) ---"
UNIT_LOG="${LOG_DIR}/unit-tests.log"
if npm run test:unit > "$UNIT_LOG" 2>&1; then
  PASSED_COUNT=$(grep -oE "[0-9]+ passed" "$UNIT_LOG" | tail -1 | grep -oE "[0-9]+" || echo "?")
  log_result "P0-01" PASS "单元测试通过 (${PASSED_COUNT} passed)"
else
  log_result "P0-01" FAIL "单元测试存在失败（详见 ${UNIT_LOG}）"
fi

# ---- P0-02 Lint ----
echo ""
echo "--- P0-02: Lint (npm run lint) ---"
LINT_LOG="${LOG_DIR}/lint.log"
if npm run lint > "$LINT_LOG" 2>&1; then
  log_result "P0-02" PASS "ESLint 0 errors"
else
  log_result "P0-02" FAIL "ESLint 报错（详见 ${LINT_LOG}）"
fi

# ---- P0-03 格式检查 ----
echo ""
echo "--- P0-03: 格式检查 (npm run format:check) ---"
FORMAT_LOG="${LOG_DIR}/format.log"
if npm run format:check > "$FORMAT_LOG" 2>&1; then
  log_result "P0-03" PASS "Prettier 0 warnings"
else
  log_result "P0-03" FAIL "Prettier 格式不一致（详见 ${FORMAT_LOG}）"
fi

# ---- P0-04 覆盖率 ----
echo ""
echo "--- P0-04: 覆盖率 (npm run test:coverage) ---"
COV_LOG="${LOG_DIR}/coverage.log"
COV_SUMMARY="${COV_SUMMARY_PATH:-${PROJECT_DIR}/coverage/coverage-summary.json}"
# 强制关闭 Jest 颜色输出；判定以 coverage-summary.json 为准，避免控制台表格格式影响门禁。
rm -f "$COV_SUMMARY"
if ! NO_COLOR=1 FORCE_COLOR=0 npm run test:coverage > "$COV_LOG" 2>&1; then
  log_result "P0-04" FAIL "覆盖率命令执行失败（详见 ${COV_LOG}）"
else
  if [ ! -f "$COV_SUMMARY" ]; then
    log_result "P0-04" FAIL "coverage summary 未生成: ${COV_SUMMARY}（详见 ${COV_LOG}）"
  elif ! COVERAGE_VALUES="$(extract_coverage_summary "$COV_SUMMARY")"; then
    log_result "P0-04" FAIL "未能解析 coverage summary: ${COV_SUMMARY}（详见 ${COV_LOG}）"
  else
    read -r STMT BRANCH FUNCS LINE_COV <<< "$COVERAGE_VALUES"
    DETAIL="stmt=${STMT}% branch=${BRANCH}% func=${FUNCS}% line=${LINE_COV}%"
    if meets_threshold "$STMT" "$COV_STMT_MIN" \
      && meets_threshold "$BRANCH" "$COV_BRANCH_MIN" \
      && meets_threshold "$FUNCS" "$COV_FUNC_MIN" \
      && meets_threshold "$LINE_COV" "$COV_LINE_MIN"; then
      log_result "P0-04" PASS "覆盖率达标 (${DETAIL})"
    else
      log_result "P0-04" FAIL \
        "覆盖率不达标 (${DETAIL}; 阈值 stmt≥${COV_STMT_MIN}, branch≥${COV_BRANCH_MIN}, func≥${COV_FUNC_MIN}, line≥${COV_LINE_MIN})"
    fi
  fi
fi

# ---- P0-05 JMeter dry-run ----
echo ""
echo "--- P0-05: JMeter dry-run (npm run jmeter:dryrun) ---"
JM_LOG="${LOG_DIR}/jmeter-dryrun.log"
if ! command -v jmeter > /dev/null 2>&1; then
  log_result "P0-05" SKIP "未安装 jmeter，跳过 dry-run（CI 已覆盖）"
elif npm run jmeter:dryrun > "$JM_LOG" 2>&1; then
  TOTAL=$(grep -oE "[0-9]+/[0-9]+ requests successful" "$JM_LOG" | tail -1 || echo "?")
  log_result "P0-05" PASS "JMeter dry-run 通过 (${TOTAL})"
else
  log_result "P0-05" FAIL "JMeter dry-run 存在错误（详见 ${JM_LOG}）"
fi

# ============================================================
# 汇总 + 报告
# ============================================================

print_summary "P0"
write_report "P0" "$REPORT_PATH" 5

echo ""
echo "📄 报告已生成: $REPORT_PATH"
echo "📁 日志目录:   $LOG_DIR"

exit_with_status
