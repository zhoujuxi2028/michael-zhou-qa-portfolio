#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^VT-INT-0[1-7]$ ]]; then
  echo "错误：意图必须为 VT-INT-01 至 VT-INT-07。" >&2
  exit 1
fi

intent="$1"
intent_file="intents/$intent.md"
target="tests/generated/v1/$intent.spec.ts"
record="docs/runs/generate-$intent.md"

if [[ ! -f "$intent_file" ]]; then
  echo "错误：意图文件不存在：$intent_file" >&2
  exit 1
fi
for file in prompts/generate.md .mcp.json scripts/serve.mjs; do
  if [[ ! -f "$file" ]]; then
    echo "错误：缺少必要文件：$file" >&2
    exit 1
  fi
done
if ! command -v copilot >/dev/null || [[ ! -x node_modules/.bin/playwright-mcp ]]; then
  echo "错误：Copilot 或 Playwright MCP 不可用。" >&2
  exit 1
fi
if [[ -e "$target" || -e "$record" ]]; then
  echo "错误：目标文件或运行记录已存在，不覆盖。" >&2
  exit 1
fi

if ! status=$(git status --porcelain=v1 --untracked-files=all); then
  echo "错误：无法检查 Git 状态。" >&2
  exit 1
fi
if [[ -n "$status" ]]; then
  echo "错误：执行前工作区必须干净；请先检查 Git 状态。" >&2
  exit 1
fi
prefix=$(git rev-parse --show-prefix)
mkdir -p tests/generated/v1 docs/runs

server_log=$(mktemp)
server_pid=''
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || :
    wait "$server_pid" 2>/dev/null || :
  fi
  rm -f "$server_log"
}
trap cleanup EXIT
node scripts/serve.mjs v1 4173 >"$server_log" 2>&1 &
server_pid=$!
ready=0
for ((i = 0; i < 50; i++)); do
  if grep -q '127\.0\.0\.1:4173' "$server_log" && curl --silent --fail http://127.0.0.1:4173/ >/dev/null; then
    ready=1
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    break
  fi
  sleep 0.1
done
if [[ "$ready" -ne 1 ]]; then
  echo "错误：本地演示服务启动失败。" >&2
  cat "$server_log" >&2
  exit 1
fi

copilot_version=$(copilot --version | head -n 1)
copilot_version=${copilot_version%.}
mcp_version=$(node_modules/.bin/playwright-mcp --version | head -n 1)
mcp_version=${mcp_version#Version }
generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

prompt="$(cat prompts/generate.md)

generated-by：$copilot_version + @playwright/mcp $mcp_version
generated-at：$generated_at

目标意图：$intent
$(cat "$intent_file")

本地演示页面：http://127.0.0.1:4173/
仅写入 ${target}；只处理此意图，不运行 shell。"

if ! copilot --trust-folder --disable-builtin-mcps --no-custom-instructions \
  --allow-tool=playwright --allow-tool="write($(pwd)/$target)" \
  --deny-tool=shell --deny-tool=read -p "$prompt" >/dev/null; then
  echo "错误：Copilot 生成失败；请检查权限、MCP 和服务状态。" >&2
  exit 1
fi

git_check=0
node - "$prefix$target" <<'NODE' || git_check=$?
const { spawnSync } = require('node:child_process');
const result = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
if (result.status !== 0 || result.error) process.exit(1);
const entries = result.stdout.toString('utf8').split('\0').filter(Boolean);
if (entries.length === 0) process.exit(2);
if (entries.length !== 1 || entries[0] !== `?? ${process.argv[2]}`) process.exit(1);
NODE
if [[ "$git_check" -eq 2 ]]; then
  echo "错误：Copilot 未创建有效目标文件。" >&2
  exit 1
fi
if [[ "$git_check" -ne 0 ]]; then
  echo "错误：检测到目标范围外的仓库修改，或目标不受 Git 跟踪；请保留现场检查。" >&2
  exit 1
fi
if [[ ! -s "$target" || -L "$target" ]]; then
  echo "错误：Copilot 未创建有效目标文件。" >&2
  exit 1
fi

{
  printf '# 生成记录：%s\n\n' "$intent"
  printf '状态：已生成，等待人工复核。\n\n'
  printf '## 提示词\n\n%s\n' "$prompt"
} >"$record"
printf '已生成 %s；请人工复核，记录见 %s。\n' "$intent" "$record"
