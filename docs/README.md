# Portfolio 文档导航

> 根目录 `docs/` 采用企业级归档规则：**根层只保留治理类核心文档，业务沉淀统一进入分类目录**。

## 目录结构

```text
docs/
├── README.md                           # 文档导航与归档规则
├── ARCHITECTURE.md                     # 文档治理规范（SSOT）
├── QUALITY-METRICS.md                  # KPI 质量度量看板（每周更新）
├── SLA.md                              # 服务级别协议（缺陷/文档/CI/CD）
├── INCIDENT-ESCALATION.md             # 事故升级矩阵（P0-P3）
├── dev-process-checklist.md           # 5 阶段开发流程
├── GIT-COMMIT-CONVENTION.md           # 提交规范
├── plan-template.md                    # 计划模板
├── process/                            # 操作指南、环境搭建、最佳实践
├── project-management/                 # 项目管理归档
│   ├── defect-tracking/                # Portfolio 缺陷/Waiver 跟踪系统（SSOT）
│   ├── postmortems/                    # Postmortem / RCA
│   └── lessons-learned/               # 阶段性经验总结
├── reports/                            # 实施总结、验证记录、专项报告
├── requirements/                       # 需求追踪矩阵（RTM）
├── learning/                           # 学习模块、阶段文档
│   └── phase2/                         # Phase 2 模块（M4-M6）
└── design/                             # AI 辅助 specs / plans
```

## 快速入口

| 场景 | 文档 |
|------|------|
| 查看文档治理规范 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 查看质量 KPI 看板 | [QUALITY-METRICS.md](QUALITY-METRICS.md) |
| 查看服务级别协议 | [SLA.md](SLA.md) |
| 查看事故升级矩阵 | [INCIDENT-ESCALATION.md](INCIDENT-ESCALATION.md) |
| 查看 5 阶段开发流程 | [dev-process-checklist.md](dev-process-checklist.md) |
| 查看提交规范 | [GIT-COMMIT-CONVENTION.md](GIT-COMMIT-CONVENTION.md) |
| 查看计划模板 | [plan-template.md](plan-template.md) |
| 查看环境/操作指南 | [process/](process/) |
| 查看统一质量门禁基线 | [process/portfolio-quality-gate-baseline.md](process/portfolio-quality-gate-baseline.md) |
| 查看测试数据与环境标准 | [process/test-data-environment-standard.md](process/test-data-environment-standard.md) |
| 查看 GitHub Labels 策略 | [process/label-strategy.md](process/label-strategy.md) |
| **查看 Portfolio 缺陷跟踪系统** | **[project-management/defect-tracking/](project-management/defect-tracking/)** |
| 查看 Portfolio 级 postmortem | [project-management/postmortems/](project-management/postmortems/) |
| 查看阶段性经验总结 | [project-management/lessons-learned/](project-management/lessons-learned/) |
| 查看需求追踪矩阵 | [requirements/RTM.md](requirements/RTM.md) |
| 查看专项报告与实施总结 | [reports/](reports/) |
| 查看学习资料 | [learning/](learning/) |
| 查看 AI 辅助 specs | [design/specs/](design/specs/) |

## 最近新增

- [project-management/defect-tracking/](project-management/defect-tracking/) — Portfolio 级"文档化的问题/缺陷跟踪系统"（v1.0，2026-04-25）
- [process/portfolio-quality-gate-baseline.md](process/portfolio-quality-gate-baseline.md) — 统一质量门禁与治理基线（v1.0，2026-05-25）
- [process/test-data-environment-standard.md](process/test-data-environment-standard.md) — 测试数据与环境一致性标准（v1.0，2026-05-25）
- [project-management/defect-tracking/flaky-register.md](project-management/defect-tracking/flaky-register.md) — Flaky 分级与治理登记表
- [project-management/defect-tracking/dependency-risk-sla.md](project-management/defect-tracking/dependency-risk-sla.md) — 依赖风险修复 SLA
- [process/copilot-cloud-agent-ci-architecture.md](process/copilot-cloud-agent-ci-architecture.md) — Copilot cloud agent CI 架构说明
- [design/specs/2026-04-23-copilot-cloud-agent-ci-optimization-design.md](design/specs/2026-04-23-copilot-cloud-agent-ci-optimization-design.md) — Copilot cloud agent CI 优化设计
- [reports/RCA-copilot-cloud-agent-runtime.md](reports/RCA-copilot-cloud-agent-runtime.md) — Copilot cloud agent 耗时 RCA
- [project-management/postmortems/postmortem-2026-Q2-copilot-cloud-agent-runtime.md](project-management/postmortems/postmortem-2026-Q2-copilot-cloud-agent-runtime.md) — Copilot cloud agent 复盘
- [RCA-187-repo-meta-broken-markdown-link.md](reports/RCA-187-repo-meta-broken-markdown-link.md) — Repository Meta CI Markdown 断链 RCA
- [postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md](project-management/postmortems/postmortem-2026-Q2-issue-187-repo-meta-broken-markdown-link.md) — 本次 CI 故障复盘

## 分类原则

| 目录 | 定位 | 放什么 | 不放什么 |
|------|------|--------|---------|
| 根层 `docs/` | 治理层 | 导航、规范、模板、统一流程 | 事后分析、环境笔记、专项报告 |
| `process/` | 操作层 | SOP、环境搭建、最佳实践、排障指南 | RCA、阶段总结 |
| `project-management/` | 管理层 | 需求、计划、问题、postmortem、风险 | 操作手册、学习笔记 |
| `reports/` | 输出层 | 实施总结、验证记录、专项审计报告 | 流程规范、长期制度文件 |
| `learning/` | 学习层 | 模块、阶段文档、学习记录 | 项目运行指南 |
| `design/` | AI 资产层 | specs、plans、辅助设计稿 | 正式项目规范 |

## 归档规则

1. **根层零堆积**：新增归档类文档时，优先放入子目录，不直接落在 `docs/` 根层。
2. **单一来源**：同一主题只保留一个权威文件，其他位置只做链接。
3. **目录先行**：新增文档时，先判断属于 `process / project-management / reports / learning / design` 哪一层。
4. **导航同步**：新增目录或迁移文档后，必须同步更新本文件或对应目录导航。
5. **命名统一**：遵循 `ARCHITECTURE.md` 中的命名规则，避免临时命名和语义模糊。
