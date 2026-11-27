# PoC-01：Claude Code + Playwright MCP 驱动浏览器

| 属性 | 内容 |
|------|------|
| 日期 | 2026-11-27 |
| 目的 | 验证 RSK-VT-003：`@playwright/mcp` 0.0.x 在本机能否被 Claude Code 稳定调用 |
| 环境 | macOS，Node v26.13.1，Claude Code 2.1.322，`@playwright/mcp` 0.0.86，Chromium 1255 |
| 结论 | ✅ 通过 |

## 步骤

| # | 操作 | 结果 |
|---|------|------|
| 1 | 本地静态页（登录，3 次失败锁定），`python3 -m http.server 8765` | `http 200` |
| 2 | MCP 配置用 `npx -y @playwright/mcp@0.0.86` | ❌ MCP 启动超时（30 s），首次 `npx` 下载过慢 |
| 3 | 改为本地安装 `npm install @playwright/mcp@0.0.86`，配置指向 `node_modules/.bin/playwright-mcp` | 启动 2.7 s |
| 4 | `playwright install chromium` | 下载约 208 MB |
| 5 | `claude -p "<意图>" --mcp-config mcp.json --strict-mcp-config --allowedTools "mcp__playwright__*" --max-turns 15 < /dev/null` | 见下 |

## 输出

```text
TITLE: VT PoC Login
MSG: Account locked
```

## 可信度

- 提示词未提到"锁定"，只有真实点击 3 次才会得到 `Account locked`
- `--allowedTools` 只放行 Playwright 工具，Agent 无法读源码或执行 shell
- 标题只能通过打开页面获得

## 发现

| 发现 | 处理 |
|------|------|
| `npx -y` 冷启动超过 MCP 30 s 启动时限 | `@playwright/mcp` 写入 `devDependencies`，`.mcp.json` 指向本地可执行文件（RSK-VT-007） |
| `@playwright/mcp` 0.0.86 依赖 Playwright `1.66.0-alpha` | 锁定版本；测试运行器单独使用稳定版 `@playwright/test`（RSK-VT-008） |
| 首次需下载约 208 MB Chromium | README 写明准备步骤；CI 只装 Chromium 并缓存（RSK-VT-006） |
