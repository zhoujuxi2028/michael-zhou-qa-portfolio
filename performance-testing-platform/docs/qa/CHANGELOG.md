# QA 文档变更日志 (QA Docs CHANGELOG)

> **范围:** 仅记录 `performance-testing-platform/docs/qa/` 目录下的**结构性变更**（新增/移动/删除/约定调整）。
> **格式:** 倒序（最新在上）。每条记录包含日期、动作、影响范围、操作人。
> **关联:** 业务级别变更（缺陷增减、用例新增）继续在各自登记表的"变更日志"区维护，不在此重复。

---

## 2026-04-27 — 缺陷登记 SSoT 合并

**操作人:** QA Lead

**目标:** 消除 `defects/register.md` 与 `defects/stage4-waiver-register.md` 双轨维护造成的数据重复与 ID 冲突风险（曾引发 DEF-005 / DEF-010 ID 冲突），对齐 SSoT 单一事实来源原则。

### 删除

| 路径                                    | 说明                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `defects/stage4-waiver-register.md`     | 与 `defects/register.md` 重复维护；历史 Stage 4 缺陷（DEF-001~004）与 WAV-001 已合并至 register.md |

### 调整

- `defects/register.md` 升级为唯一 active register，统一管理活跃 / 历史 / Waiver。
- 所有外部引用同步更新：`docs/qa/README.md`、`docs/qa/test-plan.md`、`gates/stage4-template.md`、`reports/execution/stage4-execution-2026-04-24.md`、`docs/README.md`、`docs/project-management/defect-tracking/README.md`。

---

## 2026-04-27 — P0 文档结构企业级标准化（第 1 批）

**操作人:** QA Lead

**目标:** 解决"顶层混入过程性文件 / `reports/` 平铺过载 / 缺乏导航首页"三类问题，对齐企业级 QA 文档规范。

### 新增

| 文件                          | 说明                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `README.md`                   | QA 目录导航首页：目录结构图 + 场景索引 + 关键约定                               |
| `CHANGELOG.md`                | 本文件 — QA 文档结构性变更日志                                                  |
| `reports/README.md`           | `reports/` 子目录命名约定与归档规则                                             |
| `reports/logs/README.md`      | CI 日志获取指引（日志不再入仓库，统一从 GitHub Actions Artifacts 获取）         |

### 移动

| 旧路径                                          | 新路径                                                  | 原因                       |
| ----------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `stage4-gate-template.md`                       | `gates/stage4-template.md`                              | Stage Gate 模板独立分组    |
| `stage4-defect-waiver-register.md`              | `defects/stage4-waiver-register.md`                     | 缺陷类资产统一收口         |
| `defect-register.md`                            | `defects/register.md`                                   | 缺陷类资产统一收口         |
| `reports/stage4-execution-2026-04-24.md`        | `reports/execution/stage4-execution-2026-04-24.md`      | 按报告类型分类（执行报告） |
| `reports/stage4-selftest-report.md`             | `reports/execution/stage4-selftest-report.md`           | 同上                       |
| `reports/phase6-stage4-verification-report.md`  | `reports/execution/phase6-stage4-verification-report.md`| 同上                       |
| `reports/test-execution-report-2026-04-05.md`   | `reports/execution/test-execution-report-2026-04-05.md` | 同上                       |
| `reports/issue-129-self-test-results.md`        | `reports/execution/issue-129-self-test-results.md`      | 同上                       |
| `reports/issue-129-self-verification-report.md` | `reports/execution/issue-129-self-verification-report.md` | 同上                     |
| `reports/rca-cluster-test-flakiness.md`         | `reports/rca/rca-cluster-test-flakiness.md`             | 按报告类型分类（RCA）      |
| `reports/rca-cluster-test-gap.md`               | `reports/rca/rca-cluster-test-gap.md`                   | 同上                       |
| `reports/rca-prettier-ci-failure.md`            | `reports/rca/rca-prettier-ci-failure.md`                | 同上                       |
| `reports/issue-114-116-resolution.md`           | `reports/investigations/issue-114-116-resolution.md`    | Issue 专项调查             |
| `reports/issue-135-implementation-analysis.md`  | `reports/investigations/issue-135-implementation-analysis.md` | 同上                  |
| `reports/capacity-report.md`                    | `reports/capacity/capacity-report.md`                   | 容量报告独立目录           |
| `reports/phase6-stage4-manual-checklist.md`     | `reports/checklists/phase6-stage4-manual-checklist.md`  | Checklist 独立目录         |
| `reports/stage5-closing-checklist.md`           | `reports/checklists/stage5-closing-checklist.md`        | 同上                       |

### 删除

| 路径                                       | 原因                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `reports/logs-2026-04-05/*.log` （5 个文件）| 已被 `.gitignore` 规则 `docs/qa/reports/logs-*/` 覆盖；日志统一走 GitHub Actions Artifacts，详见 `reports/logs/README.md` |

### 同步更新引用

- `performance-testing-platform/docs/README.md`：QA 目录树
- `performance-testing-platform/docs/qa/test-plan.md`：Stage 4 模板 / Defect Register 链接
- 上述 3 个被移动的文档自身的相对链接（互引、回链 `test-plan.md`）
- `reports/execution/stage4-execution-2026-04-24.md`：模板/缺陷登记/测试计划链接
- `reports/rca/rca-cluster-test-flakiness.md`：相对路径上溯一级
- `reports/capacity/capacity-report.md`：相对路径上溯一级
- `performance-testing-platform/scripts/p0-gate-check.sh`、`scripts/p1-gate-check.sh`：注释中的模板路径
- `performance-testing-platform/docs/project-management/postmortems/*`：引用路径文本
- `docs/project-management/defect-tracking/README.md`：portfolio 入口表

---

## 历史变更

> 2026-04-27 之前的 QA 文档变更分散在各文档的"变更日志"区。本 CHANGELOG 仅自结构性重构起记录。
