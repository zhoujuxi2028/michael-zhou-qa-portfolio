#!/bin/bash
# Git Push 连接方式性能基准测试脚本
# 用法: bash benchmark.sh
# 测试方法: git ls-remote（完整认证+数据传输，不触发 pre-push hook）

REPO_SSH="git@github.com:zhoujuxi2028/michael-zhou-qa-portfolio.git"
REPO_HTTPS=$(git remote get-url origin)
RUNS=3

ms() { python3 -c "import time; print(int(time.time()*1000))"; }

run_test() {
  local label=$1
  local cmd=$2
  echo "=== $label ==="
  local total=0; local count=0
  for i in $(seq 1 $RUNS); do
    START=$(ms)
    eval "$cmd" > /dev/null 2>&1
    CODE=$?
    END=$(ms)
    MS=$((END - START))
    STATUS="✅"; [ $CODE -ne 0 ] && STATUS="❌(exit $CODE)"
    echo "  第${i}次: ${MS}ms  $STATUS"
    [ $CODE -eq 0 ] && total=$((total + MS)) && count=$((count + 1))
  done
  [ $count -gt 0 ] && echo "  有效平均: $((total / count))ms ($count/$RUNS 成功)"
  echo ""
}

run_test "① SSH 直连" \
  "git ls-remote $REPO_SSH HEAD"

run_test "② HTTPS 直连" \
  "git ls-remote $REPO_HTTPS HEAD"

run_test "③ SSH + SOCKS5 :7891" \
  "GIT_SSH_COMMAND='ssh -o ProxyCommand=\"nc -x 127.0.0.1:7891 %h %p\" -o ServerAliveInterval=30' git ls-remote $REPO_SSH HEAD"

run_test "④ HTTPS + HTTP proxy :7890" \
  "HTTPS_PROXY=http://127.0.0.1:7890 git ls-remote $REPO_HTTPS HEAD"
