# QA 文档导航 (QA Documentation Index)

> **项目:** Performance Testing Platform
> **维护人:** QA Lead
> **最近更新:** 2026-04-27（P0 文档结构优化）

---

## 1. 目录结构

```
docs/qa/
├── README.md                    # 本文件 — 整个 QA 体系入口
├── CHANGELOG.md                 # QA 文档变更日志
├── test-plan.md                 # 测试计划（范围/策略/资源/进出准则）
├── rtm.md                       # 需求追溯矩阵 (RTM)
│
├── test-cases/                  # 测试用例（按 phase 索引 + ID 规范）
│   ├── index.md                 #   ─ 总索引（按 phase 汇总通过率）
│   ├── ID-CONVENTION.md         #   ─ 用例 ID 编码规范
│   ├── PERF-TEST-CATALOG.md     #   ─ 性能用例目录
│   ├── integration-test-cases.md
│   ├── jmeter-dryrun-k6-smoke-test-cases.md
│   ├── auth-comparison-report.md
│   └── phase{1..7}-*.md         #   ─ 各 phase 用例规格
│
├── specs/                       # 测试规格（架构/功能 spec）
│   ├── stage4-verify-architecture.md
│   └── stage4-verify-functional-spec.md
│
├── gates/                       # Stage Gate 模板与执行规则
│   └── stage4-template.md       #   ─ Stage 4 验收 Gate 模板（决策矩阵）
│
├── defects/                     # 缺陷与 Waiver 登记
│   ├── register.md              #   ─ 项目级活跃缺陷登记表（DEF-***）
│   └── stage4-waiver-register.md#   ─ Stage 4 缺陷/Waiver 历史快照
│
└── reports/                     # 测试报告（按类型分类）
    ├── README.md                #   ─ 报告命名约定与目录说明
    ├── execution/               #   ─ 验收/执行报告（含 stage4-execution-*）
    ├── rca/                     #   ─ 根因分析（rca-*）
    ├── investigations/          #   ─ Issue 专项调查（issue-***-*）
    ├── capacity/                #   ─ 容量测试报告
    ├── checklists/              #   ─ 验收/收尾 checklist
    ├── logs/                    #   ─ CI 日志说明（实际日志走 GitHub Actions Artifacts）
    └── archive/                 #   ─ 已归档的历史过程文件
```

---

## 2. 按场景快速入口

| 场景                              | 文档                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- |
| 第一次接触本项目，想了解 QA 全貌  | [test-plan.md](test-plan.md)                                           |
| 想知道某条需求是否有用例覆盖      | [rtm.md](rtm.md)                                                       |
| 想看所有用例和当前通过率          | [test-cases/index.md](test-cases/index.md)                             |
| 准备进行 Stage 4 验收             | [gates/stage4-template.md](gates/stage4-template.md)                   |
| 想知道当前活跃缺陷                | [defects/register.md](defects/register.md)                             |
| 查阅 Stage 4 历史缺陷与 waiver    | [defects/stage4-waiver-register.md](defects/stage4-waiver-register.md) |
| 查阅最近一次 Stage 4 执行结果     | [reports/execution/](reports/execution/)                               |
| 查阅根因分析（RCA）记录           | [reports/rca/](reports/rca/)                                           |
| 写新报告时如何命名 / 放哪个目录   | [reports/README.md](reports/README.md)                                 |
| 查询 CI 日志                      | [reports/logs/README.md](reports/logs/README.md)                       |

---

## 3. 关键约定

| 约定               | 说明                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **用例 ID**        | `<DOMAIN>-<MODULE>-<TYPE>-<NNN>`，详见 [test-cases/ID-CONVENTION.md](test-cases/ID-CONVENTION.md)            |
| **缺陷 ID**        | `DEF-<NNN>`，全项目唯一；登记规则见 [defects/register.md](defects/register.md)                               |
| **Waiver ID**      | `WAV-<NNN>`，仅适用于 P1（非核心）/ P2 / P3；P0 不得 waiver                                                  |
| **Stage Gate**     | PASS / BLOCKED / PENDING / WAIVED 四态，见 [gates/stage4-template.md](gates/stage4-template.md)             |
| **覆盖率门禁**     | stmt ≥ 80%, branch ≥ 70%, func ≥ 80%, line ≥ 80%（详见 [test-cases/index.md](test-cases/index.md) §2）      |
| **报告命名**       | `<type>-<scope>-<date|id>.md`（详见 [reports/README.md](reports/README.md)）                                 |
| **CI 日志**        | 不入仓库；通过 GitHub Actions Artifacts 获取，参考 [reports/logs/README.md](reports/logs/README.md)          |

---

## 4. 上游/下游文档

| 类型     | 入口                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| 项目说明 | [../../README.md](../../README.md)                                                                         |
| 文档总览 | [../README.md](../README.md)                                                                               |
| 架构设计 | [../architecture/architecture.md](../architecture/architecture.md)                                         |
| 项目管理 | [../project-management/](../project-management/)                                                           |
| Portfolio 缺陷登记 | [../../../docs/project-management/defect-tracking/README.md](../../../docs/project-management/defect-tracking/README.md) |

---

## 5. 文档变更追溯

任何对本目录的结构性变更（新增/移动/删除）必须同步登记到 [CHANGELOG.md](CHANGELOG.md)。
