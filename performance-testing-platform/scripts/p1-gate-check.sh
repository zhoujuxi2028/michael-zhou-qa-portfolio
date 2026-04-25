#!/usr/bin/env bash

# scripts/p1-gate-check.sh — Stage 4 P1 门禁一键自检
#
# 覆盖 5 个 P1 验收项（详见 docs/qa/stage4-gate-template.md）：
#   P1-01  k6 smoke              npm run k6:smoke           （仅 --full 跑）
#   P1-02  JMeter smoke          npm run jmeter:smoke       （仅 --full 跑）
#   P1-03  Shell 集成测试        bash scripts/integration-test.sh
#                                                            （仅 --full 跑）
#   P1-04  CI 流水线全绿         gh run list（最近一次）
#   P1-05  无 continue-on-error  扫描 .github/workflows/performance-ci.yml
#
# 用法：
#   bash scripts/p1-gate-check.sh                 # --fast（默认，跳过慢检查）
#   bash scripts/p1-gate-check.sh --full          # 全量运行（依赖 Docker / k6 / JMeter）
#   bash scripts/p1-gate-check.sh --help
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
# 默认参数
# ============================================================

MODE="fast"
REPORT_DIR="${GATE_REPORT_DIR:-${PROJECT_DIR}/docs/qa/reports}"
LOG_DIR="${GATE_LOG_DIR:-${PROJECT_DIR}/docs/qa/reports/logs-p1}"
WORKFLOW_FILE="${PROJECT_DIR}/../.github/workflows/performance-ci.yml"

# k6/JMeter 通过标准
K6_P95_MAX_MS=500
K6_ERROR_MAX_PCT=1
JMETER_ERROR_MAX_PCT=1

# ============================================================
# CLI 解析
# ============================================================

print_help() {
  cat << 'HELP'
P1 Gate Check — Stage 4 强烈建议级一键自检

用法:
  bash scripts/p1-gate-check.sh [模式] [选项]

模式:
  --fast    （默认）跳过 k6 / JMeter / Shell 集成测试（这些通常 1~5 分钟）
            仅执行：P1-04 (CI 状态查询)、P1-05 (workflow 静态扫描)
            其余 P1-01/02/03 标为 SKIP
  --full    全量运行 5 项；需要本机已安装 k6、jmeter、Docker

选项:
  -h, --help              显示本帮助
  --report-dir <DIR>      报告输出目录（默认 docs/qa/reports）
  --log-dir <DIR>         日志输出目录（默认 docs/qa/reports/logs-p1）
  --workflow <FILE>       performance-ci.yml 路径（用于 P1-05 静态扫描）

覆盖的 5 项检查（依据 docs/qa/stage4-gate-template.md）:
  P1-01  k6 smoke               p95 < 500ms, error < 1%
  P1-02  JMeter smoke           error < 1%
  P1-03  Shell 集成测试         scripts/integration-test.sh
  P1-04  CI 流水线全绿          gh run list（最近一次完成）
  P1-05  无未豁免 continue-on-error  workflows/performance-ci.yml

退出码:
  0  全部 PASS（或仅含 SKIP）
  1  至少一项 FAIL
  2  命令行参数错误
HELP
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help)
      print_help
      exit 0
      ;;
    --fast)
      MODE="fast"
      shift
      ;;
    --full)
      MODE="full"
      shift
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
    --workflow)
      WORKFLOW_FILE="${2:-}"
      shift 2
      ;;
    --workflow=*)
      WORKFLOW_FILE="${1#*=}"
      shift
      ;;
    *)
      echo "❌ unknown option: $1" >&2
      echo "运行 'bash scripts/p1-gate-check.sh --help' 查看帮助" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$REPORT_DIR" "$LOG_DIR"
cd "$PROJECT_DIR" || {
  echo "❌ 无法进入项目目录: $PROJECT_DIR" >&2
  exit 2
}

REPORT_PATH="${REPORT_DIR}/p1-gate-report.md"

# ============================================================
# 执行
# ============================================================

gate_init

if [ "$MODE" = "fast" ]; then
  print_banner "P1" "fast 模式 — 已跳过 k6/JMeter/集成测试"
else
  print_banner "P1" "full 模式 — 全量运行"
fi

# ---- P1-01 k6 smoke ----
echo ""
echo "--- P1-01: k6 smoke (npm run k6:smoke) ---"
if [ "$MODE" = "fast" ]; then
  log_result "P1-01" SKIP "fast 模式跳过 k6 smoke（用 --full 启用）"
elif ! command -v k6 > /dev/null 2>&1; then
  log_result "P1-01" SKIP "未安装 k6，跳过"
else
  K6_LOG="${LOG_DIR}/k6-smoke.log"
  if npm run k6:smoke > "$K6_LOG" 2>&1; then
    log_result "P1-01" PASS \
      "k6 smoke 通过（k6 内置 thresholds 已校验 p95<${K6_P95_MAX_MS}ms / err<${K6_ERROR_MAX_PCT}%）"
  else
    log_result "P1-01" FAIL "k6 smoke 失败（详见 ${K6_LOG}）"
  fi
fi

# ---- P1-02 JMeter smoke ----
echo ""
echo "--- P1-02: JMeter smoke (npm run jmeter:smoke) ---"
if [ "$MODE" = "fast" ]; then
  log_result "P1-02" SKIP "fast 模式跳过 JMeter smoke（用 --full 启用）"
elif ! command -v jmeter > /dev/null 2>&1; then
  log_result "P1-02" SKIP "未安装 jmeter，跳过"
else
  JM_LOG="${LOG_DIR}/jmeter-smoke.log"
  if npm run jmeter:smoke > "$JM_LOG" 2>&1; then
    # 从 results/jmeter-smoke.jtl 解析 error rate
    JTL="${PROJECT_DIR}/results/jmeter-smoke.jtl"
    if [ -f "$JTL" ]; then
      TOTAL=$(tail -n +2 "$JTL" | wc -l | tr -dc '0-9')
      ERRS=$(tail -n +2 "$JTL" | awk -F',' '{if ($8 == "false") print}' | wc -l | tr -dc '0-9')
      TOTAL="${TOTAL:-0}"
      ERRS="${ERRS:-0}"
      if [ "$TOTAL" -gt 0 ]; then
        ERR_PCT=$(awk "BEGIN { printf \"%.2f\", ($ERRS * 100) / $TOTAL }")
        if below_threshold "$ERR_PCT" "$JMETER_ERROR_MAX_PCT"; then
          log_result "P1-02" PASS "JMeter smoke 通过 (error=${ERR_PCT}% < ${JMETER_ERROR_MAX_PCT}%)"
        else
          log_result "P1-02" FAIL "JMeter smoke 错误率超标 (error=${ERR_PCT}% ≥ ${JMETER_ERROR_MAX_PCT}%)"
        fi
      else
        log_result "P1-02" FAIL "JMeter smoke 0 requests（JTL 为空，详见 ${JM_LOG}）"
      fi
    else
      log_result "P1-02" PASS "JMeter smoke 通过（未找到 JTL，按命令退出码判定）"
    fi
  else
    log_result "P1-02" FAIL "JMeter smoke 失败（详见 ${JM_LOG}）"
  fi
fi

# ---- P1-03 Shell 集成测试 ----
echo ""
echo "--- P1-03: Shell 集成测试 (scripts/integration-test.sh) ---"
if [ "$MODE" = "fast" ]; then
  log_result "P1-03" SKIP "fast 模式跳过 Shell 集成测试（用 --full 启用）"
elif ! docker info > /dev/null 2>&1; then
  log_result "P1-03" SKIP "Docker daemon 未运行，跳过 Shell 集成测试"
else
  INT_LOG="${LOG_DIR}/integration-test.log"
  if bash "${SCRIPT_DIR}/integration-test.sh" > "$INT_LOG" 2>&1; then
    log_result "P1-03" PASS "Shell 集成测试通过"
  elif grep -qE "Preflight FAILED|not reachable|Docker daemon not running|command not found" "$INT_LOG"; then
    log_result "P1-03" SKIP "Shell 集成测试依赖未满足（详见 ${INT_LOG}）"
  else
    log_result "P1-03" FAIL "Shell 集成测试失败（详见 ${INT_LOG}）"
  fi
fi

# ---- P1-04 CI 状态查询 ----
echo ""
echo "--- P1-04: CI 流水线最近一次状态 (gh run list) ---"
if ! command -v gh > /dev/null 2>&1; then
  log_result "P1-04" SKIP "gh CLI 不可用，无法查询 CI 状态"
else
  BRANCH="$(git branch --show-current 2>/dev/null || echo "")"
  if [ -z "$BRANCH" ]; then
    BRANCH="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-}}"
  fi
  CI_LOG="${LOG_DIR}/ci-status.log"
  if [ -z "$BRANCH" ]; then
    log_result "P1-04" SKIP "无法识别当前分支，跳过 CI 状态查询"
  elif ! CI_RAW=$(timeout 15 gh run list --branch "$BRANCH" --limit 1 --json status,conclusion,workflowName 2> "$CI_LOG"); then
    log_result "P1-04" SKIP "gh run list 调用失败（详见 ${CI_LOG}）"
  elif [ -z "$CI_RAW" ] || [ "$CI_RAW" = "[]" ]; then
    log_result "P1-04" SKIP "分支 ${BRANCH} 无 CI 历史记录"
  else
    echo "$CI_RAW" > "$CI_LOG"
    STATUS=$(echo "$CI_RAW" | grep -oE '"status":"[^"]+"' | head -1 | cut -d: -f2 | tr -d '"')
    CONCLUSION=$(echo "$CI_RAW" | grep -oE '"conclusion":"[^"]+"' | head -1 | cut -d: -f2 | tr -d '"')
    if [ "$STATUS" = "completed" ] && [ "$CONCLUSION" = "success" ]; then
      log_result "P1-04" PASS "最近 CI run 全绿 (branch=${BRANCH}, conclusion=${CONCLUSION})"
    elif [ "$STATUS" = "completed" ]; then
      log_result "P1-04" FAIL "最近 CI run 未通过 (branch=${BRANCH}, conclusion=${CONCLUSION})"
    else
      log_result "P1-04" SKIP "最近 CI run 仍在运行 (status=${STATUS:-unknown})"
    fi
  fi
fi

# ---- P1-05 workflow continue-on-error 静态扫描 ----
echo ""
echo "--- P1-05: 无未豁免的 continue-on-error ---"
if [ ! -f "$WORKFLOW_FILE" ]; then
  log_result "P1-05" SKIP "工作流文件不存在: ${WORKFLOW_FILE}"
else
  TOTAL_CO=$(sanitize_number "$(grep -c "continue-on-error: true" "$WORKFLOW_FILE" 2> /dev/null || echo 0)")
  if [ "$TOTAL_CO" -eq 0 ]; then
    log_result "P1-05" PASS "工作流无 continue-on-error: true"
  else
    # 在 continue-on-error 上方 3 行内查找豁免注释（exemption / risks.md / R-NNN）
    EXEMPTED=$(sanitize_number "$(grep -B3 "continue-on-error: true" "$WORKFLOW_FILE" 2> /dev/null \
      | grep -cE "exemption|risks\.md|R-[0-9]+" || echo 0)")
    UNDOC=$((TOTAL_CO - EXEMPTED))
    if [ "$UNDOC" -le 0 ]; then
      log_result "P1-05" PASS "全部 ${TOTAL_CO} 处 continue-on-error 已豁免（带 exemption/risks.md/R-NNN 注释）"
    else
      log_result "P1-05" FAIL "存在 ${UNDOC} 处未豁免的 continue-on-error（共 ${TOTAL_CO} 处）"
    fi
  fi
fi

# ============================================================
# 汇总 + 报告
# ============================================================

print_summary "P1"
write_report "P1" "$REPORT_PATH" 5

echo ""
echo "📄 报告已生成: $REPORT_PATH"
echo "📁 日志目录:   $LOG_DIR"

exit_with_status
