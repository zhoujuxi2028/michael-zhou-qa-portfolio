#!/bin/bash
# run_rebot_merge.sh - 使用 Rebot 合并多次测试运行的结果
#
# 当 Pabot 分进程执行后，每个进程会生成独立的 output.xml。
# 本脚本使用 Rebot 将多个结果合并为统一报告。
#
# 用法:
#   bash scripts/run_rebot_merge.sh [结果目录]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RESULTS_DIR="${1:-$PROJECT_DIR/results}"
MERGED_DIR="$RESULTS_DIR/merged"

echo "============================================"
echo "  Rebot 报告合并"
echo "============================================"
echo "  输入目录: $RESULTS_DIR"
echo "  输出目录: $MERGED_DIR"
echo "============================================"

mkdir -p "$MERGED_DIR"

# 查找所有 output.xml
OUTPUT_FILES=$(find "$RESULTS_DIR" -name "output.xml" -not -path "*/merged/*" | sort)

if [ -z "$OUTPUT_FILES" ]; then
    echo "错误: 未找到 output.xml 文件"
    exit 1
fi

echo ""
echo "找到以下输出文件:"
echo "$OUTPUT_FILES"
echo ""

# 使用 Rebot 合并
rebot --outputdir "$MERGED_DIR" \
    --name "Pabot 并行测试 - 合并报告" \
    --reporttitle "Robot Framework 并行执行报告" \
    --logtitle "Robot Framework 并行执行日志" \
    --merge \
    $OUTPUT_FILES

echo ""
echo "============================================"
echo "  合并完成"
echo "  HTML 报告: $MERGED_DIR/report.html"
echo "  日志文件:  $MERGED_DIR/log.html"
echo "  XML 输出:  $MERGED_DIR/output.xml"
echo "============================================"
