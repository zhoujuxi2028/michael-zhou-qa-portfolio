#!/usr/bin/env bash
# check-commit-guard.sh — 本地模拟 .github/workflows/commit-guard.yml 中
# "Conventional Commits (subject rules)" job 的校验逻辑。
#
# 用途：在 push / 创建 PR 前快速验证 commit subject 是否会被 Commit Guard 拒收，
# 避免 PR 红灯回流到 cloud / CI 才暴露（参考 DEF-022 复盘）。
#
# 使用：
#   scripts/check-commit-guard.sh                     # 默认范围 origin/main..HEAD
#   scripts/check-commit-guard.sh <BASE> <HEAD>       # 自定义范围
#   scripts/check-commit-guard.sh --range <BASE>..<HEAD>
#
# 规则（与 workflow 保持完全一致）：
#   1. 格式: ^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\([a-z0-9._/-]+\))?!?: .+
#   2. 长度: subject ≤ 72
#   3. 末尾不带句号（含中文句号 。）
#
# 退出码：
#   0 — 所有 commit 通过
#   1 — 存在违规 commit
#   2 — 调用方式错误 / 无 git 仓库

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/check-commit-guard.sh [BASE] [HEAD]
  scripts/check-commit-guard.sh --range BASE..HEAD
  scripts/check-commit-guard.sh -h | --help

Defaults: BASE=origin/main, HEAD=HEAD
EOF
}

BASE=""
HEAD_REF=""

case "${1:-}" in
  -h|--help)
    usage; exit 0 ;;
  --range)
    [ $# -ge 2 ] || { usage; exit 2; }
    RANGE="$2"
    BASE="${RANGE%..*}"
    HEAD_REF="${RANGE##*..}"
    ;;
  "")
    BASE="origin/main"
    HEAD_REF="HEAD"
    ;;
  *)
    BASE="$1"
    HEAD_REF="${2:-HEAD}"
    ;;
esac

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: not inside a git repository" >&2
  exit 2
fi

# BASE 不存在时回退到 main / 当前分支首个 commit，避免本地无 origin/main 时直接报错
if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
  for fallback in main origin/HEAD; do
    if git rev-parse --verify --quiet "$fallback" >/dev/null; then
      echo "warn: '$BASE' not found, falling back to '$fallback'" >&2
      BASE="$fallback"
      break
    fi
  done
fi

COMMITS=$(git rev-list --no-merges "${BASE}..${HEAD_REF}" 2>/dev/null || true)
if [ -z "$COMMITS" ]; then
  echo "No non-merge commits in range ${BASE}..${HEAD_REF}."
  exit 0
fi

PATTERN='^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\([a-z0-9._/-]+\))?!?: .+'
FAILED=0
CHECKED=0

for SHA in $COMMITS; do
  SUBJECT=$(git log -1 --format=%s "$SHA")
  LEN=${#SUBJECT}
  CHECKED=$((CHECKED + 1))

  # 规则 1: 格式
  if ! printf '%s' "$SUBJECT" | grep -qE "$PATTERN"; then
    echo "✗ ${SHA:0:8} subject 不符合 Conventional Commits: $SUBJECT"
    FAILED=1
    continue
  fi

  # 规则 2: 长度 ≤ 72
  if [ "$LEN" -gt 72 ]; then
    echo "✗ ${SHA:0:8} subject 长度 $LEN > 72: $SUBJECT"
    FAILED=1
  fi

  # 规则 3: 末尾不带句号
  case "$SUBJECT" in
    *.)  echo "✗ ${SHA:0:8} subject 末尾带英文句号: $SUBJECT"; FAILED=1 ;;
    *。) echo "✗ ${SHA:0:8} subject 末尾带中文句号: $SUBJECT"; FAILED=1 ;;
  esac
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "规范: <type>(<scope>)?!?: <subject>  (subject ≤ 72, 无末尾句号)"
  echo "types: feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert"
  echo "scope 字符集: [a-z0-9._/-]+"
  exit 1
fi

echo "✓ All ${CHECKED} commit subject(s) in ${BASE}..${HEAD_REF} pass Commit Guard rules."
