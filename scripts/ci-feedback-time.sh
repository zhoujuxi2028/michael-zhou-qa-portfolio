#!/usr/bin/env bash
# ci-feedback-time.sh — 统计某 workflow 成功 run 的端到端反馈时长（createdAt → updatedAt）
#
# 用法：
#   bash scripts/ci-feedback-time.sh <workflow.yml> <from> <to> [branch] [event]
#   例：bash scripts/ci-feedback-time.sh performance-ci.yml 2026-04-24T07:00 2026-04-25T06:30 main push
#
# 输出：n / median / p25 / p75 / min / max（秒）。时间为 UTC，区间左闭右开。
# 依赖：gh（已登录）、jq

set -euo pipefail

if [ "$#" -lt 3 ]; then
    sed -n '3,6p' "$0" >&2
    exit 2
fi

WORKFLOW="$1"
FROM="$2"
TO="$3"
BRANCH="${4:-}"
EVENT="${5:-}"

ARGS=(-w "$WORKFLOW" --status success --limit 1000
    --created "${FROM%%T*}..${TO%%T*}"
    --json "createdAt,updatedAt,headBranch,event")
[ -n "$BRANCH" ] && ARGS+=(-b "$BRANCH")
[ -n "$EVENT" ] && ARGS+=(-e "$EVENT")

gh run list "${ARGS[@]}" | jq --arg from "$FROM" --arg to "$TO" '
  [ .[]
    | select(.createdAt >= $from and .createdAt < $to)
    | ((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) ]
  | sort
  | if length == 0 then {n: 0}
    else
      def pct(p): .[((length - 1) * p | floor)];
      def med: if length % 2 == 1 then .[length / 2 | floor]
               else (.[length / 2 - 1] + .[length / 2]) / 2 end;
      {n: length, median: med, p25: pct(0.25), p75: pct(0.75), min: .[0], max: .[-1]}
    end'
