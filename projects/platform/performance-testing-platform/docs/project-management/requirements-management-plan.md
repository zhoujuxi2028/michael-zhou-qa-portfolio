# Requirements Management Plan

**项目:** Performance Testing Platform
**适用范围:** Phase 7 及后续所有 Phase（Phase 1~6 使用遗留命名，见 §5）
**参考标准:** ISO/IEC 25010, ASPICE SWE.1, IEEE 830

---

## 1. 需求编号规范

### 1.1 编号结构

```
PERF - [子系统] - [子模块] - FR - [序号]
  │        │          │       │      │
  │        │          │       │      └─ 3 位数字，从 001 起，同子模块内连续递增
  │        │          │       └──────── 需求类型（见 1.4）
  │        │          └──────────────── 子模块缩写（见 1.3）
  │        └─────────────────────────── 子系统缩写（见 1.2）
  └──────────────────────────────────── 系统标识：PERF（本项目固定）
```

**示例：**

```
PERF-API-ROUTE-FR-001     API 子系统，路由子模块，第 1 条功能需求
PERF-ENGINE-K6-FR-003     ENGINE 子系统，k6 子模块，第 3 条功能需求
PERF-OBS-ALERT-FR-001     OBS 子系统，告警子模块，第 1 条功能需求
PERF-CI-BL-FR-002         CI 子系统，基线子模块，第 2 条功能需求
```

---

### 1.2 子系统（4 个）

| 缩写     | 全称             | 职责                                             |
| -------- | ---------------- | ------------------------------------------------ |
| `API`    | Target API       | 被测 Express API（路由、中间件、数据库、工具层） |
| `ENGINE` | Load Test Engine | 负载测试执行引擎（k6 脚本、JMeter 脚本）         |
| `OBS`    | Observability    | 可观测性平台（Grafana 面板、告警）               |
| `CI`     | CI/CD Pipeline   | CI/CD 自动化（基线回归、覆盖率、调度）           |

---

### 1.3 子模块（11 个）

#### API 子系统

| 缩写    | 全称       | 内容                                                               |
| ------- | ---------- | ------------------------------------------------------------------ |
| `ROUTE` | Routes     | health / products / orders / auth 路由层                           |
| `MW`    | Middleware | JWT 认证（authenticate）、限流（rateLimiter）、指标采集（metrics） |
| `DB`    | Database   | SQLite 持久层、WAL 模式、Cluster 多进程模式                        |
| `UTIL`  | Utilities  | delay、leak-detection、baseline、env-loader 工具函数               |

#### ENGINE 子系统

| 缩写 | 全称   | 内容                                                                                     |
| ---- | ------ | ---------------------------------------------------------------------------------------- |
| `K6` | k6     | smoke / load / stress / spike / soak / capacity / breakpoint / rate-limit 脚本 + helpers |
| `JM` | JMeter | smoke / load / stress / spike JMX 脚本 + properties 配置                                 |

#### OBS 子系统

| 缩写    | 全称      | 内容                                                         |
| ------- | --------- | ------------------------------------------------------------ |
| `DASH`  | Dashboard | Grafana 面板（错误分布、延迟热力图、自定义指标、趋势折线图） |
| `ALERT` | Alert     | 告警规则（p95 / error rate 阈值）、webhook 通知配置          |

#### CI 子系统

| 缩写    | 全称     | 内容                                                            |
| ------- | -------- | --------------------------------------------------------------- |
| `BL`    | Baseline | 基线 JSON 存储、回归检测（>20% warning / >50% fail）、趋势报告  |
| `COV`   | Coverage | Jest 覆盖率门禁（≥80%）、coverage artifact 上传                 |
| `SCHED` | Schedule | GitHub Actions cron（nightly soak + weekly capacity）、自动归档 |

---

### 1.4 需求类型

| 缩写  | 全称                       | 说明                               |
| ----- | -------------------------- | ---------------------------------- |
| `FR`  | Functional Requirement     | 功能需求（系统应做什么）           |
| `NFR` | Non-Functional Requirement | 非功能需求（性能 / 安全 / 可靠性） |

> 本项目当前需求均为 `FR`。SLA 约束（p95 < 500ms，error rate < 1%）若单独成条时使用 `NFR`。

---

### 1.5 编号分配规则

1. 序号在**同一子模块内**连续递增，跨 Phase 不重置
2. 废弃的需求 ID **不复用**，标注 `[DEPRECATED]` 并注明替代 ID
3. 跨 Phase 补录的遗留需求，编号接续当前最大序号，不插入中间空缺
4. 需求 ID 一经写入 RTM，变更须同步三处（SRS → RTM → 测试用例），commit message 注明 `refactor(req): rename XXX → YYY`

---

## 2. 各 Phase 需求 ID 范围

| Phase | 子系统 | 子模块 | ID 范围   | 需求数 | 状态      |
| ----- | ------ | ------ | --------- | ------ | --------- |
| 1     | API    | ROUTE  | 001 ~ 006 | 6      | ✅ 已定义 |
| 1     | API    | MW     | 001       | 1      | ✅ 已定义 |
| 1     | API    | DB     | 001       | 1      | ✅ 已定义 |
| 1     | API    | UTIL   | 001       | 1      | ✅ 已定义 |
| 1     | ENGINE | K6     | 001 ~ 005 | 5      | ✅ 已定义 |
| 1     | ENGINE | JM     | 001 ~ 005 | 5      | ✅ 已定义 |
| 2     | API    | UTIL   | 002 ~ 007 | 6      | ✅ 已定义 |
| 2     | API    | DB     | 002 ~ 003 | 2      | ✅ 已定义 |
| 2     | ENGINE | K6     | 006 ~ 010 | 5      | ✅ 已定义 |
| 7     | CI     | BL     | 001 ~ 006 | 6      | ✅ 已定义 |
| 7     | CI     | COV    | 001 ~ 003 | 3      | ✅ 已定义 |
| 7     | CI     | SCHED  | 001 ~ 002 | 2      | ✅ 已定义 |
| 7     | OBS    | DASH   | 001 ~ 003 | 3      | ✅ 已定义 |
| 7     | OBS    | ALERT  | 001       | 1      | ✅ 已定义 |
| 7     | ENGINE | K6     | 011 ~ 017 | 7      | ✅ 已定义 |

> Phase 8+ 新增需求时在此表追加行。

### 2.1 遗留 ID 范围（Phase 3~6）

> 以下遗留 ID 不做回改，RTM 仍以遗留 ID 为准。「归属子系统（参考）」列仅供追溯参考，不代表已迁移至 PERF-SYS-MOD-FR-NNN 格式。

| Phase | 遗留前缀           | ID 范围                  | 需求数 | 归属子系统（参考）     | 状态    |
| ----- | ------------------ | ------------------------ | ------ | ---------------------- | ------- |
| 3     | AUTH-xx            | AUTH-01 ~ 06             | 6      | API（ROUTE + MW）      | ✅ 遗留 |
| 3     | AUTH-xx            | AUTH-07 ~ 11             | 5      | ENGINE（K6 + JM）      | ✅ 遗留 |
| 4     | SOAK-xx            | SOAK-01, 03              | 2      | API（UTIL）            | ✅ 遗留 |
| 4     | SOAK-xx            | SOAK-02, 04, 05, 08 ~ 10 | 6      | ENGINE（K6）           | ✅ 遗留 |
| 4     | SOAK-xx            | SOAK-06                  | 1      | OBS（DASH）            | ✅ 遗留 |
| 4     | SOAK-xx            | SOAK-07                  | 1      | OBS（ALERT）           | ✅ 遗留 |
| 5     | ENT-ENV-xx         | ENT-ENV-01 ~ 03          | 3      | ENGINE（K6 + JM）      | ✅ 遗留 |
| 5     | ENT-DATA-xx        | ENT-DATA-01 ~ 02         | 2      | ENGINE（K6）           | ✅ 遗留 |
| 5     | ENT-PROFILE-xx     | ENT-PROFILE-01 ~ 02      | 2      | ENGINE（K6）           | ✅ 遗留 |
| 5     | ENT-DX-xx          | ENT-DX-01 ~ 03           | 3      | 工具链（无对应子模块） | ✅ 遗留 |
| 5     | ENT-TEST-xx        | ENT-TEST-01 ~ 03         | 3      | ENGINE（K6）           | ✅ 遗留 |
| 6     | ENT-CONSISTENCY-xx | ENT-CONSISTENCY-01 ~ 05  | 5      | ENGINE（K6）           | ✅ 遗留 |
| 6     | ENT-BREAKPOINT-xx  | ENT-BREAKPOINT-01 ~ 02   | 2      | ENGINE（K6）           | ✅ 遗留 |
| 6     | ENT-RESILIENCE-xx  | ENT-RESILIENCE-01        | 1      | API（MW）              | ✅ 遗留 |
| 6     | ENT-RESILIENCE-xx  | ENT-RESILIENCE-02 ~ 03   | 2      | ENGINE（K6）           | ✅ 遗留 |
| 6     | ENT-REPORT-xx      | ENT-REPORT-01            | 1      | ENGINE（K6）           | ✅ 遗留 |

**各 Phase 遗留需求总数：** Phase 3 = 11 条 | Phase 4 = 10 条 | Phase 5 = 13 条 | Phase 6 = 11 条 | **合计 45 条**

---

## 3. 需求文档结构

```
docs/project-management/
├── requirements-management-plan.md    ← 本文件（编号规范 + 管理规则）
└── requirements/
    ├── phase7-cicd.md                 ← Phase 7 需求规格说明书（SRS）
    └── phase8-xxx.md                  ← 后续 Phase 照此模式新增
```

每份 SRS 文件的标准章节：

| 章节 | 内容                     |
| ---- | ------------------------ |
| §N.1 | 目标（Goal）             |
| §N.2 | 用户故事（User Stories） |
| §N.3 | 需求列表（按子模块分组） |
| §N.4 | Scope 确认（In / Out）   |
| §N.5 | 可行性评估               |
| §N.6 | 依赖识别                 |
| §N.7 | 需求 Checklist           |

---

## 4. 需求追溯

需求 ID 须在以下三处保持一致：

| 文档                               | 用途                 | 更新时机            |
| ---------------------------------- | -------------------- | ------------------- |
| `requirements/phaseN-xxx.md`       | 需求定义（权威来源） | 需求阶段（Stage 1） |
| `docs/qa/rtm.md`                   | 需求 → 测试用例追溯  | 设计阶段（Stage 2） |
| `docs/qa/test-cases/phaseN-xxx.md` | 测试用例详情         | 开发阶段（Stage 3） |

---

## 5. 遗留命名说明（Phase 1~6）

Phase 1~6 在引入本规范前使用了临时命名，不做回改，以 Git 历史为准：

| Phase | 使用的前缀                                                                      |
| ----- | ------------------------------------------------------------------------------- |
| 1     | `US-xx`、`UC-xx`                                                                |
| 2     | `SM-xx`、`CAP-xx`、`TQ-xx`                                                      |
| 3     | `AUTH-xx`                                                                       |
| 4     | `SOAK-xx`                                                                       |
| 5     | `ENT-ENV-xx`、`ENT-DATA-xx`、`ENT-PROFILE-xx`、`ENT-DX-xx`                      |
| 6     | `ENT-CONSISTENCY-xx`、`ENT-BREAKPOINT-xx`、`ENT-RESILIENCE-xx`、`ENT-REPORT-xx` |

**Phase 7 起统一使用** `PERF-[子系统]-[子模块]-FR-[序号]` 规范。

---

## 6. 变更记录

| 日期       | 变更内容                                                                                                                                                                                                                                          | 影响范围           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2026-04-16 | 初版：建立 4 子系统 / 11 子模块 / PERF-SYS-MOD-FR-NNN 编号体系                                                                                                                                                                                    | Phase 7 全部需求   |
| 2026-04-17 | §2 注册 Phase 1 ID 范围（API×4 子模块 + ENGINE×2 子模块，共 19 条）                                                                                                                                                                               | Phase 1 需求       |
| 2026-04-17 | §2 注册 Phase 2 ID 范围（API-UTIL 002~007 + API-DB 002~003 + ENGINE-K6 006~010，共 13 条）；修正 Phase 7 ENGINE-K6 从 001~007 → 011~017（与 Phase 1~2 序号冲突）                                                                                  | Phase 2 需求       |
| 2026-04-17 | §2.1 新增遗留 ID 范围注册：Phase 3（AUTH-01~11，11 条）、Phase 4（SOAK-01~10，10 条）、Phase 5（ENT-ENV/DATA/PROFILE/DX/TEST，13 条）、Phase 6（ENT-CONSISTENCY/BREAKPOINT/RESILIENCE/REPORT，11 条），合计 45 条；遗留 ID 不做回改，RTM 继续沿用 | Phase 3~6 遗留需求 |
