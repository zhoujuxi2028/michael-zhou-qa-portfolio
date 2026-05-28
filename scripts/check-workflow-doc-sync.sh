#!/usr/bin/env bash
# 校验 workflow 是否同步登记到根 README / CLAUDE，降低文档漂移风险。
#
# 用法：
#   bash scripts/check-workflow-doc-sync.sh [changed-files.txt]  # 仅检查变更的 workflow
#   bash scripts/check-workflow-doc-sync.sh --all                 # 全量检查所有 workflow

set -euo pipefail

ALL_MODE=0
if [ "${1:-}" = "--all" ]; then
  ALL_MODE=1
fi

if [ "$ALL_MODE" -eq 1 ]; then
  mapfile -t WORKFLOW_PATHS < <(
    find .github/workflows -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) | sort
  )
  echo "workflow-doc full audit: ${#WORKFLOW_PATHS[@]} workflow file(s)"
else
  CHANGED_FILE_LIST="${1:-changed-files.txt}"

  if [ ! -f "$CHANGED_FILE_LIST" ]; then
    echo "info: $CHANGED_FILE_LIST not found, skip workflow-doc sync check."
    echo "      本地运行方式："
    echo "        git diff --name-only origin/main...HEAD > /tmp/changed-files.txt"
    echo "        bash scripts/check-workflow-doc-sync.sh /tmp/changed-files.txt"
    echo "      全量检查（检测历史遗漏）："
    echo "        bash scripts/check-workflow-doc-sync.sh --all"
    exit 0
  fi

  mapfile -t WORKFLOW_PATHS < <(
    grep -E '^\.github/workflows/.*\.(yml|yaml)$' "$CHANGED_FILE_LIST" | sort -u || true
  )

  if [ "${#WORKFLOW_PATHS[@]}" -eq 0 ]; then
    echo "info: no changed workflow files, skip workflow-doc sync check."
    exit 0
  fi
fi

FAILED=0
for path in "${WORKFLOW_PATHS[@]}"; do
  file="$(basename "$path")"
  if ! grep -Fq "\`$file\`" README.md; then
    echo "::error::README.md 未同步 workflow 文件名: $file"
    FAILED=1
  fi

  if ! grep -Fq "\`$file\`" CLAUDE.md; then
    echo "::error::CLAUDE.md 未同步 workflow 文件名: $file"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "请在 PR 中同步：README.md、CLAUDE.md、branch protection required checks。"
  exit 1
fi

echo "workflow-doc sync check passed for ${#WORKFLOW_PATHS[@]} workflow file(s)."
