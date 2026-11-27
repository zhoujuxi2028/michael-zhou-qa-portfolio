# PoC-02：GitHub Copilot CLI + Playwright MCP

| 项目 | 结果 |
|------|------|
| 日期 | 2026-11-27 |
| 目的 | 验证 Copilot 能否通过 Playwright MCP 探索页面并生成测试 |
| 环境 | macOS、Node.js v26.13.1、Copilot CLI 1.0.114 |
| 依赖 | `@playwright/mcp` 0.0.86、`@playwright/test` 1.65.1 |
| 结论 | 单个登录意图的浏览器操作、测试生成和变异验证通过；完整项目流程尚未验证 |

## 验证结果

在会话临时目录启动本地登录演示页，使用演示账号和密码；未使用真实账号。Copilot 通过 Playwright MCP 操作页面，并生成一个 Playwright TypeScript 测试。

| 场景 | 实际结果 |
|------|---------|
| 正常页面：连续三次错误登录后锁定，再提交正确密码 | 生成的测试通过：1 passed |
| 变异页面：锁定阈值从 3 次改为 5 次 | 测试按预期失败：期望 `Account locked`，实际为 `Invalid credentials` |

运行命令（在 PoC 临时目录内）：

```bash
./node_modules/.bin/playwright test login.spec.ts --reporter=line
BASE_URL='http://127.0.0.1:18765/index.html?mutant=1' ./node_modules/.bin/playwright test login.spec.ts --reporter=line
```

第二条命令退出码为 1，属于预期的变异验证结果。演示页、MCP 配置和生成测试仅保存在会话临时目录，未纳入仓库；上述命令不能直接在项目目录复现。

## 限制和风险

- 生成的测试通过直接修改页面状态元素来清空提示；正式用例须人工评审并避免不必要地修改被测页面。
- PoC 未验证 v2 改版自愈、完整七个意图、CI、报告生成或端到端权限隔离。
- Copilot 调用了可执行浏览器代码的 MCP 工具；文件写入权限限制本身不能证明 MCP 进程的隔离性。
- 页面内容和提示词可能进入 Copilot 的模型上下文；正式使用前应确认数据和服务策略。

## 环境隔离

- Node.js 依赖安装在各项目自己的 `node_modules`；Python `venv` 不隔离 Node.js 依赖。
- 如需 Python 依赖，使用并激活对应项目的 `venv`。
- PoC 期间曾误在仓库根目录执行 `npm install`，改变了根目录的 `node_modules`；根目录 `package.json` 和 lockfile 未发生跟踪文件变更。后续安装应先确认工作目录。

## 后续

本 PoC 仅支持继续评估 Copilot 方案。若决定替换 Claude Code，应先更新并评审需求、架构、风险和实施计划，再进入开发。

## 补充：本地 MCP 子进程隔离探针

使用 Copilot CLI 1.0.116 和 macOS 的 sandbox，启动一个仅操作会话临时标记文件的自定义 stdio MCP 服务。临时工作区尝试配置 `sandboxMcpServers: true`、`allowBypass: false`、`allowDevToolAccess: false` 和 `deniedPaths`；以下为实际观测结果，不假设这些本地配置生效。

| 场景 | 工作区内写入 | 工作区内受限目录读取 | 工作区外标记读取 | 工作区外标记写入 |
|------|--------------|----------------------|------------------|------------------|
| Copilot `--sandbox` 启动 MCP | 成功 | **成功**，尽管本地 `deniedPaths` 指定了该目录 | `EPERM` | `EPERM` |
| 同一探针直接运行，不使用 sandbox | 成功 | 未执行此对照 | 成功 | 成功 |

后续改用会话内独立 `COPILOT_HOME` 的用户级 sandbox 配置后，同一自定义 MCP 探针对工作区内受限文件也返回 `EPERM`。这验证了该临时配置下的文件限制，但不代表项目本地配置生效。

实际 Playwright MCP 探针在 sandbox 内未能启动浏览器：系统 Chrome 先因动态库和用户目录 Crashpad 被拒绝访问而失败，改用独立 Chromium headless 后仍未启动。因浏览器未就绪，不能将其报错当成 Playwright MCP 文件隔离通过。网络、凭据和正式环境的完整隔离仍未验证。探针及配置位于会话临时目录，未纳入仓库。
