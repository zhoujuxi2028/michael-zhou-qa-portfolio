# Stage 4 Enterprise Doc Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Phase 7 Stage 4 验收文档体系提升至企业级标准（三文档模型）。

**Architecture:** 拆分原有混用文档为：可复用 Gate Template、Defect/Waiver Register、日期化 Execution Report，并归档 Phase 6 历史报告、删除职责混乱的 `phase7-stage4-validation.md`。

**Tech Stack:** Markdown, Git

---

## 文件映射

| 操作 | 路径 |
|------|------|
| 新建 | `docs/qa/stage4-gate-template.md` |
| 新建 | `docs/qa/stage4-defect-waiver-register.md` |
| 新建 | `docs/qa/reports/stage4-execution-2026-04-24.md` |
| 迁移 | `docs/qa/stage4-validation.md` → `docs/qa/reports/phase6-stage4-verification-report.md` |
| 删除 | `docs/qa/phase7-stage4-validation.md` |
| 更新 | `docs/qa/test-plan.md` |
| 扫描修复 | 全仓库旧路径引用 |

---

### Task 1: 创建 docs/qa/reports/ 目录（已完成）

- [x] `mkdir -p docs/qa/reports`

---

### Task 2: 创建 stage4-gate-template.md

**Files:**
- Create: `performance-testing-platform/docs/qa/stage4-gate-template.md`

- [ ] 创建文件，内容见 plan 附录 A

---

### Task 3: 创建 stage4-defect-waiver-register.md

**Files:**
- Create: `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md`

- [ ] 创建文件，包含 #192~#195 当前状态

---

### Task 4: 创建 reports/stage4-execution-2026-04-24.md

**Files:**
- Create: `performance-testing-platform/docs/qa/reports/stage4-execution-2026-04-24.md`

- [ ] 创建文件，引用 gate-template，填写 Phase 7 当前执行状态

---

### Task 5: 迁移 stage4-validation.md

- [ ] `git mv docs/qa/stage4-validation.md docs/qa/reports/phase6-stage4-verification-report.md`
- [ ] 更新文件顶部标题和导航

---

### Task 6: 删除 phase7-stage4-validation.md

- [ ] `git rm docs/qa/phase7-stage4-validation.md`

---

### Task 7: 更新 test-plan.md 文档导航

- [ ] 在 test-plan.md 中新增三文档入口引用

---

### Task 8: 扫描修复旧路径引用

- [ ] 全仓库搜索旧路径并替换

---

### Task 9: 提交并推送

- [ ] `git add -A && git commit && git push`
