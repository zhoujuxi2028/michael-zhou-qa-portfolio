# 需求管理操作指南（How-To Guide）

> 本文档说明如何在日常开发中使用需求管理系统。
> 制度规则和字段定义见 [README.md](README.md)；需求台账见 [req-register.md](req-register.md)；追溯矩阵见 [RTM.md](RTM.md)。

---

## 快速上手：最简三步

对于展示项目，每个需求只需做三件事：

```
1. 有新需求  → req-register.md 加一行（状态填 Proposed）
2. 开始开发  → RTM.md 填入对应测试用例
3. 测试通过  → 两个文件更新状态，GitHub Issue 关闭
```

其余字段（CR、AC ID、延期原因）按需补充，不需要每次填满。

---

## 完整操作：5 阶段逐步说明

以 `cicd-demo` 新增"smoke test 失败时自动回滚"为例，完整走一遍流程。

### Stage 1 — 提出需求

**操作：**

1. 在 GitHub 创建 Issue，标题用英文：
   ```
   feat(cicd): add smoke test rollback on failure
   ```
2. Issue body 写需求描述 + 初步 AC：
   ```
   Given  smoke-test-staging job 失败
   When   deploy-production 触发条件检查
   Then   自动执行 helm rollback，staging 恢复至上一版本
   ```
3. 贴标签：`req/functional` + `proj:cicd`
4. 在 `req-register.md` 追加一行，状态填 `Proposed`：

   | REQ ID | GitHub Issue | 标题摘要 | 状态 |
   |--------|--------------|----------|------|
   | PREQ-009 | #280 | smoke test 失败时自动回滚 staging | Proposed |

---

### Stage 2 — 细化与评审

**操作：**

1. 在 Issue 补充完整 AC，每条场景一组 Given/When/Then
2. 确认优先级（P1 / P2 / P3）
3. 检查 AC 是否可测试、边界是否清晰
4. `req-register.md` 状态改为 `Approved`，填入 REQ ID

> **⚠️ AC 不完整时不得进入 Stage 3。** 模糊的需求会导致测试无法验收。

---

### Stage 3 — 开发

**操作：**

1. 创建 feature 分支：`feature/cicd-rollback`
2. `req-register.md` 状态改为 `In Development`，填入关联 PR #
3. 编写测试时，在 `RTM.md` 填入测试用例 ID：

   | 需求编号 | 需求描述 | 状态 | 测试用例 | Workflow | 最近结果 |
   |----------|----------|------|----------|----------|---------|
   | PREQ-009 | smoke test 失败自动回滚 | In Dev | TC-CICD-012 | cicd-demo-deploy.yml | — |

---

### Stage 4 — 测试验收

**操作：**

1. CI 全绿后，对照 Issue 中的 AC 逐条手动验收
2. 每条 AC 通过后在 Issue 评论中打勾记录
3. 全部通过：
   - `RTM.md` 最近结果填 `✅ YYYY-MM-DD`
   - `req-register.md` 状态改为 `Verified`

---

### Stage 5 — 收尾

**操作：**

1. PR merge，GitHub Issue 关闭
2. `req-register.md` 将该行从 Active 区剪切到 Closed 区，填写关闭日期和关联 PR
3. `RTM.md` 覆盖率汇总表更新计数

---

## 日常操作速查

| 场景 | 操作 |
|------|------|
| 有新想法或新功能 | 建 GitHub Issue → `req-register.md` 加行（Proposed）|
| 本期做不了 | 台账状态改 `Deferred`，写原因和目标阶段 |
| 确认本期不做 | 状态改 `Dropped`，写原因，**行永不删除** |
| 需求描述变了 | 建 CR Issue，台账备注 `CR-NNN` |
| 合入后需求追溯 | 查 `RTM.md`，从需求 ID 找到测试用例和 Workflow |
| 季度需求复查 | 看 RTM 覆盖率汇总，未覆盖需求重新排优先级 |

---

---

## Issue ↔ 需求同步规范

需求台账（`req-register.md`）与 GitHub Issue 之间必须保持双向可追溯：

| 事件 | 操作 | 时限 |
|------|------|------|
| 创建 Issue | 在 `req-register.md` 新增一行，填写 REQ-ID + Issue 链接 | 24h |
| Issue 状态变更 | 同步更新台账状态列（Proposed / Refined / In Development / Verified / Closed） | 24h |
| PR 合并 | 如果 PR 关联需求，更新台账状态并补充关联 PR 编号 | 合并后 24h |
| 季度审计 | 扫描所有 Open Issue → 台账中是否有对应行，缺失则补录 | 每季度末 |

**示例**：Issue #437（PREQ-006）状态为 In Development → 台账对应行状态为 In Development。

---

## 常见问题

**Q：每个需求都要建 GitHub Issue 吗？**
Approved 状态以上的需求必须有对应 Issue；Proposed / Refined 阶段可以只在台账里记录，待确认后再建 Issue。

**Q：`req-register.md` 和 `RTM.md` 什么区别？**

| 文档 | 回答的问题 |
|------|-----------|
| `req-register.md` | 这个需求存不存在、状态是什么、谁提的 |
| `RTM.md` | 这个需求被哪些测试用例覆盖、CI 跑通了没有 |

**Q：子项目需要单独的需求文档吗？**
初期不强制。可以先在 `req-register.md` 的"项目级需求入口"标注"按需初始化"，等项目需求超过 10 条时，复制 `req-template.md` 到对应项目目录。

**Q：需求变更了怎么办？**
1. 在原 Issue 评论说明变更内容
2. 建 `CR-NNN` Issue 记录变更决策
3. 更新 `req-register.md` 对应行，备注 CR ID
4. 如果测试用例也要改，同步更新 `RTM.md`
