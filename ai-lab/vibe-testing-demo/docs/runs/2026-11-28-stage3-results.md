# 阶段 3 结果（2026-11-28）

分支 `feature/vibe-testing-generation`（#946），未推送。工具：GitHub Copilot CLI 1.0.116 + `@playwright/mcp` 0.0.86，正常环境运行（RSK-VT-009 残余风险已接受）。

## 交付

| 交付物 | 路径 | 验证 |
|--------|------|------|
| 生成脚本 | `scripts/generate.sh` | 集成测试 6 条（TDD） |
| 自愈脚本 | `scripts/heal.sh` | 集成测试 10 条（TDD） |
| 精确变异门禁 | `scripts/check-mutant.mjs` | 单元测试 7 条（TDD）+ 真实 mutant 运行 |
| 生成用例 v1 | `tests/generated/v1/VT-INT-01..07.spec.ts` | v1 7/7 通过 |
| 自愈用例 v2 | `tests/generated/v2/` | 断言守卫通过，v2 7/7 通过 |
| 运行记录 | `docs/runs/generate-VT-INT-*.md`、`2026-11-28-heal-*.{txt,md}` | 提示词、失败输出、diff 入库 |
| CI | `.github/workflows/vibe-testing-ci.yml` | actionlint、workflow 文档同步通过 |

## 本地自测

| 命令 | 结果 |
|------|------|
| `npm run lint`、`npm run typecheck` | 通过 |
| `npm run test:unit` / `test:integration` | 18/18、23/23 通过 |
| `npm run test:coverage` | statements 83.93%、branches 85.26%、functions 90% |
| `npm run test:smoke`；v2 / mutant 手写变体 | 5/5、1/1、1/1 通过 |
| `npm test`（生成用例 v1） | 7/7 通过 |
| `npm run test:mutant` | 通过：仅 VT-INT-03 因 `Account locked` 断言失败 |
| `check-assertions.mjs v1 v2` | 通过（7 个文件） |
| `APP_VERSION=v2` 生成用例 | 7/7 通过 |

## 过程中发现并修复的问题

| # | 问题 | 处理 | Commit |
|---|------|------|--------|
| 1 | 提示词要求 Agent 读 `risks.md`、做 Git 检查，与禁用的 read/shell 权限冲突，首次生成未写文件 | 检查交给脚本；版本与时间由脚本注入 | `4c9fde8b` |
| 2 | 生成用例写死主机端口、手动建上下文 | 提示词要求 `page` fixture + 相对 URL | `12122536` |
| 3 | VT-INT-03 意图未给出密码，Agent 拒绝读实现 | 意图补全账号密码 | `43eae9f6` |
| 4 | VT-INT-04 对含按钮的 `<li>` 精确断言文本 | [缺陷记录](2026-11-28-generate-VT-INT-04-defect.md)，提示词补规则后重新生成 | `69d85c06` |
| 5 | VT-INT-07 对空列表断言 `toBeVisible()` | [缺陷记录](2026-11-28-generate-VT-INT-07-defect.md)，提示词补规则后重新生成 | `9da78676` |

缺陷 4、5 均由“生成后立即在 v1 上执行”发现；未手改生成代码。

## 未完成 / 待评审

- 14 个生成用例 `reviewed-by: pending`，需人工按 [复核清单](../qa/ai-code-review-checklist.md) 复核后填写。
- 复核提示：测试命名不统一（部分缺 `VT-INT-NN:` 前缀）。
- 远端 CI、Linux 浏览器依赖安装及故意失败报红尚未验证（阶段 4）。
