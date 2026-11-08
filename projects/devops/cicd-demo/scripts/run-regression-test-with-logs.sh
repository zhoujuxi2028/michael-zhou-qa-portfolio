#!/bin/bash
# Docker Compose Bug 回归测试脚本（带日志记录）
# 用于验证 Bug #1 和 Bug #2 是否已修复，并记录详细日志

set -e  # 遇到错误立即退出

cd "$(dirname "$0")"

# 创建日志目录
LOG_DIR="test-logs"
mkdir -p "$LOG_DIR"

# 生成时间戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/regression-test-$TIMESTAMP.log"
SUMMARY_FILE="$LOG_DIR/test-summary-$TIMESTAMP.txt"

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_header() {
    echo "" | tee -a "$LOG_FILE"
    echo "==========================================" | tee -a "$LOG_FILE"
    echo "$1" | tee -a "$LOG_FILE"
    echo "==========================================" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"
}

log_fail() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1" | tee -a "$LOG_FILE"
}

# 开始测试
log_header "Docker Compose Bug 回归测试"
log "测试开始时间: $(date)"
log "测试日志: $LOG_FILE"
log "测试总结: $SUMMARY_FILE"
log ""

# 环境信息
log_header "环境信息"
log "工作目录: $(pwd)"
log "Docker 版本: $(docker --version)"
log "Docker Compose 版本: $(docker compose version)"
log "操作系统: $(uname -a)"
log ""

# 清理环境
log_header "步骤 1: 清理测试环境"
log "删除旧的测试数据..."
rm -rf newman/api-report.html cypress/videos/* cypress/screenshots/*
log_success "旧数据已删除"

log "停止并删除旧容器..."
docker compose down -v >> "$LOG_FILE" 2>&1
log_success "容器清理完成"
log ""

# Bug #1: Newman HTMLExtra
log_header "步骤 2: Bug #1 - Newman HTMLExtra Reporter"
log "开始构建自定义 Newman 镜像..."

if docker compose build newman >> "$LOG_FILE" 2>&1; then
    log_success "Newman 镜像构建成功"

    # 验证镜像
    log "验证镜像信息..."
    docker images | grep newman | tee -a "$LOG_FILE"
else
    log_fail "Newman 镜像构建失败"
    log "请查看日志文件: $LOG_FILE"
    exit 1
fi
log ""

# Bug #2: 运行完整测试
log_header "步骤 3: Bug #2 - 执行完整测试"
log "启动测试容器（后台运行）..."

if docker compose up -d >> "$LOG_FILE" 2>&1; then
    log_success "容器启动成功"

    log "等待容器完成测试..."
    log "  - Newman: 预计 6-7 秒"
    log "  - Cypress: 预计 15-20 秒"

    # 等待容器完成
    docker compose wait cypress newman >> "$LOG_FILE" 2>&1

    # 记录退出码
    NEWMAN_EXIT=$(docker inspect basf-newman-tests --format='{{.State.ExitCode}}' 2>/dev/null || echo "N/A")
    CYPRESS_EXIT=$(docker inspect basf-cypress-tests --format='{{.State.ExitCode}}' 2>/dev/null || echo "N/A")

    log "Newman 退出码: $NEWMAN_EXIT"
    log "Cypress 退出码: $CYPRESS_EXIT"

    # 收集容器日志
    log ""
    log "收集容器日志..."
    docker compose logs newman >> "$LOG_DIR/newman-$TIMESTAMP.log" 2>&1
    docker compose logs cypress >> "$LOG_DIR/cypress-$TIMESTAMP.log" 2>&1
    log_success "日志已保存:"
    log "  - Newman: $LOG_DIR/newman-$TIMESTAMP.log"
    log "  - Cypress: $LOG_DIR/cypress-$TIMESTAMP.log"
else
    log_fail "容器启动失败"
    log "请查看日志文件: $LOG_FILE"
    exit 1
fi
log ""

# 验证结果
log_header "步骤 4: 验证测试结果"

# 验证 Bug #1 - Newman 报告
log "Bug #1: 检查 Newman HTML 报告..."
if [ -f newman/api-report.html ]; then
    SIZE=$(stat -f%z newman/api-report.html 2>/dev/null || stat -c%s newman/api-report.html)
    if [ $SIZE -gt 200000 ]; then
        log_success "HTML 报告生成成功 ($(echo "scale=1; $SIZE/1024" | bc) KB)"
    else
        log_warn "HTML 报告太小 (${SIZE} bytes)"
    fi
else
    log_fail "HTML 报告不存在"
fi
log ""

# 验证 Bug #2 - Cypress 视频
log "Bug #2: 检查 Cypress 视频文件..."
VIDEO_COUNT=$(ls cypress/videos/*.mp4 2>/dev/null | wc -l | tr -d ' ')
if [ "$VIDEO_COUNT" -eq 2 ]; then
    log_success "生成 2 个视频文件（预期）"
    ls cypress/videos/*.mp4 | while read file; do
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
        log "  ✓ $(basename "$file") ($(echo "scale=1; $SIZE/1024" | bc) KB)"
    done
else
    log_fail "只有 ${VIDEO_COUNT} 个视频（预期 2 个）"
fi
log ""

# 验证退出码
log "检查容器退出码..."
if [ "$CYPRESS_EXIT" -eq 0 ]; then
    log_success "Cypress 正常退出 (exit code 0)"
else
    if [ "$CYPRESS_EXIT" -eq 137 ]; then
        log_fail "Cypress 被强制杀掉 (exit code 137 = SIGKILL)"
    else
        log_fail "Cypress 异常退出 (exit code $CYPRESS_EXIT)"
    fi
fi

if [ "$NEWMAN_EXIT" -eq 0 ]; then
    log_success "Newman 正常退出 (exit code 0)"
else
    log_fail "Newman 异常退出 (exit code $NEWMAN_EXIT)"
fi
log ""

# 验证测试统计
log "检查测试统计..."

# 提取 Cypress 测试数量（从 "All specs passed" 行）
CYPRESS_TESTS=$(docker compose logs cypress 2>/dev/null | \
    grep "All specs passed" | \
    awk '{for(i=1;i<=NF;i++) if($i~/^[0-9]+$/ && $(i+1)~/^[0-9]+$/) {print $(i+1); exit}}' | \
    head -1)

# 提取 Newman 断言数量（从 assertions 行）
NEWMAN_ASSERTIONS=$(docker compose logs newman 2>/dev/null | \
    grep "assertions" | \
    grep -oP 'assertions\s*│\s*\K\d+' | \
    head -1)

# 验证并设置默认值
CYPRESS_TESTS=${CYPRESS_TESTS:-0}
NEWMAN_ASSERTIONS=${NEWMAN_ASSERTIONS:-0}

# 确保是整数
if ! [[ "$CYPRESS_TESTS" =~ ^[0-9]+$ ]]; then
    CYPRESS_TESTS=0
fi

if ! [[ "$NEWMAN_ASSERTIONS" =~ ^[0-9]+$ ]]; then
    NEWMAN_ASSERTIONS=0
fi

# 验证结果
if [ "$CYPRESS_TESTS" -eq 16 ]; then
    log_success "Cypress: 16/16 测试通过"
else
    log_warn "Cypress: ${CYPRESS_TESTS}/16 测试执行（预期 16）"
fi

if [ "$NEWMAN_ASSERTIONS" -ge 18 ]; then
    log_success "Newman: ${NEWMAN_ASSERTIONS} 断言通过"
elif [ "$NEWMAN_ASSERTIONS" -eq 0 ]; then
    log_warn "Newman: 无法读取断言数量"
else
    log_warn "Newman: ${NEWMAN_ASSERTIONS} 断言（预期 18）"
fi
log ""

# 生成测试总结
log_header "测试总结"

{
    echo "=========================================="
    echo "Docker Compose Bug 回归测试总结"
    echo "=========================================="
    echo ""
    echo "测试时间: $(date)"
    echo "测试日志: $LOG_FILE"
    echo ""
    echo "环境信息:"
    echo "  - Docker: $(docker --version)"
    echo "  - Docker Compose: $(docker compose version)"
    echo ""
    echo "Bug 修复状态:"
    echo ""

    # Bug #1
    echo "Bug #1: Newman HTMLExtra Reporter"
    if [ -f newman/api-report.html ] && [ $SIZE -gt 200000 ]; then
        echo "  状态: ✅ 已修复"
        echo "  报告: newman/api-report.html ($(echo "scale=1; $SIZE/1024" | bc) KB)"
    else
        echo "  状态: ❌ 未修复"
    fi
    echo ""

    # Bug #2
    echo "Bug #2: Cypress 测试完整性"
    if [ "$VIDEO_COUNT" -eq 2 ] && [ "$CYPRESS_EXIT" -eq 0 ] && [ "$CYPRESS_TESTS" -eq 16 ]; then
        echo "  状态: ✅ 已修复"
        echo "  视频数量: 2/2"
        echo "  测试数量: 16/16"
        echo "  退出码: 0 (正常)"
    else
        echo "  状态: ❌ 未修复"
        echo "  视频数量: $VIDEO_COUNT/2"
        echo "  测试数量: $CYPRESS_TESTS/16"
        echo "  退出码: $CYPRESS_EXIT"
    fi
    echo ""

    # 测试结果
    echo "测试执行结果:"
    echo "  - Newman: $NEWMAN_EXIT (0=成功)"
    echo "  - Cypress: $CYPRESS_EXIT (0=成功)"
    echo "  - Newman 断言: $NEWMAN_ASSERTIONS"
    echo "  - Cypress 测试: $CYPRESS_TESTS"
    echo ""

    # 生成的文件
    echo "生成的文件:"
    echo "  - newman/api-report.html"
    ls cypress/videos/*.mp4 2>/dev/null | while read file; do
        echo "  - $file"
    done
    echo ""

    # 日志文件
    echo "日志文件:"
    echo "  - 主日志: $LOG_FILE"
    echo "  - Newman日志: $LOG_DIR/newman-$TIMESTAMP.log"
    echo "  - Cypress日志: $LOG_DIR/cypress-$TIMESTAMP.log"
    echo ""

    # 最终结论
    if [ -f newman/api-report.html ] && [ "$VIDEO_COUNT" -eq 2 ] && [ "$CYPRESS_EXIT" -eq 0 ] && [ "$CYPRESS_TESTS" -eq 16 ]; then
        echo "=========================================="
        echo "✅ 所有 Bug 已修复！"
        echo "=========================================="
    else
        echo "=========================================="
        echo "⚠️  仍有问题需要解决"
        echo "=========================================="
    fi
} | tee "$SUMMARY_FILE"

log ""
log_header "测试完成"
log "测试总结已保存: $SUMMARY_FILE"
log "完整日志已保存: $LOG_FILE"
log ""

# 显示如何查看结果
log "查看测试报告:"
log "  - Newman HTML: firefox newman/api-report.html"
log "  - Cypress 视频: ls -lh cypress/videos/"
log "  - 测试日志: cat $SUMMARY_FILE"
log ""

# 清理容器
log "清理测试容器..."
docker compose down >> "$LOG_FILE" 2>&1
log_success "清理完成"
log ""

log "回归测试全部完成！"
