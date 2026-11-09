#!/bin/bash
# WBS 快速查看工具

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     K8S Auto Testing Platform - WBS 进度追踪              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 统计完成情况
TOTAL=$(grep -c "\- \[.\]" docs/WBS.md)
DONE=$(grep -c "\- \[x\]" docs/WBS.md)
PENDING=$(grep -c "\- \[ \]" docs/WBS.md)
PERCENT=$(echo "scale=0; $DONE * 100 / $TOTAL" | bc)

echo "📊 总体进度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  总任务数: $TOTAL"
echo "  已完成: $DONE ✅"
echo "  待完成: $PENDING ⏳"
echo "  完成率: $PERCENT%"
echo ""

# 显示未完成的任务
echo "⏳ 下一步待办事项（Top 10）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep "\- \[ \]" docs/WBS.md | head -n 10 | sed 's/- \[ \]/  ⏳/'
echo ""

echo "💡 查看完整 WBS:"
echo "   cat docs/WBS.md"
echo "   code docs/WBS.md"
echo ""
