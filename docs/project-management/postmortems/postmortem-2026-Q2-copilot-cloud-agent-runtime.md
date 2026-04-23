# Postmortem — Copilot Cloud Agent CI 超过 5 分钟

> **事件时间**: 2026-04-23 06:08 UTC  
> **影响范围**: `Running Copilot cloud agent` 动态 workflow  
> **严重级别**: P3 — 不阻断普通 CI，但明显影响 agent 交付效率  
> **关联 run/job**: run `#24819778702` / job `#72641769254`

---

## 1. 事件摘要

用户反馈 Copilot cloud agent 的一次任务 run 耗时 `585s`，显著超过 5 分钟。

分析后确认：

- setup / cleanup 开销很小
- `Processing Request` 占比接近全部
- 仓库此前没有 Copilot 专用 setup workflow，也没有该 CI 的专门架构/设计文档

---

## 2. 影响评估

| 维度 | 影响 |
|------|------|
| 任务交付时延 | Copilot 任务反馈慢，影响 PR 迭代节奏 |
| 排障成本 | 每次都要重新分析耗时成因 |
| 仓库维护性 | 缺少该 CI 的 SSOT 文档 |
| 主项目测试 | 无直接失败，但效率下降明显 |

---

## 3. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 06:07:56 | run `#24819778702` 创建 |
| 06:08:00 | job `#72641769254` 开始 |
| 06:08:07 | `Processing Request` 开始 |
| 06:17:38 | `Processing Request` 结束 |
| 06:17:40 | job 完成 |
| 06:51+ | 针对本次超时问题进行专项分析与优化 |

---

## 4. 根因总结

### 直接原因

`Processing Request` 阶段承担了大量仓库发现与环境判断工作。

### 深层原因

仓库缺少：

1. Copilot cloud agent 的 setup workflow
2. 该 CI 的架构文档
3. 该 CI 的优化设计文档

因此相同的环境识别成本在多次 run 中反复出现。

---

## 5. 修复措施

### 已实施

- 新增 `.github/workflows/copilot-setup-steps.yml`
- 新增 `docs/guides/copilot-cloud-agent-ci-architecture.md`
- 新增 `docs/superpowers/specs/2026-04-23-copilot-cloud-agent-ci-optimization-design.md`
- 新增本次 RCA 与 postmortem

### 设计取舍

- **采用**: 轻量 cache restore
- **不采用**: 每次 session 全仓依赖安装

原因：后者会把文档类任务也拖慢，不符合本仓库多项目 monorepo 的实际情况。

---

## 6. 回归验证

已完成：

- workflow YAML 语法校验
- 新增文档链接校验

待合并后观察：

- Copilot setup workflow 是否正常执行
- 后续需要依赖安装的任务总耗时是否下降

---

## 7. Lessons Learned

1. **>5 分钟不等于 runner 慢**  
   必须先拆分 setup、processing、cleanup，避免误判。

2. **monorepo 的 agent 需要仓库侧 bootstrap**  
   否则每个 session 都会重复做环境识别。

3. **性能问题也需要文档化**  
   没有架构和设计文档，后续每次分析都会重复劳动。

---

## 8. 后续行动

| 行动项 | 类型 | 状态 |
|--------|------|------|
| 合并到默认分支后观察后续 3~5 次 Copilot run 时长 | 验证 | 待执行 |
| 如果仍然长期 >5 分钟，继续拆分 prompt / task scope | 优化 | 待执行 |
| 如后续仓库已有 larger runner 条件，再评估 runner 升级 | 架构 | 待评估 |
