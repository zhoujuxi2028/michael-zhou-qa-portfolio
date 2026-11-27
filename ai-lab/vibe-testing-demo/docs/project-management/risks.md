# Vibe Testing Demo — 风险登记册

## 风险等级

| 等级 | 含义 | 响应策略 |
|------|------|---------|
| 🔴 HIGH | 可能阻断阶段推进 | 立即缓解 / PoC 验证 |
| 🟡 MEDIUM | 导致额外工作范围 | 规划缓解方案 |
| 🟢 LOW | 可接受 | 监控即可 |

## 活跃风险

| ID | 风险描述 | 等级 | 类别 | 缓解措施 | 状态 |
|----|---------|------|------|---------|------|
| RSK-VT-001 | **Agent 输出不确定**：同一意图多次生成结果不同 | 🟡 MEDIUM | 技术 | 生成结果提交到仓库，CI 只跑已提交用例；记录生成提示词（VT-05） | 监控 |
| RSK-VT-002 | **Agent 削弱断言让测试变绿** | 🔴 HIGH | 质量 | 修复提示词禁止改断言；`check-assertions` 脚本自动比对修复前后断言；变异验证（VT-10）；复核清单（VT-08） | 已设计 |
| RSK-VT-003 | **`@playwright/mcp` 仍是 0.0.x**，接口可能变化 | 🟡 MEDIUM | 依赖 | 锁定 0.0.86；PoC-01 已验证本机可用 | ✅ PoC 通过 |
| RSK-VT-004 | **生成需要 Claude 账号**，他人无法复现生成过程 | 🟡 MEDIUM | 环境 | 生成记录入库；README 区分"复现执行"（任何人）和"复现生成"（需账号） | 监控 |
| RSK-VT-005 | **过度宣传**：把演示说成团队落地经验 | 🟡 MEDIUM | 表述 | README 明确是个人演示项目；用例文件头标注 AI 生成 + 人工复核 | 监控 |
| RSK-VT-006 | **CI 安装浏览器耗时** | 🟢 LOW | 环境 | 只装 Chromium；缓存 npm | 监控 |
| RSK-VT-007 | **`npx -y` 冷启动超时**：首次下载超过 MCP 30 s 启动时限 | 🟡 MEDIUM | 环境 | 本地安装，`.mcp.json` 指向 `node_modules/.bin/playwright-mcp`（PoC-01） | ✅ 已缓解 |
| RSK-VT-008 | **MCP 依赖 Playwright alpha**（1.66.0-alpha），与测试运行器版本不同 | 🟡 MEDIUM | 依赖 | 锁定版本；MCP 只用于生成 / 修复，执行用稳定版 `@playwright/test`；两者浏览器版本差异记录在 README | 监控 |
| RSK-VT-009 | **Agent 越权**：生成时改动 `tests/generated/` 以外的文件 | 🟡 MEDIUM | 安全 | `--allowedTools` 只放行 Playwright MCP 和 `Write(tests/generated/**)`；生成后 `git status` 检查 | 已设计 |
