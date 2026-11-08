#!/bin/bash
# run_pabot.sh - 使用 Pabot 并行执行 Robot Framework 测试
#
# 用法:
#   bash scripts/run_pabot.sh [选项]
#
# 选项:
#   --processes N    并行进程数 (默认: 4)
#   --include TAG    只运行指定标签的用例
#   --grid URL       Selenium Grid 地址 (默认: http://localhost:4444/wd/hub)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 默认参数
PROCESSES=4
GRID_URL="http://localhost:4444/wd/hub"
INCLUDE_TAG=""
OUTPUT_DIR="$PROJECT_DIR/results"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --processes) PROCESSES="$2"; shift 2 ;;
        --include) INCLUDE_TAG="$2"; shift 2 ;;
        --grid) GRID_URL="$2"; shift 2 ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
done

echo "============================================"
echo "  Pabot 并行测试执行"
echo "============================================"
echo "  并行进程数: $PROCESSES"
echo "  Grid 地址:  $GRID_URL"
echo "  输出目录:   $OUTPUT_DIR"
echo "============================================"

# 清理旧结果
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 构建 Pabot 命令
PABOT_CMD="pabot --processes $PROCESSES"
PABOT_CMD="$PABOT_CMD --pabotlib"
PABOT_CMD="$PABOT_CMD --outputdir $OUTPUT_DIR"
PABOT_CMD="$PABOT_CMD --variable SELENIUM_GRID:$GRID_URL"

if [ -n "$INCLUDE_TAG" ]; then
    PABOT_CMD="$PABOT_CMD --include $INCLUDE_TAG"
fi

PABOT_CMD="$PABOT_CMD $PROJECT_DIR/tests"

echo ""
echo "执行命令: $PABOT_CMD"
echo ""

# 执行 Pabot
eval $PABOT_CMD
PABOT_EXIT=$?

echo ""
echo "============================================"
echo "  Pabot 执行完毕 (退出码: $PABOT_EXIT)"
echo "============================================"

# 使用 Rebot 合并报告
echo ""
echo "使用 Rebot 生成合并报告..."
rebot --outputdir "$OUTPUT_DIR/merged" \
    --name "合并测试报告" \
    --merge \
    "$OUTPUT_DIR/output.xml"

echo ""
echo "============================================"
echo "  报告生成完毕"
echo "  HTML 报告: $OUTPUT_DIR/merged/report.html"
echo "  日志文件:  $OUTPUT_DIR/merged/log.html"
echo "============================================"

exit $PABOT_EXIT
