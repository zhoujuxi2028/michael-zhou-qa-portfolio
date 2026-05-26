# 质量度量看板（Quality Metrics Dashboard）

> **维护周期**: 每周更新（建议每周一）  
> **数据来源**: [defect-register.md](project-management/defect-tracking/defect-register.md) | [postmortems/](project-management/postmortems/) | CI/CD 运行记录  
> **权威性**: 本文是 KPI 度量的唯一来源（SSOT）

---

## 当前状态总览（2026-Q2）

| 指标 | 目标 | 当前值 | 状态 |
|------|------|--------|------|
| Portfolio 级 P0/P1 活跃缺陷 | 0 | 0 | 🟢 达标 |
| Portfolio 级 P2 活跃缺陷 | ≤ 2 | 0 | 🟢 达标 |
| Stage Gate 通过率（本季度） | ≥ 90% | 待统计 | ⬜ |
| Postmortem 按时提交率 | ≥ 95% | 100% (3/3) | 🟢 达标 |
| 需求覆盖率（RTM） | ≥ 80% | 67% (16/24) | 🔴 未达标 |
| CI Pipeline 平均构建时间 | < 10 min | 待统计 | ⬜ |

---

## 1. 缺陷指标（Defect Metrics）

### 1.1 Portfolio 级缺陷历史

| 季度 | 新增 | 关闭 | 平均修复时间（MTTR） | P0/P1 数 | P2/P3 数 |
|------|------|------|----------------------|----------|----------|
| 2026-Q1 | 0 | 0 | — | 0 | 0 |
| 2026-Q2 | 3 | 3 | < 1 天 | 0 | 3 (全为 P2) |

**已关闭缺陷详情（2026-Q2）：**

| Defect ID | 严重度 | 发现日期 | 关闭日期 | MTTR | 根因类型 |
|-----------|--------|----------|----------|------|----------|
| PDEF-001 | P2 | 2026-05-23 | 2026-05-23 | < 1h | 文档链接路径错误 |
| PDEF-002 | P2 | 2026-05-24 | 2026-05-24 | < 2h | CI working-directory 配置错误 |
| PDEF-003 | P2 | 2026-05-25 | 2026-05-25 | < 4h | Commit subject 长度规范违规 |

### 1.2 项目级缺陷汇总

| 项目 | 活跃缺陷数 | P0/P1 数 | 最近更新 |
|------|-----------|----------|----------|
| performance-testing-platform | 9 | 0 | 2026-05-25 |
| security-testing-demo | 1 | 0 | 2026-05-17 |
| 其他项目 | — | — | 按需初始化 |

---

## 2. Postmortem 指标

### SLA 目标：5 个工作日内提交（见 [SLA.md](SLA.md)）

| 季度 | Postmortem 总数 | 按时提交 | 超时 | 按时率 |
|------|----------------|----------|------|--------|
| 2026-Q1 | 1 | 1 | 0 | 100% |
| 2026-Q2 | 8 | 8 | 0 | 100% 🟢 |

**2026-Q2 Postmortem 列表：**

| 文档 | 关联事件 | 提交周期 |
|------|----------|----------|
| postmortem-2026-Q2.md | Q2 综合 | 季度内 |
| RCA-2026-05-23-PDEF-001 | 断链 CI 失败 | 当天 |
| RCA-2026-05-24-PDEF-002 | working-directory 错误 | 当天 |
| RCA-2026-05-25-PDEF-003 | commit subject 超长 | 当天 |
| postmortem-2026-Q2-copilot-cloud-agent-runtime.md | Copilot 超时 | 当周 |
| postmortem-2026-Q2-issue-164.md | Issue #164 | 当周 |
| postmortem-2026-Q2-issue-185.md | Claude review #401 | 当周 |
| postmortem-2026-Q2-pr-184.md | PR #184 格式检查 | 当周 |

---

## 3. 需求覆盖率（RTM Metrics）

> 详细需求列表见 [requirements/RTM.md](requirements/RTM.md)

| 类别 | 总数 | 已实现 | 部分实现 | 未实现 | 覆盖率 |
|------|------|--------|----------|--------|--------|
| 功能需求（FR） | 16 | 12 | 2 | 2 | 75% |
| 非功能需求（NFR） | 8 | 4 | 0 | 4 | 50% |
| **合计** | **24** | **16** | **2** | **6** | **67%** 🔴 |

**未实现需求（高优先级）：**

| 需求 ID | 描述 | 优先级 |
|---------|------|--------|
| FR-CICD | PR→Deploy 完整 pipeline | 🔴 高 |
| NFR-OBS | 日志聚合 + 分布式追踪 | 🟡 中 |
| NFR-DR | 灾难恢复流程 | 🟡 中 |

---

## 4. CI/CD 指标

> 数据来源：GitHub Actions 运行记录

| 指标 | 目标 | 说明 |
|------|------|------|
| Pipeline 可用性 | ≥ 99% | 非计划停机时间占比 |
| PR Gate 通过率（首次） | ≥ 80% | 不含本地修复后重推 |
| 平均构建时间 | < 10 min | 从 push 到 gate 完成 |
| 安全扫描覆盖率 | 100% | 每个 PR 必须通过 trivy + npm audit |

> ⚠️ 实测数据待统计：计划在 2026-Q3 接入 CI 运行日志分析，自动填充此表。

---

## 5. 代码审查指标

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| PR 有代码审查覆盖率 | 100% | Claude Code Review 已集成 |
| 平均 review turnaround | < 24h | 待统计 |
| Review 发现问题转 defect 率 | 追踪中 | 待统计 |

---

## 6. 更新记录

| 日期 | 更新内容 | 操作人 |
|------|----------|--------|
| 2026-05-25 | 初始建表，填入 Q2 缺陷和 Postmortem 数据 | QA |

---

## 相关文件

- [SLA.md](SLA.md) — 各流程服务级别协议
- [INCIDENT-ESCALATION.md](INCIDENT-ESCALATION.md) — 事故升级矩阵
- [project-management/defect-tracking/defect-register.md](project-management/defect-tracking/defect-register.md) — 缺陷数据来源
- [requirements/RTM.md](requirements/RTM.md) — 需求追踪矩阵
