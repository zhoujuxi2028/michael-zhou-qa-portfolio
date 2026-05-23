# PDEF-001: Portfolio 缺陷登记表 Markdown 链接断链 — RCA

**缺陷 ID**: PDEF-001
**严重度**: P2 Medium
**发现日期**: 2026-05-23
**修复日期**: 2026-05-23
**影响范围**: 仓库级 `Repository Meta CI / lint` job（任何修改触达 `docs/project-management/defect-tracking/defect-register.md` 的 PR）

---

## 1. 问题描述

PR #248（`copilot/refine-readme-and-file-structure`）在 `Repository Meta CI` 的 `lint` job 中失败（run #26346106861，job #77556161570，exit code 1）。

**错误信息**：

```
Broken Markdown links detected:
 - docs/project-management/defect-tracking/defect-register.md: ../../../performance-testing-platform/docs/qa/defect-register.md
```

**影响**：

- 任何 `git diff` 命中 `docs/project-management/defect-tracking/defect-register.md` 的 PR 都会被 `Repository Meta CI` 阻塞
- PR #248 实际只修改 `cicd-demo/README.md`，但 diff 范围覆盖到 main 上已存在的断链文件，导致受牵连失败
- 不影响业务代码运行，属于文档治理门禁缺陷

---

## 2. 根本原因（Root Cause）

### 直接原因

`docs/project-management/defect-tracking/defect-register.md` 第 71 行的项目级入口链接指向不存在的路径：

```
../../../performance-testing-platform/docs/qa/defect-register.md
```

而 `performance-testing-platform` 的实际登记表位于：

```
performance-testing-platform/docs/qa/defects/register.md
```

### 深层原因

1. **README 与登记表入口不一致**：本目录 `README.md` §11 已正确写为 `defects/register.md`（2026-04-26 切换 SSoT 后），但 `defect-register.md` §6 项目级入口未同步更新
2. **跨项目相对路径未做即时校验**：编辑时未本地运行 Markdown link check
3. **断链潜伏期长**：该错误链接随主表初版（2026-04-25）落地后一直存在，直到本次 PR diff 触达才被门禁捕获

---

## 3. 修复方案

**选择的方案**：将链接修正为真实路径

将主表 §6 中的入口由 `../../../performance-testing-platform/docs/qa/defect-register.md` 修正为 `../../../performance-testing-platform/docs/qa/defects/register.md`，同时把显示文本由 `defect-register.md` 同步为 `defects/register.md`。

**修复要点**：

1. 同步 `defect-register.md` §6 入口与 `README.md` §11 当前在用的项目级登记表
2. 在 Closed Defects 区登记 `PDEF-001` 并附 RCA 链接
3. 主表"变更日志"追加 2026-05-23 条目

**其他考虑过的方案**：

- 在 perf-platform 添加 `defect-register.md` 重定向 stub：增加冗余、违反 SSoT 原则，弃用

---

## 4. 预防措施

| 行动项 | 类型 | 状态 |
|--------|------|------|
| 修复链接 + 登记 PDEF-001 + 补 RCA | 修复 | ✅ 已完成 |
| 文档变更前本地跑 `Repository Meta CI` 同款 Markdown link check（参考 [postmortem-2026-Q2-issue-187](postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md) §7） | 流程 | 已采纳 |
| README §11 与 defect-register §6 项目级入口表保持双向一致（任何 SSoT 切换需同步更新两处） | 制度 | 已采纳 |

---

## 5. 相关链接

- **GitHub Actions Run**: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26346106861
- **Failing Job**: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26346106861/job/77556161570
- **Triggering PR**: #248
- **同模式历史 Postmortem**: [postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md](postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md)
- **Portfolio 缺陷登记主表**: [../defect-tracking/defect-register.md](../defect-tracking/defect-register.md)

---

**作者**: QA
**创建日期**: 2026-05-23
**最后更新**: 2026-05-23
