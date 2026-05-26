# Portfolio Postmortem 归档

> 本目录统一存放 Portfolio 级别的季度复盘、专项 RCA 和问题闭环文档。

## 1. 当前归档

| 文档 | 类型 | 说明 |
|------|------|------|
| [postmortem-2026-Q1.md](postmortem-2026-Q1.md) | 季度复盘 | 2026 Q1 closed defects 汇总分析 |
| [postmortem-2026-Q2.md](postmortem-2026-Q2.md) | 季度复盘 | 2026 Q2 open issues 专项 RCA |
| [postmortem-2026-Q2-copilot-cloud-agent-runtime.md](postmortem-2026-Q2-copilot-cloud-agent-runtime.md) | 问题闭环 | Copilot cloud agent 超时复盘 |
| [postmortem-2026-Q2-issue-164.md](postmortem-2026-Q2-issue-164.md) | 专项 RCA | Claude Code Review 401 权限问题 |
| [postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md](postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md) | 问题闭环 | Repository Meta CI Markdown 断链 |
| [postmortem-2026-Q2-issue-202-205-k6-smoke.md](postmortem-2026-Q2-issue-202-205-k6-smoke.md) | 专项 RCA | k6 smoke baseline 启动稳健性（#202–#205） |
| [RCA-2026-05-26-PDEF-004-pr270-terraform-kms-gate.md](RCA-2026-05-26-PDEF-004-pr270-terraform-kms-gate.md) | 专项 RCA | PR #270 Terraform 安全门禁 AVD-AWS-0132 双失败闭环 |
| [postmortem-issue-68.md](postmortem-issue-68.md) | 问题闭环 | workaround 到期追踪机制缺失 |

## 2. 企业级归档与治理规则

### 2.1 文档分层

| 层级 | 适用场景 | 命名规范 | 最低要求 |
|------|----------|----------|----------|
| 季度复盘 | 一个季度内跨项目的 defect / issue 汇总 | `postmortem-<YYYY-QN>.md` | 统计、Top pattern、改进项追踪 |
| 专项 RCA | 单 issue / 单故障 / 单类问题复盘 | `postmortem-<YYYY-QN>-<topic>.md` 或 `postmortem-issue-<id>.md` | 时间线、根因、修复、验证、遗留风险 |
| 问题闭环 | 已修复事件的闭环沉淀 | 同上 | 明确“已完成 / 待观察”状态 |

### 2.2 维护规则

| 规则 | 说明 |
|------|------|
| 单一事实源 | backlog 状态以 GitHub Issue / PR / Workflow 当前状态为准，文档需同步刷新 |
| 季度更新 | 每个季度至少更新一次季度复盘；季度内发生重大事件时追加专项 RCA |
| 状态闭环 | 每篇 postmortem 必须明确 `已完成 / 待执行 / 待评估`，避免模糊 TODO |
| 导航可达 | 新文档写入本目录后，同时更新本 README 与必要的上级索引 |
| 可审计 | 对流程改进项标注来源 defect / issue，便于追溯投入产出 |

### 2.3 建议管理节奏

| 周期 | 动作 | 产出 |
|------|------|------|
| 每周 | 检查新增 RCA / postmortem 是否有未更新状态 | backlog 刷新 |
| 每个 sprint 结束 | 审核 `待执行` backlog，确认是否升级优先级 | sprint backlog |
| 每季度 | 汇总 closed / open issues，更新季度复盘 | `postmortem-<YYYY-QN>.md` |

## 3. 当前未完成 backlog 盘点

> 结论：Q1 改进 issue（#68 ~ #78）已全部闭环；当前剩余 backlog 主要来自 **Q2 运营跟踪项**，不再是历史 defect 修复遗漏。

| 优先级 | backlog | 来源文档 | 当前状态 | 建议动作 |
|--------|---------|----------|----------|----------|
| P1 | 观察 Copilot cloud agent 优化后 3~5 次实际 run 时长 | [postmortem-2026-Q2-copilot-cloud-agent-runtime.md](postmortem-2026-Q2-copilot-cloud-agent-runtime.md) | 待执行 | 合并到默认分支后记录耗时基线，确认是否仍长期 >5 分钟 |
| P1 | 若 Copilot run 仍长期 >5 分钟，继续拆分 prompt / task scope | [postmortem-2026-Q2-copilot-cloud-agent-runtime.md](postmortem-2026-Q2-copilot-cloud-agent-runtime.md) | 待执行 | 达到触发条件后立项优化，不满足条件则关闭 |
| P2 | 下次季度第三方 action 审计中加入 permissions 对照检查 | [postmortem-2026-Q2-issue-164.md](postmortem-2026-Q2-issue-164.md) | 待执行 | 纳入季度 audit checklist，避免再出现 401 权限问题 |
| P3 | 如 Copilot 优化后仍无改善，再评估 larger runner | [postmortem-2026-Q2-copilot-cloud-agent-runtime.md](postmortem-2026-Q2-copilot-cloud-agent-runtime.md) | 待评估 | 仅在前两项验证失败后进入架构评估 |

## 4. 优先级执行清单

- [ ] **P1**：完成 Copilot cloud agent 后续 3~5 次 run 的时长观察与记录
- [ ] **P1**：若观察结果仍长期 >5 分钟，拆分 prompt / task scope 并补一轮验证
- [ ] **P2**：在下一次季度 third-party action audit 中加入 permissions review 检查项
- [ ] **P3**：仅当 P1 优化无效时，再评估 larger runner / runner 升级

## 5. 使用规则

- 季度复盘统一使用 `postmortem-<YYYY-QN>.md`
- 单 issue / 单事件 RCA 统一归档在本目录
- 新增 postmortem 后，更新根目录 [docs/README.md](../../README.md)
