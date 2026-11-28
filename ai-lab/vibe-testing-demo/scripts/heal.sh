#!/usr/bin/env bash
set -euo pipefail

failure="${1:-}"
if [[ $# -ne 1 || ! "$failure" =~ ^docs/runs/[0-9]{4}-[0-9]{2}-[0-9]{2}-heal-before\.txt$ ]]; then
  echo "错误：失败记录必须为 docs/runs/<YYYY-MM-DD>-heal-before.txt。" >&2
  exit 1
fi
if [[ ! -f "$failure" || -L "$failure" || ! -s "$failure" ]]; then
  echo "错误：失败记录不存在或为空：$failure" >&2
  exit 1
fi
record="${failure%-before.txt}-diff.md"
mcp="${PLAYWRIGHT_MCP:-node_modules/.bin/playwright-mcp}"

shopt -s nullglob
v1_specs=(tests/generated/v1/*.spec.ts)
v2_specs=(tests/generated/v2/*.spec.ts)
shopt -u nullglob
if [[ ${#v1_specs[@]} -eq 0 ]]; then
  echo "错误：缺少 v1 生成用例。" >&2
  exit 1
fi
if [[ ${#v2_specs[@]} -eq 0 ]]; then
  echo "错误：缺少 v2 副本；请先复制 tests/generated/v1 并提交。" >&2
  exit 1
fi
for file in prompts/heal.md .mcp.json scripts/serve.mjs scripts/check-assertions.mjs; do
  if [[ ! -f "$file" ]]; then
    echo "错误：缺少必要文件：$file" >&2
    exit 1
  fi
done
if ! command -v copilot >/dev/null || [[ ! -x "$mcp" ]]; then
  echo "错误：Copilot 或 Playwright MCP 不可用。" >&2
  exit 1
fi
if [[ -e "$record" ]]; then
  echo "错误：diff 记录已存在，不覆盖：$record" >&2
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

server_log=$(mktemp)
server_pid=''
stop_server() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || :
    wait "$server_pid" 2>/dev/null || :
    server_pid=''
  fi
}
cleanup() {
  stop_server
  rm -f "$server_log"
}
trap cleanup EXIT
node scripts/serve.mjs v2 4173 >"$server_log" 2>&1 &
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
mcp_version=$("$mcp" --version | head -n 1)
mcp_version=${mcp_version#Version }

files_section=''
allow_writes=()
for spec in "${v2_specs[@]}"; do
  files_section+="
### $spec

\`\`\`ts
$(cat "$spec")
\`\`\`
"
  allow_writes+=("--allow-tool=write($(pwd)/$spec)")
done

prompt="$(cat prompts/heal.md)

generated-by：$copilot_version + @playwright/mcp $mcp_version

本地 v2 页面：http://127.0.0.1:4173/
只可修改以下 v2 副本；文件内容已在下方给出。

## 失败输出（${failure}）

\`\`\`text
$(cat "$failure")
\`\`\`

## v2 副本
$files_section"

if ! copilot --trust-folder --disable-builtin-mcps --no-custom-instructions \
  --allow-tool=playwright "${allow_writes[@]}" \
  --deny-tool=shell --deny-tool=read -p "$prompt" >/dev/null; then
  echo "错误：Copilot 修复失败；请检查权限、MCP 和服务状态。" >&2
  exit 1
fi
stop_server

git_check=0
node - "${prefix}tests/generated/v2/" <<'NODE' || git_check=$?
const { spawnSync } = require('node:child_process');
const result = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
if (result.status !== 0 || result.error) process.exit(1);
const entries = result.stdout.toString('utf8').split('\0').filter(Boolean);
if (entries.length === 0) process.exit(2);
const dir = process.argv[2];
const ok = (entry) => entry.startsWith(` M ${dir}`) && entry.endsWith('.spec.ts')
  && !entry.slice(3 + dir.length).includes('/');
if (!entries.every(ok)) process.exit(1);
NODE
if [[ "$git_check" -eq 2 ]]; then
  echo "错误：Copilot 未修改 v2 副本。" >&2
  exit 1
fi
if [[ "$git_check" -ne 0 ]]; then
  echo "错误：检测到 v2 副本范围外的仓库修改；请保留现场检查。" >&2
  exit 1
fi

if ! node scripts/check-assertions.mjs tests/generated/v1 tests/generated/v2 >&2; then
  echo "错误：断言守卫未通过；修复改动了断言或测试结构，请保留现场检查。" >&2
  exit 1
fi
if ! APP_VERSION=v2 npx playwright test tests/generated/v2 --project=chromium --reporter=line >&2; then
  echo "错误：修复后 v2 用例仍失败；请保留现场检查。" >&2
  exit 1
fi

{
  printf '# 自愈记录：%s\n\n' "$(basename "$record" .md)"
  printf -- '- generated-by：%s + @playwright/mcp %s\n' "$copilot_version" "$mcp_version"
  printf -- '- 失败输出：`%s`\n' "$failure"
  printf -- '- 断言守卫：通过\n- v2 用例：通过\n- 状态：等待人工复核\n\n'
  printf '## Diff\n\n```diff\n%s\n```\n' "$(git diff -- tests/generated/v2)"
} >"$record"
printf '已修复 v2 副本；请人工复核，记录见 %s。\n' "$record"
