# 性能测试平台 — 文档导航

> 企业级文档结构，遵循 **architecture / design / project-management / qa / devops / guides** 六层分类。

## 目录结构

```
docs/
├── architecture/              # 系统架构与设计决策
│   ├── architecture.md        # 系统架构总览（SUT、Cluster、监控）
│   ├── design-decisions.md    # 架构设计决策记录 (ADR)
│   └── sut/                   # 被测系统 (SUT) 设计
│       ├── 01-architecture.md
│       ├── 02-database-schema.md
│       └── 03-api-overview.md
│
├── design/                    # 详细设计文档
│   ├── integration-test-design.md
│   ├── jmeter-dryrun-k6-smoke-design.md
│   └── phase7/                # Phase 7 CI/CD 设计
│
├── project-management/        # 项目管理
│   ├── requirements.md        # 需求总览
│   ├── requirements-management-plan.md
│   ├── risks.md               # 风险登记册
│   ├── requirements/          # 分阶段需求 (phase1~7)
│   ├── implementation-plans/  # 实施计划 (JMeter + phase2~7)
│   ├── phase6/                # Phase 6 归档（设计评审、迁移分析、PoC）
│   ├── issues/                # 问题跟踪
│   ├── postmortems/           # 事后分析
│   └── plans/                 # AI 辅助规划记录
│
├── qa/                        # 质量保证
│   ├── README.md              # QA 目录导航首页
│   ├── CHANGELOG.md           # QA 文档变更日志
│   ├── test-plan.md           # 测试计划
│   ├── rtm.md                 # 需求追溯矩阵 (RTM)
│   ├── gates/                 # Stage Gate 模板（含 stage4-template.md）
│   ├── defects/               # 缺陷与 Waiver 登记（统一收口至 register.md）
│   ├── test-cases/            # 测试用例（index + phase1~7 + 集成 + 性能目录）
│   ├── specs/                 # 测试规格
│   └── reports/               # 测试报告（execution/ rca/ investigations/ capacity/ checklists/ logs/ archive/）
│
├── devops/                    # CI/CD 与基础设施
│   ├── phase7-cicd-architecture.yml
│   ├── phase7-cicd-requirements.yml
│   └── phase7-risk-assessment.md
│
├── guides/                    # 使用指南
│   ├── performance-testing-parameters.md
│   └── 性能测试工程师_项目全生命周期工作职责.pdf
│
└── swagger.js                 # API 文档（src/app.js 依赖）
```

## 快速入口

| 场景             | 文档                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| 了解系统架构     | [architecture/architecture.md](architecture/architecture.md)                         |
| 查看设计决策     | [architecture/design-decisions.md](architecture/design-decisions.md)                 |
| 了解被测系统     | [architecture/sut/](architecture/sut/)                                               |
| 查看测试计划     | [qa/test-plan.md](qa/test-plan.md)                                                   |
| 查看测试用例统计 | [qa/test-cases/index.md](qa/test-cases/index.md)                                     |
| 需求追溯矩阵     | [qa/rtm.md](qa/rtm.md)                                                               |
| 查看需求文档     | [project-management/requirements.md](project-management/requirements.md)             |
| 查看风险清单     | [project-management/risks.md](project-management/risks.md)                           |
| 查看实施计划     | [project-management/implementation-plans/](project-management/implementation-plans/) |
| 性能测试参数指南 | [guides/performance-testing-parameters.md](guides/performance-testing-parameters.md) |

## 分类原则

| 目录                  | 定位           | 放什么                           | 不放什么             |
| --------------------- | -------------- | -------------------------------- | -------------------- |
| `architecture/`       | 系统是什么样的 | 架构图、ADR、SUT 设计            | 实施细节、阶段计划   |
| `design/`             | 怎么实现       | 详细设计、技术方案               | 架构级决策、测试用例 |
| `project-management/` | 项目管理       | 需求、计划、风险、问题、事后分析 | 测试结果、系统架构   |
| `qa/`                 | 质量保证       | 测试计划、用例、RTM、报告        | 需求定义、架构设计   |
| `devops/`             | 持续集成       | CI/CD 配置文档、流水线设计       | 功能设计、测试用例   |
| `guides/`             | 操作指南       | How-to、参数说明、培训材料       | 项目管理文档         |
