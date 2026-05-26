# RCA — PR #187 Repository Meta CI 因 Markdown 相对路径错误失败

> **事件类型**: CI 失败  
> **影响范围**: PR #187 的 `Repository Meta CI` workflow  
> **关联 run/job**: run #24814632103 / job #72626355318  
> **发生时间**: 2026-04-23 03:11 UTC

---

## 1. 现象

PR #187 (`fix: align performance formatting checks with CI`) 的 `Repository Meta CI` 在 `Run repository meta lint` 步骤失败。

关键日志：

```text
Broken Markdown links detected:
 - LABEL_STRATEGY.md: docs/qa/reports/phase6-stage4-verification-report.md
Error: Process completed with exit code 1.
```

---

## 2. 直接原因

`/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/docs/process/label-strategy.md` 中的链接写成了：

```md
../reports/phase6-stage4-verification-report.md
```

该路径会被解析为：

```text
/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/docs/reports/phase6-stage4-verification-report.md
```

但真实文件位置是：

```text
/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md
```

因此链接解析后目标不存在，repo-level Markdown link check 失败。

---

## 3. 根本原因（Root Cause）

这是一次 **跨目录文档引用路径失真**：

1. `label-strategy.md` 位于 `docs/process/`
2. 被引用的验收报告位于 `performance-testing-platform/docs/qa/reports/`
3. 链接编写时误按 `docs/` 目录内局部相对路径思维书写，遗漏了先返回仓库根目录再进入子项目目录

换言之，问题不在 workflow 本身，而在文档变更引入了错误的相对路径。

---

## 4. 根因链路

```text
编辑 docs/process/label-strategy.md
  → 新增/保留了错误相对路径 ../reports/phase6-stage4-verification-report.md
    → PR #187 触发 Repository Meta CI
      → repo-meta-ci.yml 按 Markdown 文件所在目录解析链接
        → 解析到 docs/reports/phase6-stage4-verification-report.md
          → 文件不存在
            → Markdown link check 失败
              → job #72626355318 红灯
```

---

## 5. 修复方案

### 已实施修复

将 `label-strategy.md` 中的链接改为仓库根相对路径：

```md
../../performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md
```

### 配套治理

- 新增本次 RCA 文档  
  `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/docs/reports/RCA-187-repo-meta-broken-markdown-link.md`
- 新增本次 postmortem 文档  
  `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/docs/project-management/postmortems/postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md`
- 更新 `docs/README.md`、`docs/reports/README.md`、`docs/project-management/postmortems/README.md` 导航

---

## 6. 回归验证

### 变更前复现

本地按 workflow 同逻辑复现，得到：

```text
Broken links before fix:
docs/process/label-strategy.md: ../reports/phase6-stage4-verification-report.md
```

### 变更后验证

已执行以下回归校验：

1. 对 `docs/process/label-strategy.md` 重新执行同类 Markdown 链接解析校验
2. 对本次新增/修改的文档批量执行 Markdown 链接校验
3. 核对目标报告文件真实存在

预期结果：`Repository Meta CI` 中的 Markdown link check 对本次变更应恢复绿灯。

---

## 7. 防御措施

- 跨项目文档引用时，优先先确认“源文件目录”与“目标文件目录”的相对层级
- 新增 RCA / postmortem 后同步更新目录导航，减少复制旧链接时的路径误用
- 继续保留 `repo-meta-ci.yml` 中的 Markdown link check，尽早拦截文档断链

---

## 8. 结论

本次失败属于 **文档相对路径错误引发的 repo-level CI 红灯**。  
修复后的链接已指向真实存在的 Phase 6 Stage 4 验收报告，并完成对应 RCA / postmortem 归档。
