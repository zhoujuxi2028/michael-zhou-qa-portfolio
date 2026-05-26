# Postmortem — PR #187 Repository Meta CI Markdown 断链

> **事件时间**: 2026-04-23 03:11 UTC  
> **影响范围**: PR #187 的 `Repository Meta CI`  
> **严重级别**: P4 — 文档质量门禁失败，不影响业务代码运行  
> **关联 run/job**: run #24814632103 / job #72626355318

---

## 1. 事件摘要

PR #187 更新文档后触发 `Repository Meta CI`。  
workflow 在 Markdown 链接检查阶段失败，原因是 `docs/process/label-strategy.md` 指向了一个不存在的相对路径。

---

## 2. 影响评估

| 维度 | 影响 |
|------|------|
| CI 状态 | `Repository Meta CI` 报红 |
| 代码质量 | 无运行时影响，属于文档质量缺陷 |
| 合并节奏 | PR 需要修复断链后才能恢复绿灯 |
| 影响范围 | 仅影响本次修改到的 Markdown 文档校验 |

---

## 3. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-23 03:11:31 | run #24814632103 启动 |
| 2026-04-23 03:11:46 | `Run repository meta lint` 开始 |
| 2026-04-23 03:11:56 | 输出 `Broken Markdown links detected` |
| 2026-04-23 03:11:57 | job #72626355318 以 exit code 1 结束 |
| 2026-04-23 03:33+ | 开始本地复现、修复与归档 RCA/postmortem |

---

## 4. 根因总结

### 直接原因

`label-strategy.md` 使用了错误的相对链接：

```md
../reports/phase6-stage4-verification-report.md
```

### 深层原因

- 文档位于 `docs/process/`，目标文件位于 `performance-testing-platform/docs/qa/reports/`
- 编辑时把跨项目引用误写成了 `docs/` 目录内引用
- 变更前缺少对该具体链接的即时本地校验

---

## 5. 修复措施

### 已完成

- 将链接修正为：
  `../../performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md`
- 补充本次 RCA 与 postmortem 文档
- 更新相关导航索引，避免后续追踪困难

### 回归观察结论

- 已完成：PR #187 合并后，后续 `Repository Meta CI` 已再次成功运行（最新观察 run `#24822640946` 为 `success`）

---

## 6. 回归验证

已完成：

- 本地复现断链失败
- 修复后重新执行同逻辑 Markdown link check
- 核对目标报告文件真实存在且链接可解析

预期线上结果：

- `Repository Meta CI` 不再报告该断链
- 本次新增 RCA / postmortem 文档导航可正常访问

---

## 7. Lessons Learned

1. **跨项目文档引用比同目录引用更容易写错**  
   必须以“当前文档所在目录”为基准验证相对路径。

2. **repo-level 文档门禁是必要的**  
   这次失败虽然是小问题，但正说明门禁有效拦截了将断链带入主分支的风险。

3. **文档变更也要做最小回归验证**  
   即使只是改 README / guide，仍应本地跑一遍对应的链接检查逻辑。

---

## 8. 后续行动

| 行动项 | 类型 | 状态 |
|--------|------|------|
| 观察 PR #187 下一次 `Repository Meta CI` 结果 | 验证 | ✅ 已完成 |
| 后续涉及跨项目文档链接时，优先使用本地脚本做路径回归 | 流程 | 已采纳 |

---

## 9. 最终结论

本次事件是一次低风险但高可见性的文档断链问题。  
根因清晰、修复直接，且通过补充 RCA / postmortem 把故障模式沉淀为可复用经验。
