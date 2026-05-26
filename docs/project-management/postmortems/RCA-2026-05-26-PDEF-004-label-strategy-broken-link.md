# PDEF-004: label-strategy 文档断链导致 Repository Meta CI 失败 — RCA

**缺陷 ID**: PDEF-004  
**严重度**: P2 Medium  
**发现日期**: 2026-05-26  
**修复日期**: 2026-05-26  
**影响范围**: 仓库级 `Repository Meta CI / lint`（触达 `docs/guides/label-strategy.md` 的 PR）

---

## 1. 问题描述

PR #269 在 `Repository Meta CI / lint` 失败（run #26424617666，job #77785667644，exit code 1）。

**错误信息**：

```text
Broken Markdown links detected:
 - docs/guides/label-strategy.md: ../../performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md
```

---

## 2. 根因分析

### 直接原因

`docs/guides/label-strategy.md` 的相对链接缺少 `execution/` 目录层级，引用了不存在的文件路径。

### 深层原因

1. 文档路径在目录重构后未同步更新
2. 文档提交前未执行本地 Markdown 断链检查

---

## 3. 修复方案

将链接从：

```text
../../performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md
```

修正为：

```text
../../performance-testing-platform/docs/qa/reports/execution/phase6-stage4-verification-report.md
```

并在 Portfolio 缺陷登记主表登记 `PDEF-004`（Closed）。

---

## 4. 验证结果

- 本地复跑目标文档 Markdown link check：通过（0 broken links）
- 断链已消除，`Repository Meta CI / lint` 对该文件的校验条件恢复正常

---

## 5. 相关链接

- Workflow Run: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26424617666
- Failing Job: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26424617666/job/77785667644
- Triggering PR: #269
- Defect Register: [../defect-tracking/defect-register.md](../defect-tracking/defect-register.md)

---

**作者**: QA  
**创建日期**: 2026-05-26  
**最后更新**: 2026-05-26
