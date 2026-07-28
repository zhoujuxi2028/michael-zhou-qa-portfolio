# microservice-testing-platform Defect & Waiver Register

制度文档: `../../../docs/project-management/defect-tracking/README.md`
Waiver 政策: `../../../docs/project-management/defect-tracking/waiver-policy.md`

## 严重度定义

| 级别 | 含义 | Gate 影响 |
|------|------|-----------|
| P0 / Critical | 核心功能不可用，数据不可信 | 立即 BLOCKED |
| P1 / High | 重要功能降级，影响验收结论 | 标记 Blocking 时 BLOCKED |
| P2 / Medium | 非核心功能异常，有 workaround | 不阻塞，可 waiver |
| P3 / Low | 轻微问题，不影响功能或结论 | 不阻塞，记录即可 |

## 活跃缺陷登记表

| Defect ID | GitHub Issue | 标题摘要 | 严重度 | Blocking? | 发现日期 | 状态 | 关联 Waiver | 备注 |
|-----------|--------------|----------|--------|-----------|----------|------|-------------|------|
| _(无)_ | | | | | | | | |

## 已关闭缺陷历史

| Defect ID | GitHub Issue | 标题摘要 | 严重度 | 关闭日期 | 关闭方式 | 关联 Commit / PR |
|-----------|--------------|----------|--------|----------|----------|-------------------|
| MS-DEF-001 | — | NaN 分页参数导致 SQLite datatype mismatch 500 | P1 | 2026-07-27 | Fixed: list() 中 sanitize page/limit（parseInt + Math.max） | 本 PR |
| MS-DEF-002 | — | 非数字 quantity/unitPrice 穿透模型验证，DB 存入 NaN | P1 | 2026-07-27 | Fixed: 3 个模型 + inventory route 增加 typeof 检查 | 本 PR |
| MS-DEF-003 | — | 负数 page 偏移在 SQLite 中被视为 0，返回所有行 | P3 | 2026-07-27 | Fixed: page/limit 统一 sanitize 到 ≥ 1 | 本 PR |

## 变更日志

| 日期 | 变更内容 | 操作人 |
|------|----------|--------|
| 2026-07-27 | 初始建表，登记 MS-DEF-001~003 | QA |
