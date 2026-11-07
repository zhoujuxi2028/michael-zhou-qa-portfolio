# JMeter Dry-run 与 k6 Smoke 设计文档

**版本:** 1.0
**日期:** 2026-04-20
**状态:** 已实现（Phase 1 + Phase 7 CI 集成）

---

## 1. 概述

本文档定义 JMeter dry-run 和 k6 smoke 两个轻量级性能验证机制的设计。它们是性能测试平台的**质量门禁**，在全量压测（load/stress/spike/soak）之前快速发现配置错误和基本性能回归。

### 1.1 设计目标

| 目标           | 说明                                          |
| -------------- | --------------------------------------------- |
| **快速失败**   | 在 2 分钟内发现字段名错误、端点变更、断言失败 |
| **CI 门禁**    | 作为 PR 合并的必要条件，自动阻塞不合格代码    |
| **双引擎镜像** | k6 和 JMeter 覆盖相同场景，交叉验证结果一致性 |
| **零成本复用** | 使用与正式测试相同的脚本/JMX，仅缩小负载规模  |

### 1.2 术语

| 术语            | 定义                                                                |
| --------------- | ------------------------------------------------------------------- |
| **Dry-run**     | JMeter 以最小负载（1 thread × 10s）执行，验证所有请求返回预期状态码 |
| **Smoke test**  | k6 以低负载（5 VUs × 60s）执行，验证核心端点可用且 SLA 达标         |
| **门禁 (Gate)** | CI 中必须通过才能继续后续步骤的检查点                               |
| **SLA**         | Service Level Agreement: p95 < 500ms, error rate < 1%               |

---

## 2. JMeter Dry-run 设计

### 2.1 设计背景

> **教训来源:** Issue #50 事后分析 — `productId` vs `product_id` 字段名不匹配导致全量压测浪费 30 分钟，
> 所有请求返回 400 错误。Dry-run 机制在 10 秒内即可拦截此类问题。

### 2.2 架构

```
                        JMeter Dry-run 流程
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  npm run jmeter:dryrun                                       │
│       │                                                      │
│       ▼                                                      │
│  scripts/jmeter-dryrun.sh                                    │
│       │                                                      │
│       ├── 读取 dryrun.properties (threads=1, duration=10)    │
│       ├── 执行 jmeter -n -t <jmx> -q <props>                │
│       ├── 输出 results/jmeter-dryrun.jtl                     │
│       │                                                      │
│       ▼                                                      │
│  JTL 结果解析                                                │
│       │                                                      │
│       ├── 统计 total requests                                │
│       ├── 统计 failed requests (CSV column 8 = false)        │
│       │                                                      │
│       ▼                                                      │
│  退出码判定                                                  │
│       │                                                      │
│       ├── 0 requests → exit 1 (空结果，JMX 配置异常)        │
│       ├── errors > 0 → exit 1 (存在失败请求)                │
│       └── all pass  → exit 0 (安全通过)                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 配置文件

**文件:** `tests/jmeter/config/dryrun.properties`

| 参数       | 值        | 说明                  |
| ---------- | --------- | --------------------- |
| `threads`  | 1         | 单线程，避免并发干扰  |
| `duration` | 10        | 10 秒足够验证所有端点 |
| `rampup`   | 1         | 1 秒启动              |
| `base_url` | localhost | 默认本地              |
| `port`     | 3000      | 默认端口              |

**设计决策:** 使用 `.properties` 文件而非命令行参数，保持与正式测试（smoke/load/stress）的配置管理一致性。

### 2.4 脚本逻辑 (`scripts/jmeter-dryrun.sh`)

| 步骤            | 逻辑                                      | 失败条件            |
| --------------- | ----------------------------------------- | ------------------- | ------------------ |
| 1. 清理         | 删除旧 `.jtl` 文件                        | —                   |
| 2. 执行         | `jmeter -n -t <jmx> -q dryrun.properties` | JMeter 安装缺失     |
| 3. 检查结果文件 | `.jtl` 文件是否生成                       | 文件不存在 → exit 1 |
| 4. 统计总请求数 | `tail -n +2                               | wc -l`              | total = 0 → exit 1 |
| 5. 统计失败请求 | `awk -F',' '$8 == "false"'`               | errors > 0 → exit 1 |
| 6. 清理临时文件 | 成功后删除 `.jtl`                         | —                   |

### 2.5 JTL 解析规则

JMeter CSV 格式（默认输出）：

```
timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,...
1713600000000,45,Health Check,200,OK,Thread Group 1-1,text,true,...
```

- **Column 8 (`success`)**: `true` = 通过, `false` = 失败
- **Column 3 (`label`)**: 请求名称（用于错误报告）
- **Column 4 (`responseCode`)**: HTTP 状态码（用于调试信息）

### 2.6 npm 脚本

| 脚本                         | 目标 JMX        | 用途                                     |
| ---------------------------- | --------------- | ---------------------------------------- |
| `npm run jmeter:dryrun`      | `smoke.jmx`     | 标准 dry-run，验证商品/订单/健康检查端点 |
| `npm run jmeter:dryrun:auth` | `auth-load.jmx` | 认证场景 dry-run，验证登录/刷新/令牌端点 |

### 2.7 错误处理

| 场景           | 输出                                                          | 退出码 |
| -------------- | ------------------------------------------------------------- | ------ |
| JMeter 未安装  | `set -euo pipefail` 自动捕获                                  | 1      |
| JMX 文件不存在 | JMeter 报错                                                   | 1      |
| 0 个请求       | `❌ Dry-run produced 0 requests`                              | 1      |
| 部分请求失败   | `❌ Dry-run FAILED — N/M requests returned errors` + 失败列表 | 1      |
| 全部通过       | `✅ Dry-run passed — N/N requests successful`                 | 0      |

---

## 3. k6 Smoke 设计

### 3.1 设计背景

k6 smoke test 是性能测试金字塔的底层，用最小负载验证系统基本功能和 SLA 阈值。它是 CI 性能门禁的核心组件。

### 3.2 架构

```
                        k6 Smoke 测试流程
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  npm run k6:smoke                                            │
│       │                                                      │
│       ▼                                                      │
│  tests/performance/smoke.k6.js                               │
│       │                                                      │
│       ├── loadProfile('smoke')                               │
│       │     └── profiles/smoke.json                          │
│       │           ├── vus: 5                                 │
│       │           ├── duration: 60s                          │
│       │           └── thresholds:                            │
│       │                 ├── http_req_duration: p95 < 500ms   │
│       │                 └── http_req_failed: rate < 1%       │
│       │                                                      │
│       ▼                                                      │
│  default function (每 VU 循环执行)                           │
│       │                                                      │
│       ├── GET /health                                        │
│       │     ├── checkStatus(200)                             │
│       │     └── checkDuration(200ms)                         │
│       │                                                      │
│       ├── GET /api/products                                  │
│       │     └── checkStatus(200)                             │
│       │                                                      │
│       ├── GET /api/products/:id                              │
│       │     └── checkStatus(200)                             │
│       │                                                      │
│       └── sleep(1)                                           │
│                                                              │
│  输出:                                                       │
│       ├── CLI 结果摘要 (✓/✗ threshold 判定)                  │
│       └── reports/k6-smoke.html (Web Dashboard)              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 配置系统

#### 3.3.1 Profile JSON (`profiles/smoke.json`)

```json
{
  "vus": 5,
  "duration": "60s",
  "thresholds": {
    "http_req_duration": ["p(95)<500"],
    "http_req_failed": ["rate<0.01"]
  }
}
```

#### 3.3.2 Profile 加载机制

**k6 runtime (`tests/performance/helpers/profile.js`):**

- 使用 k6 内置 `open()` 函数读取 JSON 文件
- 路径相对于主脚本位置：`../../profiles/<name>.json`
- 验证必须包含 `vus`+`duration` 或 `stages`，以及 `thresholds`

**Node.js 单元测试 (`src/utils/profile-parser.js`):**

- 纯 JSON 解析 + 验证逻辑
- 支持 `stages` 模式和 `vus`+`duration` 模式
- 提供 `loadProfile()` 和 `validateProfile()` 两个接口

### 3.4 Helper 模块

| Helper            | 文件                 | 功能                                |
| ----------------- | -------------------- | ----------------------------------- |
| `checkStatus()`   | `helpers/utils.js`   | 验证 HTTP 状态码，封装 k6 `check()` |
| `checkDuration()` | `helpers/utils.js`   | 验证响应时间 < 阈值                 |
| `randomProduct()` | `helpers/data.js`    | 随机选择商品 ID (1~5)               |
| `loadProfile()`   | `helpers/profile.js` | 加载 profile JSON 并验证            |
| `BASE_URL`        | `helpers/env.js`     | 从环境变量读取目标 URL              |

### 3.5 SLA 阈值定义

| 指标                | 阈值          | 说明                        |
| ------------------- | ------------- | --------------------------- |
| `http_req_duration` | p(95) < 500ms | 95% 的请求延迟低于 500 毫秒 |
| `http_req_failed`   | rate < 0.01   | 错误率低于 1%               |

**设计决策:** 阈值定义在 `profiles/smoke.json` 中而非硬编码在脚本中，支持环境差异化（staging vs production）。

### 3.6 端点覆盖

| 端点                | 方法 | 验证项                       | Tag                             |
| ------------------- | ---- | ---------------------------- | ------------------------------- |
| `/health`           | GET  | status 200, duration < 200ms | `endpoint: '/health'`           |
| `/api/products`     | GET  | status 200                   | `endpoint: '/api/products'`     |
| `/api/products/:id` | GET  | status 200                   | `endpoint: '/api/products/:id'` |

**设计决策:** Smoke test 只覆盖读操作（GET），不执行写操作（POST /api/orders），避免在 CI 中产生副作用数据。

### 3.7 报告输出

```bash
k6 run --out 'web-dashboard=export=reports/k6-smoke.html' tests/performance/smoke.k6.js
```

| 输出                    | 格式     | 用途                              |
| ----------------------- | -------- | --------------------------------- |
| CLI stdout              | 文本表格 | 即时查看 threshold 判定           |
| `reports/k6-smoke.html` | HTML     | Web Dashboard，含趋势图和详细指标 |

---

## 4. CI 集成设计

### 4.1 Pipeline 中的位置

```
performance-ci.yml workflow:

  ┌─────┐     ┌──────────┐     ┌──────────────────────────┐
  │ lint │ ──► │ unit-tests │ ──► │ smoke-gate (parallel)    │
  └─────┘     └──────────┘     │  ├── k6 smoke test       │
                                │  └── JMeter smoke test   │
                                └──────────────────────────┘
                                         │
                                         ▼
                                ┌──────────────────────────┐
                                │ baseline-compare         │
                                │ trend-collect            │
                                └──────────────────────────┘
```

### 4.2 门禁优先级

| 优先级        | 检查项         | 命令                    | 失败影响     |
| ------------- | -------------- | ----------------------- | ------------ |
| **P0 (阻塞)** | JMeter dry-run | `npm run jmeter:dryrun` | 阻塞 PR 合并 |
| **P0 (阻塞)** | k6 smoke       | `npm run k6:smoke`      | 阻塞 PR 合并 |
| **P1 (建议)** | k6 load        | `npm run k6:load`       | 建议通过     |
| **P2 (信息)** | Full suite     | k6 + JMeter 全量        | 仅参考       |

### 4.3 失败恢复

| 失败场景                  | 恢复步骤                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- |
| JMeter dry-run 失败       | 1. 查看失败请求列表 → 2. 修复字段名/端点/状态码 → 3. 重跑 `npm run jmeter:dryrun` |
| k6 smoke 阈值失败         | 1. 查看 CLI 输出 ✗ 标记 → 2. 分析 p95 或 error rate 超标原因 → 3. 优化后重跑      |
| k6 smoke profile 加载失败 | 1. 检查 `profiles/smoke.json` 格式 → 2. 验证 `vus`/`duration`/`thresholds` 字段   |

---

## 5. 设计决策记录 (ADR)

### ADR-DRYRUN-001: Dry-run 使用独立 properties 文件

**决策:** 为 dry-run 创建独立的 `dryrun.properties` 而非复用 `smoke.properties`。

**理由:**

- Dry-run 目的是验证正确性（1 thread），smoke 目的是验证性能（5 threads）
- 分离关注点：dry-run 不关心吞吐量，只关心请求成功率
- 独立修改不影响其他配置

### ADR-DRYRUN-002: Dry-run 脚本使用 Shell 而非 Node.js

**决策:** `jmeter-dryrun.sh` 使用 Bash 实现。

**理由:**

- JMeter CLI 是命令行工具，Shell 是最自然的编排方式
- JTL CSV 解析使用 `awk`，比 Node.js 流处理更简洁
- 与 CI runner 环境兼容性最好（无额外依赖）

### ADR-SMOKE-001: Smoke profile 使用 JSON 而非硬编码

**决策:** k6 smoke 配置外置为 `profiles/smoke.json`。

**理由:**

- 与 load/stress/spike 保持一致的配置管理模式
- 支持不同环境使用不同参数（本地 vs CI vs staging）
- 单元测试可独立验证 profile 解析逻辑

### ADR-SMOKE-002: Smoke 不测试写操作

**决策:** `smoke.k6.js` 仅包含 GET 请求。

**理由:**

- CI 中频繁执行，写操作会累积脏数据
- 读操作足以验证服务可用性和基本延迟
- 写操作验证交给 load/stress test（更大负载更有意义）

---

## 6. 文件清单

| 类型     | 文件                                       | 说明                           |
| -------- | ------------------------------------------ | ------------------------------ |
| 脚本     | `scripts/jmeter-dryrun.sh`                 | Dry-run 执行脚本               |
| 配置     | `tests/jmeter/config/dryrun.properties`    | Dry-run 参数                   |
| 配置     | `profiles/smoke.json`                      | k6 smoke profile               |
| k6 脚本  | `tests/performance/smoke.k6.js`            | k6 smoke 测试                  |
| Helper   | `tests/performance/helpers/utils.js`       | checkStatus / checkDuration    |
| Helper   | `tests/performance/helpers/data.js`        | randomProduct                  |
| Helper   | `tests/performance/helpers/profile.js`     | loadProfile (k6 runtime)       |
| Parser   | `src/utils/profile-parser.js`              | loadProfile (Node.js 单元测试) |
| 单元测试 | `tests/unit/helpers/profile.test.js`       | profile 解析单元测试           |
| 单元测试 | `tests/unit/helpers/smoke-config.test.js`  | smoke 配置验证单元测试         |
| 单元测试 | `tests/unit/scripts/jmeter-dryrun.test.js` | dry-run 脚本单元测试           |

---

## 7. 变更历史

| 日期       | 版本 | 变更                                                   |
| ---------- | ---- | ------------------------------------------------------ |
| 2026-04-20 | 1.0  | 初始版本：整理 Phase 1~7 已实现的 dry-run + smoke 机制 |
