#!/usr/bin/env bash
# push-metrics.sh — 推送 CI/CD 流水线指标到 Prometheus Pushgateway
#
# 用法：
#   bash scripts/push-metrics.sh \
#     --job      <pipeline|quality-gate|smoke-test|deploy> \
#     --status   <success|failure|skipped> \
#     --duration <seconds> \
#     --tests-passed <N> \
#     --tests-failed <N>
#
# 环境变量：
#   PUSHGATEWAY_URL   Pushgateway 地址（默认：http://localhost:9091）
#   CI_PIPELINE_RUN   流水线运行 ID（默认：$GITHUB_RUN_ID 或 local）
#   CI_ENVIRONMENT    部署环境（默认：ci）

set -euo pipefail

PUSHGATEWAY_URL="${PUSHGATEWAY_URL:-http://localhost:9091}"
CI_PIPELINE_RUN="${CI_PIPELINE_RUN:-${GITHUB_RUN_ID:-local}}"
CI_ENVIRONMENT="${CI_ENVIRONMENT:-ci}"
BRANCH="${GITHUB_REF_NAME:-unknown}"
COMMIT="${GITHUB_SHA:-unknown}"

# ── 参数解析
JOB_NAME=""
STATUS="unknown"
DURATION_SECONDS=0
TESTS_PASSED=0
TESTS_FAILED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --job)      JOB_NAME="$2";         shift 2 ;;
    --status)   STATUS="$2";           shift 2 ;;
    --duration) DURATION_SECONDS="$2"; shift 2 ;;
    --tests-passed) TESTS_PASSED="$2"; shift 2 ;;
    --tests-failed) TESTS_FAILED="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [ -z "$JOB_NAME" ]; then
  echo "Error: --job is required"
  exit 1
fi

STATUS_VALUE=0
[ "$STATUS" = "success" ] && STATUS_VALUE=1

TIMESTAMP=$(date +%s)

# ── 构建 Prometheus text format
METRICS=$(cat <<EOF
# HELP cicd_pipeline_status 流水线 job 状态（1=成功，0=失败）
# TYPE cicd_pipeline_status gauge
cicd_pipeline_status{job="$JOB_NAME",environment="$CI_ENVIRONMENT",branch="$BRANCH"} $STATUS_VALUE $TIMESTAMP

# HELP cicd_pipeline_duration_seconds 流水线 job 执行时长（秒）
# TYPE cicd_pipeline_duration_seconds gauge
cicd_pipeline_duration_seconds{job="$JOB_NAME",environment="$CI_ENVIRONMENT",branch="$BRANCH"} $DURATION_SECONDS $TIMESTAMP

# HELP cicd_test_total 测试用例总数
# TYPE cicd_test_total gauge
cicd_test_total{job="$JOB_NAME",result="passed",environment="$CI_ENVIRONMENT"} $TESTS_PASSED $TIMESTAMP
cicd_test_total{job="$JOB_NAME",result="failed",environment="$CI_ENVIRONMENT"} $TESTS_FAILED $TIMESTAMP

# HELP cicd_pipeline_run_timestamp 最近一次流水线运行时间戳
# TYPE cicd_pipeline_run_timestamp gauge
cicd_pipeline_run_timestamp{job="$JOB_NAME",run_id="$CI_PIPELINE_RUN",status="$STATUS"} $TIMESTAMP $TIMESTAMP
EOF
)

echo "=== Metrics to push ==="
echo "$METRICS"
echo "======================="

# ── 推送到 Pushgateway（不可达时记录日志但不阻断 CI）
if curl --silent --max-time 5 "$PUSHGATEWAY_URL/-/ready" &>/dev/null; then
  echo "$METRICS" | curl --silent --data-binary @- \
    "$PUSHGATEWAY_URL/metrics/job/cicd_demo/instance/${JOB_NAME}_${CI_PIPELINE_RUN}"
  echo "✅ Metrics pushed to Pushgateway: $PUSHGATEWAY_URL"
else
  echo "⚠️  Pushgateway not reachable at $PUSHGATEWAY_URL — metrics logged above (CI continues)"
fi
