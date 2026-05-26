#!/usr/bin/env bash
# check-markdown-links.sh — 本地 Markdown 断链检查（镜像 repo-meta-ci.yml 逻辑）
#
# 用法：
#   bash scripts/check-markdown-links.sh [file1.md file2.md ...]
#   # 无参数 → 自动检测 git diff 中变更的 .md 文件
#
# 退出码：0 = 全部通过；1 = 有断链；2 = python3 不可用（warning，不阻塞）
#
# PDEF-005 改进项 AI-1：将 CI 断链检查能力引入本地，消除"仅 CI 发现"盲区

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# --- 收集待检查的 .md 文件 ---
if [ "$#" -gt 0 ]; then
    MD_FILES=("$@")
else
    # 无参数：从 git diff 取变更的 .md 文件
    mapfile -t MD_FILES < <(
        git diff --name-only HEAD 2>/dev/null \
        | grep '\.md$' \
        || true
    )
    # fallback：staged 文件
    if [ "${#MD_FILES[@]}" -eq 0 ]; then
        mapfile -t MD_FILES < <(
            git diff --cached --name-only 2>/dev/null \
            | grep '\.md$' \
            || true
        )
    fi
fi

# 过滤不存在的文件，转为绝对路径
EXISTING=()
for f in "${MD_FILES[@]:-}"; do
    [ -z "$f" ] && continue
    abs="$REPO_ROOT/$f"
    [ -f "$abs" ] && EXISTING+=("$abs")
done

if [ "${#EXISTING[@]}" -eq 0 ]; then
    echo "→ Markdown links: no .md files to check, skip"
    exit 0
fi

echo "→ Markdown links: checking ${#EXISTING[@]} file(s)"

# python3 可用性检查（降级为 warning，不阻塞）
if ! command -v python3 >/dev/null 2>&1; then
    echo "⚠  python3 not found — skip Markdown link check (CI will catch issues)"
    exit 2
fi

# --- 运行与 repo-meta-ci.yml 完全相同的 Python 逻辑 ---
python3 - "$REPO_ROOT" "${EXISTING[@]}" <<'PY'
import pathlib
import re
import sys
from urllib.parse import unquote

repo_root = pathlib.Path(sys.argv[1]).resolve()
files = [pathlib.Path(p).resolve() for p in sys.argv[2:]]
pattern = re.compile(r'!?\[[^\]]*\]\(([^)]+)\)')

failures = []
for markdown_file in files:
    if not markdown_file.exists():
        continue
    text = markdown_file.read_text(encoding="utf-8")
    for raw_target in pattern.findall(text):
        target = raw_target.strip()
        if not target or target.startswith(("#", "http://", "https://", "mailto:")):
            continue
        if target.startswith("<") and target.endswith(">"):
            target = target[1:-1]
        target = target.split()[0]
        target = unquote(target.split("#", 1)[0])
        if not target:
            continue

        resolved = (markdown_file.parent / target).resolve()
        try:
            resolved.relative_to(repo_root)
        except ValueError:
            failures.append(f"{markdown_file.relative_to(repo_root)}: {raw_target} (outside repository)")
            continue

        if not resolved.exists():
            failures.append(f"{markdown_file.relative_to(repo_root)}: {raw_target}")

if failures:
    print("Broken Markdown links detected:")
    for f in failures:
        print(f" - {f}")
    sys.exit(1)

print(f"✔ Markdown links OK ({len(files)} file(s) checked)")
PY
