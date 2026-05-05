# 测试用例 ID 治理规范

**适用范围:** `performance-testing-platform` 全部 Phase（1~7）

---

## ID 格式

```
<TYPE>-<MODULE>-<NNN>
```

| 字段     | 说明                                | 示例         |
| -------- | ----------------------------------- | ------------ |
| `TYPE`   | 测试类型前缀（见下表）              | `UT`, `K6`   |
| `MODULE` | 被测模块/功能缩写（2~5 个大写字母） | `DB`, `AUTH` |
| `NNN`    | 从 `01` 起的三位序号                | `01`, `12`   |

> **历史豁免:** `SMOKE`, `LOAD`, `STRESS`, `SPIKE` 系列为 Phase 1 建立时采用 2 段格式 `<MODULE>-<NNN>`，已在全项目稳定使用，不作重命名。**新增用例必须遵守 3 段格式。**

---

## 设计原则

| 原则     | 说明                                             |
| -------- | ------------------------------------------------ |
| 全局唯一 | 整个项目内任意 ID 不得重复                       |
| 类型编码 | 前缀体现测试层级（UT/IT/PT/CI）                  |
| 阶段无关 | Phase 编号不进入 ID，ID 跟随模块，不跟随 Phase   |
| 集中注册 | 新前缀必须在本文件"前缀主注册表"中登记后方可使用 |
| RTM 同步 | 每条 ID 必须在 `rtm.md` 中有对应需求映射         |

---

## 前缀主注册表

### 单元测试 (UT-)

| 前缀         | 含义                                          | 用例文件                                     | Phase |
| ------------ | --------------------------------------------- | -------------------------------------------- | ----- |
| `UT-DELAY`   | 延迟工具                                      | `tests/unit/utils/delay.test.js`             | 1     |
| `UT-DB`      | 数据库模块                                    | `tests/unit/db/database.test.js`             | 1     |
| `UT-HEALTH`  | 健康检查路由                                  | `tests/unit/routes/health.test.js`           | 1     |
| `UT-PROD`    | 商品路由                                      | `tests/unit/routes/products.test.js`         | 1     |
| `UT-ORDER`   | 订单路由                                      | `tests/unit/routes/orders.test.js`           | 1     |
| `UT-METRICS` | 指标中间件                                    | `tests/unit/middleware/metrics.test.js`      | 1     |
| `SM-UT`      | 系统指标采集单元                              | `tests/unit/utils/metrics.test.js`           | 2     |
| `CLU`        | Cluster 模式单元测试（历史遗留，无 UT- 前缀） | `tests/unit/cluster.test.js`                 | 2     |
| `UT-AUTH`    | 认证路由                                      | `tests/unit/routes/auth.test.js`             | 3     |
| `UT-MW`      | 认证中间件                                    | `tests/unit/middleware/authenticate.test.js` | 3     |
| `UT-SOAK`    | 内存泄漏检测                                  | `tests/unit/utils/leak-detection.test.js`    | 4     |
| `UT-ENV`     | 环境加载器                                    | `tests/unit/helpers/env.test.js`             | 5     |
| `UT-DATA`    | CSV 数据加载器                                | `tests/unit/helpers/data.test.js`            | 5     |
| `UT-PROF`    | 负载 Profile 解析器                           | `tests/unit/helpers/profile.test.js`         | 5     |
| `UT-RL`      | Rate Limiter 中间件                           | `tests/unit/middleware/rateLimiter.test.js`  | 6     |
| `UT-BL`      | 基线回归对比                                  | `tests/unit/utils/baseline.test.js`          | 7     |

### 集成测试 (IT-)

| 前缀         | 含义                | 用例文件                                        | Phase |
| ------------ | ------------------- | ----------------------------------------------- | ----- |
| `SM-IT`      | 系统指标集成        | `scripts/integration-test.sh`                   | 2     |
| `TQ-IT`      | 测试质量保障集成    | `scripts/integration-test.sh`                   | 2     |
| `CLU-INT`    | Cluster 模式集成    | `tests/integration/cluster.integration.test.js` | 2     |
| `CAP`        | 容量测试            | `tests/performance/capacity.k6.js`              | 2     |
| `AUTH-INT`   | 认证集成流程        | `scripts/integration-test.sh`                   | 3     |
| `AUTH-PERF`  | 认证性能            | `tests/performance/auth-*.k6.js`                | 3     |
| `SOAK-TC`    | 浸泡测试场景        | `tests/performance/soak.k6.js`                  | 4     |
| `K6-INT`     | k6 环境集成         | `tests/performance/env-test.k6.js`              | 5     |
| `RL-INT`     | Rate Limiter 集成   | `scripts/integration-test.sh`                   | 6     |
| `GEN-INT`    | 摘要脚本集成        | `scripts/integration-test.sh`                   | 6     |
| `K6-HLP-INT` | k6 Helpers 集成验证 | `tests/performance/helpers-test.k6.js`          | 6     |

### 性能测试 (PT-)

| 前缀     | 含义                   | 用例文件                                     | Phase |
| -------- | ---------------------- | -------------------------------------------- | ----- |
| `SMOKE`  | 冒烟测试 (k6 + JMeter) | `tests/performance/smoke.k6.js`, `smoke.jmx` | 1     |
| `LOAD`   | 负载测试               | `load.k6.js`, `load.jmx`                     | 1     |
| `STRESS` | 压力测试               | `stress.k6.js`, `stress.jmx`                 | 1     |
| `SPIKE`  | 尖峰测试               | `spike.k6.js`, `spike.jmx`                   | 1     |
| `JM-RPT` | JMeter HTML 报告       | `tests/performance/jmeter/*.jmx`             | 1     |
| `JM-GRF` | JMeter Grafana 面板    | `grafana/dashboards/`                        | 1     |
| `JM-CI`  | JMeter CI 门禁         | `.github/workflows/performance-ci.yml`       | 1     |
| `K6-RPT` | k6 HTML 报告生成       | `npm run k6:*`（`--out web-dashboard`）      | 1     |
| `K6-RL`  | k6 限流测试            | `tests/performance/rate-limit.k6.js`         | 6     |
| `K6-BRK` | k6 Breakpoint 测试     | `tests/performance/breakpoint.k6.js`         | 6     |
| `K6-MIG` | k6 Helpers 迁移验证    | `tests/performance/*.k6.js`                  | 6     |
| `K6-SUM` | k6 执行摘要报告        | `scripts/generate-summary.sh`                | 6     |

> **注意:** `K6-RPT` (Phase 1, HTML 报告) 与 `K6-SUM` (Phase 6, Markdown 摘要) 是不同功能，ID 已区分。

### CI/CD 测试 (CI-)

| 前缀         | 含义                   | 用例文件                               | Phase |
| ------------ | ---------------------- | -------------------------------------- | ----- |
| `CI-COV`     | CI 覆盖率门禁          | `.github/workflows/performance-ci.yml` | 7     |
| `CI-BL`      | CI 基线回归            | `.github/workflows/performance-ci.yml` | 7     |
| `TREND`      | 趋势报告               | `src/utils/trend.js` + `scripts/analysis/trend-collect.js` | 7     |
| `GRF-ERR`    | Grafana 错误分布面板   | `grafana/dashboards/`                  | 7     |
| `GRF-HEAT`   | Grafana 延迟热力图     | `grafana/dashboards/`                  | 7     |
| `GRF-CUSTOM` | Grafana 自定义指标面板 | `grafana/dashboards/`                  | 7     |
| `GRF-ALERT`  | Grafana webhook 告警   | `grafana/dashboards/`                  | 7     |
| `SCHED`      | 定时调度 workflow      | `.github/workflows/nightly-soak.yml`   | 7     |

---

## 标签体系

每条测试用例行的「标签」列包含三个维度，空格分隔：

```
<TYPE> <PRIORITY> <EXECUTION>
```

### 类型标签（TYPE）

| 标签 | 含义       | 用途                           |
| ---- | ---------- | ------------------------------ |
| `UT` | 单元测试   | Stage 3 开发阶段必须 100% 通过 |
| `IT` | 集成测试   | Stage 4 验证阶段执行           |
| `PT` | 性能测试   | Stage 4 smoke + 回归阶段执行   |
| `CI` | CI/CD 验证 | 回归阶段执行                   |

### 优先级标签（PRIORITY）

| 标签 | 含义   | 说明                       |
| ---- | ------ | -------------------------- |
| `P1` | 高优先 | 必须通过，失败则阻断       |
| `P2` | 中优先 | 重要，标准回归必须通过     |
| `P3` | 低优先 | 可选，长时运行或需特殊环境 |

### 执行级别标签（EXECUTION）

| 标签         | 含义 | 触发场景                             |
| ------------ | ---- | ------------------------------------ |
| `smoke`      | 冒烟 | 每次 CI push、Stage 4 验证阶段       |
| `regression` | 回归 | PR、nightly、回归版本发布            |
| `full`       | 全量 | 手动触发或定时调度（含 Docker 依赖） |

### 各阶段过滤规则

| 阶段         | 执行范围             | 标签过滤条件                                        |
| ------------ | -------------------- | --------------------------------------------------- |
| Stage 3 开发 | 所有单元测试         | `type=UT`                                           |
| Stage 4 验证 | 冒烟测试 + 集成测试  | `execution=smoke` 或 `type=IT`                      |
| 回归版本     | 冒烟 + P1 + 全量回归 | `execution=smoke` 或 `P1` 或 `execution=regression` |

---

## 新增 ID 流程

1. 确认所属 TYPE 和 MODULE
2. 在本文件对应分类表中查重
3. 取当前该前缀最大序号 + 1
4. 在对应 `phase*.md` 中添加测试用例行（含「标签」列）
5. 在 `rtm.md` 中添加需求映射行
6. 在本文件前缀注册表中登记（若为新前缀）

---

## 已废弃前缀

| 废弃前缀                 | 原因                                         | 替代前缀                                           |
| ------------------------ | -------------------------------------------- | -------------------------------------------------- |
| `K6-BP`                  | 与 `K6-BRK` 语义重复                         | `K6-BRK`                                           |
| `K6-RPT`（Phase 6 用法） | Phase 6 摘要报告与 Phase 1 HTML 报告语义冲突 | `K6-SUM`（Phase 6 仅）；Phase 1 的 `K6-RPT` 仍有效 |
