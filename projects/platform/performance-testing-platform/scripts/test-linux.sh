#!/usr/bin/env bash
# test-linux.sh — 本地复现 CI Linux 环境（Ubuntu 24.04 + Node.js 18）
# 用途：验证 native 依赖（better-sqlite3 等）在 Linux 上的兼容性
# 触发时机：Dependabot 提 native 包升级 PR 时，合并前本地运行一次
#
# 依赖：Docker / OrbStack
# 用法：bash scripts/test-linux.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Linux 兼容性测试（Ubuntu 24.04 + Node.js 18）==="
echo "项目路径: $PROJECT_DIR"
echo ""

docker run --rm \
  --platform linux/amd64 \
  -v "$PROJECT_DIR":/workspace \
  -w /workspace \
  node:18-slim \
  bash -c "
    set -e
    echo '--- 安装依赖 ---'
    npm ci
    echo ''
    echo '--- 运行单元测试（含 coverage）---'
    npm run test:coverage
    echo ''
    echo '✅ Linux 兼容性测试通过'
  "
