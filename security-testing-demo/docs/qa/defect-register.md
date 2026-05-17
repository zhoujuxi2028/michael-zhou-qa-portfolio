# security-testing-demo Defect & Waiver Register

> **维护规则:** 每次 Stage Gate 执行 / Issue 状态变化时同步；Issue 关闭后标记 Closed，保留历史行  
> **制度文档:** [../../../docs/project-management/defect-tracking/README.md](../../../docs/project-management/defect-tracking/README.md)

---

## 严重度定义

| 级别 | 含义 | Gate 影响 |
|------|------|-----------|
| **P0 / Critical** | 核心功能不可用，数据不可信 | 立即 BLOCKED，必须修复后重新执行 |
| **P1 / High** | 重要功能降级，影响验收结论 | 标记 Blocking 时 BLOCKED；否则可 waiver |
| **P2 / Medium** | 非核心功能异常，有合理 workaround | 不阻塞，可 waiver |
| **P3 / Low** | 轻微问题，不影响功能或结论 | 不阻塞，记录即可 |

> 定义与 Portfolio 统一，详见 `docs/project-management/defect-tracking/README.md` §3。

---

## 矛盾结果处理规则

> 同一用例输出"既 FAIL 又 PASS"时，**默认 BLOCKED**，直至根因明确。需在本表登记说明两段输出的来源与差异。

---

## 活跃缺陷登记表（Active Defects）

| Defect ID | GitHub Issue | 标题摘要 | 严重度 | Blocking? | 发现日期 | 状态 | 关联 Waiver | 备注 |
|-----------|--------------|----------|--------|-----------|----------|------|-------------|------|
| SEC-DEF-001 | TBD | Security Tests dependency-scan job 失败 - safety check 缺少策略文件 | P2 | No | 2026-05-17 | 🔧 Fixing | N/A | safety check 默认查找 `.safety-policy.yml` 但文件不存在 |

---

## Waiver 登记表

> Waiver 仅用于 **P1（非核心） / P2 / P3**；P0 缺陷**不得** waiver。审批流程见 `../../../docs/project-management/defect-tracking/waiver-policy.md`。

| Waiver ID | 关联 Defect | 关联 Issue | 豁免理由 | 风险评估 | 审批人 | 审批日期 | 有效期 | 状态 |
|-----------|-------------|------------|----------|----------|--------|----------|--------|------|
| _(无)_ | | | | | | | | |

---

## 已关闭缺陷历史（Closed Defects）

> Closed 行**永不删除**，供审计追溯。

| Defect ID | GitHub Issue | 标题摘要 | 严重度 | 关闭日期 | 关闭方式 | 关联 Commit / PR |
|-----------|--------------|----------|--------|----------|----------|-------------------|
| _(无)_ | | | | | | |

---

## 变更日志

| 日期 | 变更内容 | 操作人 |
|------|----------|--------|
| 2026-05-17 | 初始建表；登记 SEC-DEF-001（dependency-scan job 失败） | QA |
