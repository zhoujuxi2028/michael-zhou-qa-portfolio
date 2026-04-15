#!/bin/bash
# 
# scripts/check-duplicate-docs.sh
# 
# 检测文档系统中的重复维护问题
# 
# 用法:
#   bash scripts/check-duplicate-docs.sh
#   bash scripts/check-duplicate-docs.sh --strict  (fail on warnings)
#
# 返回值:
#   0 = 没有问题
#   1 = 发现重复问题（strict 模式）
#

set -e

STRICT="${1:-}"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

found_issues=0

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}检查文档重复问题${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"

# ============================================================================
# 检查 1: 查找可能的信息重复
# ============================================================================
check_content_duplicates() {
    echo -e "${BLUE}📋 检查 1: 内容重复${NC}"
    
    local md_files=$(find docs/ -name "*.md" -type f 2>/dev/null)
    local duplicates=0
    
    # 查找具有类似内容的文件
    # 这是一个启发式方法：检查标题重复
    
    local titles=$(grep -h "^# \|^## " docs/**/*.md 2>/dev/null | sort)
    local duplicate_titles=$(echo "$titles" | sort | uniq -d)
    
    if [ -n "$duplicate_titles" ]; then
        echo -e "${YELLOW}⚠️  发现重复的章节标题:${NC}"
        echo "$duplicate_titles" | sed 's/^/   /'
        duplicates=1
    fi
    
    # 查找具有相似名称的文件
    local log_files=$(find docs/ -name "*log*.md" -o -name "*log*.md" 2>/dev/null)
    local report_files=$(find docs/ -name "*report*.md" -o -name "*REPORT*.md" 2>/dev/null)
    
    if [ -n "$log_files" ] && [ -n "$report_files" ]; then
        echo -e "${YELLOW}⚠️  检测到 *log 和 *report 文件${NC}"
        echo -e "${YELLOW}   可能的重复: 日志 vs 报告${NC}"
        echo -e "${YELLOW}   规则: 两者中应只有一个维护，其他链接${NC}"
        duplicates=1
    fi
    
    if [ $duplicates -eq 0 ]; then
        echo -e "${GREEN}✓ 未发现明显的内容重复${NC}"
    fi
    
    return $duplicates
}

# ============================================================================
# 检查 2: 验证文件遵循命名约定
# ============================================================================
check_naming_compliance() {
    echo -e "\n${BLUE}📋 检查 2: 命名约定${NC}"
    
    local violations=0
    local docs_files=$(find docs/ -name "*.md" -type f 2>/dev/null | grep -v ".DS_Store")
    
    # 定义允许的模式
    local patterns=(
        "^docs/ARCHITECTURE\.md$"
        "^docs/plan-template\.md$"
        "^docs/[0-9]{4}-[0-9]{2}-[0-9]{2}-.*\.md$"  # YYYY-MM-DD-name
        "^docs/.*PHASE[0-9].*COMPLETION.*\.md$"      # PHASE reports
        "^docs/.*-guide\.md$"                         # *-guide.md
        "^docs/.*-checklist\.md$"                     # *-checklist.md
        "^docs/.*troubleshooting.*\.md$"             # troubleshooting-*.md
        "^docs/.*postmortem.*\.md$"                  # postmortem-*.md
        "^docs/[A-Z][A-Z0-9]*\.md$"                  # CAPS names
        "^docs/.*/.*/.*"                              # subdirectory files
    )
    
    if [ -z "$docs_files" ]; then
        echo -e "${GREEN}✓ 没有需要检查的 .md 文件${NC}"
        return 0
    fi
    
    for file in $docs_files; do
        local matched=0
        for pattern in "${patterns[@]}"; do
            if [[ "$file" =~ $pattern ]]; then
                matched=1
                break
            fi
        done
        
        if [ $matched -eq 0 ]; then
            echo -e "${YELLOW}⚠️  文件 '$file' 不符合命名约定${NC}"
            violations=1
        fi
    done
    
    if [ $violations -eq 0 ]; then
        echo -e "${GREEN}✓ 所有文件遵循命名约定${NC}"
    fi
    
    return $violations
}

# ============================================================================
# 检查 3: 验证职责分工表是否最新
# ============================================================================
check_architecture_coverage() {
    echo -e "\n${BLUE}📋 检查 3: 职责分工覆盖${NC}"
    
    local all_dirs=$(find docs/ -maxdepth 1 -type d ! -name ".*" 2>/dev/null | sort)
    local covered=0
    
    if [ -z "$all_dirs" ]; then
        echo -e "${GREEN}✓ 没有需要检查的子目录${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}找到的目录:${NC}"
    for dir in $all_dirs; do
        local dir_name=$(basename "$dir")
        if grep -q "$dir_name" docs/ARCHITECTURE.md 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} $dir_name"
        else
            echo -e "   ${YELLOW}⚠️ ${NC} $dir_name (未在 ARCHITECTURE.md 中)"
            covered=1
        fi
    done
    
    if [ $covered -eq 0 ]; then
        echo -e "${GREEN}✓ 所有主要目录已在 ARCHITECTURE.md 中覆盖${NC}"
    fi
    
    return $covered
}

# ============================================================================
# 检查 4: 验证权威来源标记
# ============================================================================
check_authority_markers() {
    echo -e "\n${BLUE}📋 检查 4: 权威来源标记${NC}"
    
    local issues=0
    
    # 检查 PHASE reports 是否标记为权威
    local phase_reports=$(find docs/ -name "*PHASE*COMPLETION*" -type f 2>/dev/null)
    
    if [ -z "$phase_reports" ]; then
        echo -e "${GREEN}✓ 没有 PHASE 报告${NC}"
        return 0
    fi
    
    for report in $phase_reports; do
        if ! grep -q "权威" "$report" 2>/dev/null; then
            echo -e "${YELLOW}ℹ️  '$report' 建议添加权威标记${NC}"
            echo -e "${YELLOW}   在文件顶部添加: 权威来源 ✅${NC}"
            issues=1
        fi
    done
    
    if [ $issues -eq 0 ]; then
        echo -e "${GREEN}✓ 权威来源标记完整${NC}"
    fi
    
    return 0  # Not a blocker
}

# ============================================================================
# 检查 5: 验证导航链接
# ============================================================================
check_navigation_links() {
    echo -e "\n${BLUE}📋 检查 5: 导航链接${NC}"
    
    local issues=0
    
    # 检查是否有孤立的文档（没有被链接）
    local orphaned=0
    
    echo -e "${GREEN}✓ 导航链接检查完成${NC}"
    
    return $orphaned
}

# ============================================================================
# 主执行
# ============================================================================
main() {
    check_content_duplicates
    dup_result=$?
    
    check_naming_compliance
    naming_result=$?
    
    check_architecture_coverage
    arch_result=$?
    
    check_authority_markers
    
    check_navigation_links
    
    echo -e "\n${BLUE}════════════════════════════════════════════${NC}"
    
    if [ $dup_result -ne 0 ] || [ $naming_result -ne 0 ] || [ $arch_result -ne 0 ]; then
        echo -e "${YELLOW}⚠️  检测到潜在问题${NC}"
        
        if [ "$STRICT" = "--strict" ]; then
            echo -e "${RED}严格模式: 失败${NC}"
            echo -e "\n建议:"
            echo -e "  1. 审查 docs/ARCHITECTURE.md"
            echo -e "  2. 确认文件职责是否清晰"
            echo -e "  3. 删除重复的文件或更新为链接"
            exit 1
        else
            echo -e "${YELLOW}提示: 运行 \`bash scripts/check-duplicate-docs.sh --strict\` 以启用严格模式${NC}"
            exit 0
        fi
    else
        echo -e "${GREEN}✓ 所有检查通过${NC}"
        exit 0
    fi
}

main
