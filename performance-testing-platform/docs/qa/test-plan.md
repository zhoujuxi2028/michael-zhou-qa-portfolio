# 测试计划 (Test Plan)

**项目:** Performance Testing Platform
**版本:** Phase 1~7
**日期:** 2026-04-17 (Phase 7 更新)

> **说明:** 本文档同时覆盖已落地测试资产与 Phase 7 设计阶段新增门禁。凡 workflow / 脚本尚未落地的内容，明确标注为“设计目标”，不冒充当前实现事实。

---

## 1. 测试范围

### 1.1 范围内 (In Scope)

| Phase | 功能模块                | 测试重点                                                          |
| ----- | ----------------------- | ----------------------------------------------------------------- |
| 1     | k6 + JMeter 双引擎      | smoke/load/stress/spike 四种负载模式、HTML 报告、CI 门禁          |
| 2     | 系统指标采集 + 容量测试 | /metrics 端点、CSV 采集器、Cluster 模式、二分法容量定位           |
| 3     | JWT 认证                | 注册/登录/刷新/登出、中间件鉴权、高并发认证压测                   |
| 4     | Soak Test + 可观测性    | 长时间运行稳定性、内存泄漏检测、Grafana 告警                      |
| 5     | 基础设施 Helper         | env-loader、csv-loader、profile-parser、k6 脚本改造               |
| 6     | 测试能力扩展            | k6 helpers 统一、breakpoint 崩溃测试、API 限流/熔断、执行摘要报告 |
| 7     | CI/CD + 可观测性        | 性能基线回归、覆盖率门禁、Grafana 面板+告警、定时调度             |

### 1.2 范围外 (Out of Scope)
- 第三方服务可用性 (InfluxDB/Grafana 自身 Bug)
- 跨项目端口冲突排查

---

## 2. 测试类型与职责

| 类型     | 工具                  | 用例数  | 职责                                                                                                                   | 执行方式                           |
| -------- | --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 单元测试 | Jest + Supertest      | 217     | API 功能正确性、helpers 解析逻辑、中间件行为、baseline 判定、k6 补完能力                                              | `npm test` / `npx jest tests/unit/` |
| 集成测试 | Shell + curl + Docker | 60      | 端到端链路验证 (k6→InfluxDB→Grafana、认证流程、k6 helpers、限流中间件、摘要报告、Grafana 集成)                        | `bash scripts/integration-test.sh` |
| 性能测试 | k6 + JMeter           | 33      | 延迟/吞吐/错误率、SLA 达标、瓶颈定位、长时间稳定性                                                                     | npm scripts 手动触发               |
| 其他     | 手动验证              | 47      | 报告完整性、脚本行为、CI/Grafana/调度设计验证                                                                          | 人工检查                           |
| **合计** |                       | **357** |                                                                                                                        |                                    |

---

## 2.1 集成测试策略 (Integration Test Strategy)

> **详细设计文档:** [集成测试设计文档](../design/integration-test-design.md) |
> **详细用例:** [集成测试用例详细文档](test-cases/integration-test-cases.md)

### 2.1.1 集成测试目标

| 目标 | 说明 |
|------|------|
| **模块协同验证** | 验证 API 路由、数据库、中间件、认证模块之间的交互 |
| **数据流完整性** | 确认请求从入口到数据库再到响应的完整链路 |
| **业务规则跨模块执行** | 验证库存扣减、Token 黑名单、限额共享等跨模块业务逻辑 |
| **基础设施链路验证** | 确认 k6→InfluxDB→Grafana 的数据采集和可视化链路 |
| **安全防护集成** | 验证 Helmet + 限流器 + JWT 认证的协同安全效果 |

### 2.1.2 双执行引擎

集成测试采用双执行引擎架构：

| 引擎 | 框架 | 文件数 | 用例数 | 适用场景 | 执行命令 |
|------|------|--------|--------|---------|---------|
| **Jest Runner** | Jest + Supertest | 12 | 61 | 进程内 API 交互、中间件、工具函数 | `npm run test:integration` |
| **Shell Runner** | Bash + curl + Docker | 3 | ~40 | 外部进程编排（Docker/k6/JMeter） | `bash scripts/integration-test.sh` |

**选型决策：**
- **Jest Runner**：利用 Supertest 直接调用 Express app（无真实 HTTP），内存 SQLite 保证隔离性，适合快速反馈
- **Shell Runner**：编排多进程工作流（API 服务 + Docker 容器 + k6/JMeter 进程），适合真实环境集成

### 2.1.3 集成测试分层

```
                      集成测试分层结构
┌─────────────────────────────────────────────────────┐
│ Layer 4: 基础设施集成 (Shell Runner)                  │
│   Grafana / InfluxDB / k6 / JMeter 联动             │
├─────────────────────────────────────────────────────┤
│ Layer 3: 横切关注点 (Jest)                            │
│   认证保护路由 / 错误处理统一 / 并发访问安全          │
├─────────────────────────────────────────────────────┤
│ Layer 2: 中间件集成 (Jest)                            │
│   限流器行为 / 安全头验证                             │
├─────────────────────────────────────────────────────┤
│ Layer 1: API 模块交互 (Jest)                          │
│   Products / Orders / Auth / Health & Metrics         │
└─────────────────────────────────────────────────────┘
```

### 2.1.4 隔离策略

| 策略 | Jest Runner | Shell Runner |
|------|-------------|-------------|
| **数据库** | SQLite `:memory:`，每次 beforeEach 重建 | 文件模式 SQLite，测试前后清理 |
| **HTTP** | Supertest 进程内调用（无真实端口） | 真实 HTTP（端口 3000） |
| **外部服务** | 无外部依赖 | Docker Compose (InfluxDB/Grafana) |
| **环境变量** | `jest.resetModules()` 实现模块重载 | Bash `export` / 子 shell 隔离 |
| **并发控制** | Jest 并行 + 文件内串行 | `lock.sh` 互斥锁（全局唯一执行） |

### 2.1.5 环境要求

| 环境 | Jest Runner | Shell Runner |
|------|-------------|-------------|
| **Node.js** | ≥ 18 ✅ 必须 | ≥ 18 ✅ 必须 |
| **Docker** | ❌ 不需要 | ✅ 必须（≥ 24） |
| **k6** | ❌ 不需要 | ✅ 需要（≥ 0.50） |
| **端口 3000** | ❌ 不占用 | ✅ 占用 |
| **端口 3010/8086** | ❌ 不需要 | ✅ Grafana/InfluxDB |

### 2.1.6 集成测试执行顺序

```
Step 1: Jest Runner（~30s，无外部依赖）
  npm run test:integration
  ├── API 层 (27 用例)
  ├── 横切关注点 (13 用例)
  ├── 中间件 (9 用例)
  └── 工具函数 (12 用例)

Step 2: Shell Runner（~10 min，需 Docker）
  bash scripts/integration-test.sh
  ├── Phase 1: Grafana + InfluxDB
  ├── Phase 2: 系统指标 + Cluster
  ├── Phase 3: 认证流程
  ├── Phase 4: Soak 可观测性
  ├── Phase 5: k6 Helpers
  ├── Phase 6: Rate Limiter + 摘要
  └── Phase 7: CI/CD 集成
```

### 2.1.7 失败处理策略

| 失败类型 | 影响评估 | 处理方式 |
|---------|---------|---------|
| **Jest 用例失败** | P1 用例阻塞发布 | 修复后重跑 `npx jest <failed-file>` |
| **Shell 阶段失败** | 检查是否环境问题 | 查看日志 → 修复 → `bash scripts/integration-test.sh` |
| **Docker 启动失败** | Shell Runner 不可用 | `docker ps` 排查 → 重启 Docker → 重试 |
| **端口冲突** | Shell Runner 阻塞 | `lsof -ti:3000 \| xargs kill` → 重试 |
| **互斥锁残留** | Shell Runner 无法获取锁 | `rm -rf /tmp/integration-test.lock` → 重试 |

---

## 3. 执行优先级

### P0 — 必须通过 (阻塞发布)

| 检查项         | 命令                     | 通过标准                                         |
| -------------- | ------------------------ | ------------------------------------------------ |
| 单元测试       | `npm test`               | 全部 Jest 单元测试通过，且覆盖率阈值满足项目标准 |
| Lint           | `npx eslint .`           | 0 errors                                         |
| 格式检查       | `npm run format:check`   | 0 warnings（Prettier 独立于 ESLint，需分别检查） |
| 覆盖率         | `npm test -- --coverage` | stmt ≥ 80%, branch ≥ 70%, func ≥ 80%, line ≥ 80% |
| JMeter dry-run | `npm run jmeter:dryrun`  | 0 errors, 字段名/状态码正确                      |

> **ISS-015 教训**: ESLint 和 Prettier 是独立的代码质量工具。ESLint 通过不代表 Prettier 通过。两者需分别验证。

### P1 — 应该通过 (强烈建议)

| 检查项       | 命令                               | 通过标准                                  |
| ------------ | ---------------------------------- | ----------------------------------------- |
| 集成测试     | `bash scripts/integration-test.sh` | Stage 3 只验证 SUT 单元测试与 SUT 集成测试范围，不包含 soak / 其他性能验收项 |
| k6 smoke     | `npm run k6:smoke`                 | p95 < 500ms, error < 1%                   |
| JMeter smoke | `npm run jmeter:smoke`             | error < 1%                                |
| CI 流水线    | push → GitHub Actions              | 6 jobs 全绿（lint + unit-test + k6 + jmeter + baseline + trend） |

### P2 — 建议执行 (发布前完成)

| 检查项             | 命令                                   | 通过标准               |
| ------------------ | -------------------------------------- | ---------------------- |
| CI 报红验证        | 故意让测试失败                         | CI 能正确检测到失败    |
| CI workaround 复验 | 移除 `continue-on-error` / `\|\| true` | 真实结果 0 failures    |
| 性能基线           | load/stress/spike 各跑一轮             | 结果记录到 reports/    |
| Soak 短时          | `npm run k6:soak:short`                | 10 min heap < 50% 增长 |

### 阶段边界说明

| 阶段 | 关注点 | 包含内容 | 不包含内容 |
| ---- | ------ | -------- | ---------- |
| Stage 3（开发阶段） | 开发自测 | SUT 单元测试、SUT 集成测试 | soak / load / stress / spike 等性能验收 |
| Stage 4（验收阶段） | 验收验证 | SUT 性能测试（含 smoke / load / stress / spike / soak） | 与本项目无关的部署/回滚门禁 |

### 执行顺序

```
P0 (本地快速反馈，~2 min)
  → P1 (集成 + 性能 smoke，~10 min)
    → P2 (CI + 完整性能，~30 min+)
```

---

## 4. 进入/退出标准

### 4.1 进入标准 (Entry Criteria)

| 条件                           | 验证方式                                          |
| ------------------------------ | ------------------------------------------------- |
| 开发阶段所有 Task 已 commit    | `git log` 确认                                    |
| 开发阶段自测已执行             | commit history 中有测试证据                       |
| 风险清单已更新                 | `docs/project-management/risks.md` 已同步         |
| 依赖已安装                     | `npm install` 无 error                            |
| **Stage 4 专用：环境检测通过** | `bash scripts/preflight-check.sh --stage4` exit 0 |

### 4.2 退出标准 (Exit Criteria)

| 条件                    | 验证方式                           |
| ----------------------- | ---------------------------------- |
| P0 全部通过             | npm test + lint + format:check + coverage 输出 |
| P1 全部通过             | integration-test.sh 输出 + CI 截图 |
| 无 P0/P1 级别未修复 Bug | Bug 列表清零或降级为 P2            |
| 测试报告已归档          | `reports/` 目录、`coverage/` 目录  |

---

## 5. 环境要求

| 工具    | 版本   | 用途               | 验证命令            |
| ------- | ------ | ------------------ | ------------------- |
| Node.js | ≥ 18   | API 服务 + Jest    | `node -v`           |
| npm     | ≥ 9    | 依赖管理           | `npm -v`            |
| k6      | ≥ 0.50 | 性能测试           | `k6 version`        |
| JMeter  | ≥ 5.6  | 企业级负载测试     | `jmeter -v`         |
| Docker  | ≥ 24   | InfluxDB + Grafana | `docker -v`         |
| Python3 | ≥ 3.9  | 集成测试脚本辅助   | `python3 --version` |

### Preflight Check

**Stage 3 (性能测试)** — 执行 `npm run preflight`：

| 检查项       | 阈值     |
| ------------ | -------- |
| Load Average | < 5      |
| 可用内存     | > 2 GB   |
| CPU Idle     | > 50%    |
| 孤立进程     | 自动清理 |

**Stage 4 (集成测试)** — 执行 `bash scripts/preflight-check.sh --stage4`，额外检查：

| 检查项        | 要求   | 修复                                    |
| ------------- | ------ | --------------------------------------- |
| Docker daemon | 运行中 | `open -a Docker` 或启动 OrbStack/colima |

集成测试 (`bash scripts/integration-test.sh`) 自动调用 Stage 4 检测。

---

## 6. 测试命令速查

### 6.1 单元测试

```bash
npm test                                    # 全量 Jest 单元测试（以 tests/unit/ 当前内容为准）
npx jest tests/unit/routes/                 # Phase 1: API 路由 (products/orders/health)
npx jest tests/unit/middleware/             # Phase 1: 中间件 (delay/metrics)
npx jest tests/unit/scripts/               # Phase 2: 脚本 (server-sh/preflight/soak)
npx jest tests/unit/auth/                   # Phase 3: 认证 (register/login/middleware)
npx jest tests/unit/helpers/               # Phase 5: Helpers (env/data/profile)
npx jest tests/unit/middleware/rateLimiter  # Phase 6: Rate limiter
npm test -- --coverage                      # 含覆盖率报告
```

### 6.2 集成测试

```bash
bash scripts/integration-test.sh            # 自动化集成检查入口（覆盖已实现的集成场景）
```

### 6.3 性能测试

```bash
# Smoke (CI 门禁)
npm run k6:smoke                            # k6 smoke
npm run jmeter:smoke                        # JMeter smoke
npm run jmeter:dryrun                       # JMeter 字段验证

# 负载场景
npm run k6:smoke                            # 5 VUs, 60s
npm run k6:load                             # 20→50 VUs 递增
npm run k6:stress                           # 50→200 VUs 压力
npm run k6:spike                            # 5→100 VUs 突发

# 认证场景 (需 AUTH_ENABLED=true)
npm run k6:auth-login                       # 100 VUs 登录压测
npm run k6:auth-refresh                     # 200 VUs Token 刷新
npm run k6:auth-journey                     # 500 VUs 完整旅程

# Soak (长时间)
npm run k6:soak:short                       # 10 min, 100 VUs
npm run k6:soak                             # 1h, 200 VUs
npm run k6:soak:full                        # 4h, 500 VUs

# Phase 6: 崩溃/限流
npm run k6:breakpoint                       # 递增到崩溃，找绝对崩溃点
RATE_LIMIT_ENABLED=true npm run start:single && npm run k6:rate-limit  # 限流测试
npm run generate-summary                    # 生成执行摘要报告
```

---

## 7. 问题处理流程

### 7.1 Bug 分级

| 级别       | 定义                                 | 处理方式                           |
| ---------- | ------------------------------------ | ---------------------------------- |
| P0-Blocker | P0 检查项失败 (单元测试/lint/覆盖率) | 当前阶段立即修复，重跑受影响测试   |
| P1-Major   | P1 检查项失败 (集成/性能/CI)         | 评估是否阻塞发布，阻塞则修复后重跑 |
| P2-Minor   | P2 检查项失败或非功能问题            | 创建 follow-up Issue，不阻塞发布   |

### 7.2 处理决策树

```
发现问题
  ├── 本阶段引入？
  │   └── YES → 修复 → 新 commit → 重跑受影响测试
  │
  ├── 之前 Phase 遗留？
  │   ├── 阻塞发布 → 回退到开发阶段修复
  │   └── 不阻塞 → 记录 risks.md + 创建 Issue
  │
  └── 文档/计数不一致？
      └── 更新 qa/test-cases/index.md + 同步 CLAUDE.md/README.md
```

### 7.3 禁止事项

- 禁止用 `|| true`、`continue-on-error` 掩盖测试失败
- 禁止 `--collect-only`、`skip` 作为最终方案
- 临时 workaround 必须同时创建 follow-up Issue 追踪

---

## 8. Per-Phase 测试要点

### Phase 1 — 双引擎性能测试

| 验证项                | 方法                                 |
| --------------------- | ------------------------------------ |
| API 路由 CRUD 正确性  | Jest: UT-PROD-01~06, UT-ORDER-01~05  |
| k6 四种负载模式可运行 | npm run k6:smoke/load/stress/spike   |
| JMeter 报告生成       | npm run jmeter:smoke → reports/ 目录 |
| k6 报告完整性         | K6-RPT-01~07                         |
| Grafana 可视化        | JM-GRF-01~04 (需 Docker)             |

### Phase 2 — 系统指标 + 容量

| 验证项                              | 方法             |
| ----------------------------------- | ---------------- |
| /metrics 端点返回 CPU/内存/事件循环 | SM-UT-01~03      |
| CSV 采集器按秒记录                  | SM-IT-01~03      |
| Cluster 模式 + 崩溃恢复             | CLU-01~03        |
| 容量二分法定位                      | CAP-01~06 (手动) |

### Phase 3 — JWT 认证

| 验证项                  | 方法                   |
| ----------------------- | ---------------------- |
| 注册/登录/刷新/登出 API | UT-AUTH-01~10          |
| 中间件鉴权逻辑          | UT-MW-01~07            |
| 端到端认证流程          | AUTH-INT-01~03         |
| 高并发认证压测          | AUTH-PERF-01~04 (手动) |

### Phase 4 — Soak + 可观测性

| 验证项              | 方法                                 |
| ------------------- | ------------------------------------ |
| 内存泄漏检测逻辑    | UT-SOAK-01~07                        |
| Soak 短时验证       | SOAK-TC-01 (`npm run k6:soak:short`) |
| Grafana 面板 + 告警 | `bash scripts/integration-test-phase7-soak.sh` |

### Phase 5 — 基础设施 Helper

| 验证项              | 方法          |
| ------------------- | ------------- |
| env-loader 解析     | UT-ENV-01~07  |
| csv-loader 解析     | UT-DATA-01~08 |
| profile-parser 解析 | UT-PROF-01~09 |
| k6 helpers 端到端   | K6-INT-01~05  |

### Phase 6 — 测试能力扩展

| 验证项                                         | 方法                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Rate limiter 中间件 (正常/超限/恢复/开关/headers) | Jest: `tests/unit/middleware/rateLimiter.test.js`                 |
| k6 helpers 统一 (funnel/thinkTime/healthCheck) | k6 smoke 迁移前后对比 (p95 偏差 < 10%)                            |
| 现有脚本迁移回归                               | `npm run k6:smoke` + `npm test` 全部 PASS                         |
| Breakpoint 崩溃测试                            | `npm run k6:breakpoint` 输出崩溃点 + 类型                         |
| 限流测试 (429/恢复)                            | `npm run k6:rate-limit`（设计目标；当前 workflow 未自动接入）     |
| 执行摘要报告                                   | `npm run generate-summary` → `reports/k6-summary.md`              |
| CDN 依赖清除                                   | `grep -r "jslib.k6.io" tests/performance/` 返回空                 |

### Phase 7 — CI/CD + 可观测性（全量执行，无跳过）

#### 7.1 测试覆盖与依赖

| 类型 | 用例 | 依赖 | 备注 |
|------|------|------|------|
| **单元** | UT-BL-01~06, K6-FUNNEL-01~03, K6-CLASS-01~02 | 无 | 并行执行，最快 |
| **覆盖率** | CI-COV-01~04 | UT-* 全部通过 | `npm test -- --coverage` |
| **基线** | CI-BL-01~04 | smoke gate 完成 | 生成/对比 baseline.json |
| **趋势** | TREND-01~03 | CI-BL-01 完成 | 追加 trend.json |
| **Grafana** | GRF-ERR/HEAT/CUSTOM/ALERT | InfluxDB + Grafana 启动 | Docker 集成 |
| **恢复** | K6-RECOVERY-01 | k6 runtime 就绪 | 长时间压测（30+ min） |
| **集成** | K6-SOAK-INT-01~02 | Grafana dashboard 配置 | 需主动观测 |
| **设计门禁** | K6-OBS-DESIGN-01~04 | Phase 7 observer 方案评审通过 | 设计目标，暂不计入当前 33 条已落地统计 |
| **调度** | SCHED-01~04 | CI 环境检测通过 | 最后验证 |

#### 7.2 执行顺序规划

```
第1轮：单元测试 + 覆盖率（~5 min）
  ├─ npm test (UT-BL, K6-FUNNEL, K6-CLASS)
  └─ npm test -- --coverage (CI-COV)

第2轮：基线建立（~2 min）
  ├─ npm run k6:smoke (生成 baseline.json)
  └─ CI job baseline-compare (CI-BL-01~04)

第3轮：趋势报告（~1 min）
  └─ scripts/generate-trend.sh (TREND-01~03)

第4轮：Grafana 集成（Docker）（~10 min）
  ├─ docker-compose up (InfluxDB + Grafana)
  └─ 可视化验证 (GRF-ERR/HEAT/CUSTOM/ALERT)

第5轮：长时间压测（~30+ min）
  ├─ npm run k6:soak:short (K6-RECOVERY-01)
  └─ K6-SOAK-INT-01~02 观测告警

第5.5轮：observer 方案门禁（设计/实现切换前）
  ├─ 确认 load + observer 双 scenario 设计
  ├─ 确认 threshold 仅统计 scenario:load
  └─ 确认 capacity:test 现有链路可复用

第6轮：调度配置（~2 min）
  └─ actionlint 验证 (SCHED-01~04)
```

#### 7.3 进入/退出标准

| 条件 | 标准 |
|------|------|
| **进入** | `npm test` 通过 + coverage 达到 stmt 80 / branch 70 / func 80 / line 80 + k6 smoke 无报错 |
| **退出** | 33/33 用例完成 + 所有报告（baseline/trend/coverage）生成 + Grafana dashboard 可访问 |

> `#133` 补充说明：observer scenario + 固定间隔采样属于 **Phase 7 设计门禁**。在脚本实现与验证完成前，仅作为设计目标记录，不并入当前 33/33 已落地统计。

---

## 9. SLA 定义

> **权威来源:** SLA 指标定义见 [requirements.md §SLA 定义](../project-management/requirements.md#sla-定义)，本节仅做快速引用。

| 指标              | 阈值     | 适用场景                              |
| ----------------- | -------- | ------------------------------------- |
| p95 latency       | < 500ms  | 所有 API 端点 (smoke/load/stress)     |
| p99 latency       | < 2000ms | 认证相关端点 (bcrypt 开销)            |
| Error rate        | < 1%     | 所有场景                              |
| Throughput        | ≥ 30 rps | smoke 场景 (5 VUs)                    |
| Heap growth       | < 50%    | Soak test (1h+)                       |
| Coverage (stmt)   | ≥ 80%    | Jest 单元测试                         |
| Coverage (branch) | ≥ 70%    | Jest 单元测试                         |

---

## 10. 测试报告与产出物

| 产出物           | 路径                           | 生成方式                      |
| ---------------- | ------------------------------ | ----------------------------- |
| Jest 覆盖率      | `coverage/`                    | `npm test -- --coverage`      |
| k6 HTML 报告     | `reports/k6-*.html`            | k6 run + handleSummary        |
| JMeter HTML 报告 | `reports/jmeter-*/`            | jmeter -g + -o                |
| 系统指标 CSV     | `reports/system-metrics-*.csv` | `scripts/server.sh collect`   |
| k6 执行摘要      | `reports/k6-summary.md`        | `scripts/generate-summary.sh` |
| 集成测试结果     | stdout                         | `scripts/integration-test.sh` |

---

## 文档关联

| 文档     | 路径                                                                  | 关系                            |
| -------- | --------------------------------------------------------------------- | ------------------------------- |
| 用例索引 | [test-cases/index.md](test-cases/index.md)                            | 357 条用例清单 + per-phase 详情 |
| 架构设计 | [architecture.md](../architecture/architecture.md)                    | 系统架构 + 数据流               |
| 风险清单 | [risks.md](../project-management/risks.md)                            | 技术风险 + 缓解措施             |
| 需求文档 | [requirements.md](../project-management/requirements.md)              | Phase 1~7 需求编号              |
| 开发流程 | [dev-process-checklist.md](../../../../docs/dev-process-checklist.md) | 5 阶段流程 + checklist          |
| **Phase 7 Stage 4 验收清单** | [phase7-stage4-validation.md](phase7-stage4-validation.md) | Phase 7 验收阶段逐轮检查清单 |
