# Postmortem — 2026-04-23 merge-only `format-scope` 测试失败

> **事件时间**: 2026-04-23 04:13 UTC  
> **影响范围**: `Performance Testing / Unit Tests`  
> **严重级别**: P2 — 阻塞 PR 合并  
> **恢复时间**: 同日修复

---

## 1. 事件摘要

在 PR #184 合并校验阶段，`Performance Testing / Unit Tests` job 失败。  
表面现象是新增回归测试 `tests/unit/scripts/format-scope.test.js` 报错，  
本质问题是：

> 测试把 workflow 的 shell 命令文本当成固定契约，但 merge ref 中 workflow 已切换到 `npm run format:check`。

这导致本地分支测试通过、合并校验失败。

---

## 2. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-23 03:55 | 提交 `fix: align local prettier scope with ci`，新增 `format-scope.test.js` |
| 2026-04-23 04:12 | PR #184 触发 `Performance Testing CI` |
| 2026-04-23 04:13 | `Performance Testing / Code Quality` 通过 |
| 2026-04-23 04:13 | `Performance Testing / Unit Tests` 在 `npm run test:coverage` 中失败 |
| 2026-04-23 04:28 | 用户提供失败 job 链接并要求分析 |
| 2026-04-23 | 定位为 merge ref workflow 与测试假设不一致，随后完成修复与回归验证 |

---

## 3. 影响

| 维度 | 影响 |
|------|------|
| CI | 单测 job 红灯，后续 smoke / JMeter / baseline / trend job 全部跳过 |
| 开发效率 | 本地无法直接复现 merge ref 行为，增加排查成本 |
| 风险类型 | 流程 / 测试契约缺陷，不是产品功能缺陷 |

---

## 4. 做得好的地方

- GitHub Actions job log 明确给出了失败测试名和断言内容
- 失败点集中在单个回归测试，定位范围小
- 质量门禁已逐步迁移到 `npm script`，便于统一入口

---

## 5. 做得不好的地方

- 回归测试绑定了 workflow 的实现细节，而不是稳定接口
- 分支 workflow 未及时跟随主线同步
- 本地验证只基于分支文件，没有考虑 PR merge ref 的实际执行环境

---

## 6. 行动项

| Action | 类型 | 状态 |
|--------|------|------|
| 将 `performance-ci.yml` 统一为 `npm run lint` / `npm run format:check` / `npm run test:coverage` | 修复 | ✅ |
| 重写 `format-scope.test.js`，改为校验稳定的 npm script 契约 | 修复 | ✅ |
| 补充本次 RCA / postmortem 文档 | 文档 | ✅ |

---

## 7. 长期防线

1. **workflow 门禁命令优先只调用 npm scripts**
2. **针对 workflow 的测试只校验稳定接口，不绑定 shell 文本**
3. **新增“merge ref 风险”检查意识**：当 PR 引入 workflow 相关测试时，要额外关注 base branch 是否已有同类变更

---

## 8. 验证

修复后已完成以下回归：

- `npm run lint`
- `npm run format:check`
- `npm run test:coverage`
- `npm test`

均通过。
