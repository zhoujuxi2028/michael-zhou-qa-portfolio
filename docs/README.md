# Portfolio 文档导航

> 根目录 `docs/` 采用企业级归档规则：**根层只保留治理类核心文档，业务沉淀统一进入分类目录**。

## 目录结构

```text
docs/
├── README.md                       # 文档导航与归档规则
├── ARCHITECTURE.md                 # 文档治理规范（SSOT）
├── dev-process-checklist.md        # 5 阶段开发流程
├── GIT-COMMIT-CONVENTION.md        # 提交规范
├── plan-template.md                # 计划模板
├── M4-LEARNING-COMPLETION.md       # 重点学习总结（保留根层入口）
├── guides/                         # 操作指南、环境搭建、最佳实践
├── project-management/             # 项目管理归档
│   └── postmortems/                # Postmortem / RCA
├── reports/                        # 实施总结、验证记录、专项报告
├── learning/                       # 学习模块、阶段文档
└── superpowers/                    # AI 辅助 specs / plans
```

## 快速入口

| 场景 | 文档 |
|------|------|
| 查看文档治理规范 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 查看 5 阶段开发流程 | [dev-process-checklist.md](dev-process-checklist.md) |
| 查看提交规范 | [GIT-COMMIT-CONVENTION.md](GIT-COMMIT-CONVENTION.md) |
| 查看计划模板 | [plan-template.md](plan-template.md) |
| 查看环境/操作指南 | [guides/](guides/) |
| 查看 GitHub Labels 策略 | [guides/label-strategy.md](guides/label-strategy.md) |
| 查看 Portfolio 级 postmortem | [project-management/postmortems/](project-management/postmortems/) |
| 查看专项报告与实施总结 | [reports/](reports/) |
| 查看学习资料 | [learning/](learning/) |
| 查看 AI 辅助 specs | [superpowers/specs/](superpowers/specs/) |

## 分类原则

| 目录 | 定位 | 放什么 | 不放什么 |
|------|------|--------|---------|
| 根层 `docs/` | 治理层 | 导航、规范、模板、统一流程 | 事后分析、环境笔记、专项报告 |
| `guides/` | 操作层 | SOP、环境搭建、最佳实践、排障指南 | RCA、阶段总结 |
| `project-management/` | 管理层 | 需求、计划、问题、postmortem、风险 | 操作手册、学习笔记 |
| `reports/` | 输出层 | 实施总结、验证记录、专项审计报告 | 流程规范、长期制度文件 |
| `learning/` | 学习层 | 模块、阶段文档、学习记录 | 项目运行指南 |
| `superpowers/` | AI 资产层 | specs、plans、辅助设计稿 | 正式项目规范 |

## 归档规则

1. **根层零堆积**：新增归档类文档时，优先放入子目录，不直接落在 `docs/` 根层。
2. **单一来源**：同一主题只保留一个权威文件，其他位置只做链接。
3. **目录先行**：新增文档时，先判断属于 `guides / project-management / reports / learning / superpowers` 哪一层。
4. **导航同步**：新增目录或迁移文档后，必须同步更新本文件或对应目录导航。
5. **命名统一**：遵循 `ARCHITECTURE.md` 中的命名规则，避免临时命名和语义模糊。
