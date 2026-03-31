# Implementation Plan — Phase 2: Cluster 模式 + 系统指标采集 + 容量测试

**Issue:** [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54)
**Branch:** `feature/performance-testing`
**Date:** 2026-03-31

> **重要变更:** 服务端从单进程升级为 Node.js Cluster 模式（多 Worker），
> 充分利用本机 4 核 CPU，使容量测试结果反映真实多核上限。

---

## 1. 被测对象设计

### 1.1 电商 API 漏斗模型

```
用户进入商城
    │
    ├─ 60% ─→ GET /api/products        (浏览列表)
    │              │
    │         30% ─→ GET /api/products/:id  (查看详情)
    │                    │
    │               10% ─→ POST /api/orders     (下单)
    │
    └─ 漏斗转化: 100 用户 → 60 浏览 → 30 详情 → 10 下单
```

### 1.2 被测对象特征分析

| API | 方法 | 数据库操作 | 模拟延迟 | 预期瓶颈 |
|-----|------|-----------|---------|---------|
| `/api/products` | GET | SQLite 读 (SELECT + COUNT) | 无 | CPU (高并发序列化) |
| `/api/products/:id` | GET | SQLite 读 (SELECT by id) | 无 | 轻微 CPU |
| `/api/orders` | POST | SQLite 写 (UPDATE + INSERT 事务) | 50ms | **主要瓶颈** — 事务锁 + delay |

### 1.3 数据准备

- 商品池: 5 个商品 (id 1~5)，各 100,000 库存 → 足够支撑全部容量测试
- productId 随机选取: `Math.ceil(Math.random() * 5)` → 均匀分布，模拟真实用户
- 无需额外数据准备，现有种子数据充足

---

## 2. 架构设计

### 2.1 Cluster 模式架构

**现状问题:** 单进程 Express 只用 1 核，4 核 CPU 浪费 75%。

```
之前 (单进程):                      之后 (Cluster 模式):

Express (1 进程)                    Master (port 3000, 分发请求)
    │                                   │
  核 1 ← 100% 负载                   ┌──┼──┬──┐
  核 2   空闲                        │  │  │  │
  核 3   空闲                      W1 W2 W3 W4  (4 个 Worker)
  核 4   空闲                      核1 核2 核3 核4 ← 均匀分布
                                     │  │  │  │
                                     └──┴──┴──┘
                                     SQLite 文件 (WAL 模式, 共享)
```

**客户端多核:** k6 (Go) 和 JMeter (Java) 天然多核，无需额外配置。

### 2.2 系统指标采集架构

```
┌──────────────────────────────────────────────────────────┐
│                    容量测试运行时                           │
│                                                            │
│  k6 capacity.k6.js ──→ Cluster Master (port 3000)         │
│  (阶梯递增 VUs)            ├─ Worker 1 ─┐                 │
│       │                    ├─ Worker 2 ─┤                 │
│       │                    ├─ Worker 3 ─┼→ SQLite (WAL)   │
│       │                    └─ Worker 4 ─┘   写锁竞争      │
│       │                         │                          │
│       │                    GET /metrics (进程指标)          │
│       │                                                    │
│  reports/k6-capacity.html                系统采集器         │
│                                    collect-metrics.js      │
│                                          │                 │
│                                  reports/system-*.csv      │
└──────────────────────────────────────────────────────────┘
```

### 2.3 模块清单

| 模块 | 文件 | 需求 ID | 类型 |
|------|------|---------|------|
| Cluster 启动器 | `src/cluster.js` | — | **新建** |
| SQLite 文件模式 | `src/db/database.js` | — | 修改 |
| `/metrics` 扩展 | `src/middleware/metrics.js` | SM-01~03 | 修改 |
| 系统采集器 | `scripts/collect-metrics.js` | SM-04~08 | **新建** |
| 容量测试脚本 | `tests/performance/capacity.k6.js` | US-12 | **新建** |
| npm scripts | `package.json` | SM-09 | 修改 |
| 单元测试 | `tests/unit/middleware/metrics.test.js` | — | 修改 |

---

## 3. 详细设计

### Task 0: Express Cluster 模式 (多核支持)

**目的:** 充分利用本机 4 核 CPU，使容量测试反映真实多核上限。

**新建文件:** `src/cluster.js` (~20 行)

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numWorkers = os.cpus().length;
  console.log(`Master ${process.pid} starting ${numWorkers} workers...`);
  for (let i = 0; i < numWorkers; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  require('./server');  // 每个 Worker 运行一个 Express 实例
}
```

**修改文件:** `src/db/database.js` (1 行)

```javascript
// 之前: new Database(':memory:')
// 之后: new Database(path.join(__dirname, '../../data/perf.db'))
```

> Cluster 模式下多 Worker 不能共享 `:memory:` 数据库，
> 改为文件模式 + WAL，多进程可并发读、串行写 — 这正是真实的 I/O 瓶颈。

**修改文件:** `package.json` (1 行)

```json
// 之前: "start": "node src/server.js"
// 之后: "start": "node src/cluster.js"
// 新增: "start:single": "node src/server.js"  (保留单进程模式)
```

**影响分析:**

| 影响项 | 处理方式 |
|--------|---------|
| 单元测试 | **无需改动** — 直接 import `app.js`，不经过 cluster |
| CI 环境 | `start:single` 用于 CI smoke test |
| `.gitignore` | 已有 `*.db` 规则，data/ 目录需新建 |
| 每次启动重建 DB | 现有 `getDatabase()` 自动建表 + seed |

---

### Task 1: 扩展 `/metrics` 端点 (SM-01~03)

**修改文件:** `src/middleware/metrics.js`

**现有实现:**
```javascript
// 只有 requestCount + avgDuration
function getMetrics() {
  return {
    requestCount: metrics.requestCount,
    avgDuration: metrics.requestCount > 0 ? metrics.totalDuration / metrics.requestCount : 0,
  };
}
```

**扩展后:**
```javascript
const os = require('os');

function getMetrics() {
  const cpuUsage = process.cpuUsage();
  const memUsage = process.memoryUsage();
  return {
    // 原有指标
    requestCount: metrics.requestCount,
    avgDuration: metrics.requestCount > 0 ? metrics.totalDuration / metrics.requestCount : 0,
    // SM-01: 进程级 CPU
    cpu: {
      user: cpuUsage.user,       // 微秒
      system: cpuUsage.system,   // 微秒
      loadavg: os.loadavg(),     // [1m, 5m, 15m]
    },
    // SM-02: 进程级内存
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
    },
    // SM-03: 事件循环延迟
    eventLoop: {
      lag: eventLoopLag,         // 通过 setTimeout(0) 采样
    },
  };
}
```

**事件循环延迟采样:** 使用 `setTimeout(fn, 0)` 测量实际延迟与预期延迟的差值，每秒采样一次。

**单元测试:** 验证 `/metrics` 返回新增字段 (cpu, memory, eventLoop)。

---

### Task 2: 系统指标采集器 (SM-04~08)

**新建文件:** `scripts/collect-metrics.js`

**采集项:**

| 指标 | 采集方式 | 输出字段 |
|------|---------|---------|
| SM-04: CPU% | `os.cpus()` 两次采样计算差值 | cpu_user%, cpu_system%, cpu_idle% |
| SM-05: 内存% | `os.totalmem()`, `os.freemem()` | mem_total_mb, mem_used_mb, mem_usage% |
| SM-06: 磁盘 I/O | macOS: `iostat` 命令解析 | disk_read_kb/s, disk_write_kb/s |
| SM-07: 网络 I/O | macOS: `netstat -ib` 解析 | net_rx_kb/s, net_tx_kb/s |
| SM-08: 输出 | CSV 写入 | `reports/system-metrics-{timestamp}.csv` |

**设计:**
```javascript
#!/usr/bin/env node
// Usage: node scripts/collect-metrics.js [interval_ms] [output_path]
// Default: 1000ms, reports/system-metrics-{timestamp}.csv
// 收到 SIGTERM/SIGINT 时优雅退出

const INTERVAL = parseInt(process.argv[2]) || 1000;
const OUTPUT = process.argv[3] || `reports/system-metrics-${Date.now()}.csv`;

// CSV Header:
// timestamp, cpu_user%, cpu_system%, cpu_idle%, mem_total_mb, mem_used_mb, mem_usage%,
// disk_read_kb_s, disk_write_kb_s, net_rx_kb_s, net_tx_kb_s

// 每 INTERVAL ms 采集一次，写入 CSV
// SIGTERM → 关闭文件流，退出
```

**磁盘/网络 I/O 采集:**
- macOS 无 `/proc/diskstats`，使用 `child_process.execSync('iostat -d -c 1 -w 1')` 采集磁盘
- 网络通过 `os.networkInterfaces()` + `/usr/sbin/netstat -ib` 两次采样计算差值
- 采集失败时输出 0，不中断采集器

---

### Task 3: 容量测试脚本 (US-12)

**新建文件:** `tests/performance/capacity.k6.js`

**设计要点:**

1. **漏斗模型实现:**
```javascript
export default function () {
  // 60% 浏览列表
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  // 30% 查看详情 (从浏览者中 50% 转化)
  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 5);
    const detail = http.get(`${BASE_URL}/api/products/${id}`);
    checkStatus(detail, 200, 'product detail');

    // 10% 下单 (从详情查看者中 33% 转化)
    if (Math.random() < 0.33) {
      const order = http.post(`${BASE_URL}/api/orders`,
        JSON.stringify({ product_id: id, quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      checkStatus(order, 201, 'create order');
    }
  }

  sleep(randomIntBetween(0.5, 1.0));  // Think Time
}
```

2. **二分法阶梯配置:**
```javascript
// 第 1 轮: 粗粒度探测 (10 → 50 → 100 → 150 → 200)
export const options = {
  stages: [
    { duration: '60s', target: 10 },
    { duration: '60s', target: 50 },
    { duration: '60s', target: 100 },
    { duration: '60s', target: 150 },
    { duration: '60s', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

> 首轮粗测找到拐点区间后，手动调整 stages 进行二分法细测。
> 例如首轮发现 100 PASS / 150 FAIL → 第二轮测 125 → 逐步逼近。

3. **采集服务端指标:**
```javascript
// 每 10 秒 poll 一次 /metrics，记录到 k6 custom metrics
import { Trend } from 'k6/metrics';

const eventLoopLag = new Trend('server_event_loop_lag');
const heapUsed = new Trend('server_heap_used_mb');
const cpuUser = new Trend('server_cpu_user');

// 在 setup() 或定期任务中 poll /metrics
```

---

### Task 4: npm scripts 集成 (SM-09, TQ-01~04)

**修改文件:** `package.json`

新增脚本:

```json
{
  "capacity:test": "mkdir -p reports && node scripts/collect-metrics.js 1000 reports/system-metrics.csv & COLLECTOR_PID=$! && k6 run --out 'web-dashboard=export=reports/k6-capacity.html' tests/performance/capacity.k6.js; kill $COLLECTOR_PID 2>/dev/null; echo 'Capacity test complete. Reports in reports/'"
}
```

**运行流程:**
1. `mkdir -p reports` — 确保目录存在
2. 后台启动系统采集器 → `reports/system-metrics.csv`
3. 运行 k6 容量测试 → `reports/k6-capacity.html`
4. k6 完成后 kill 采集器
5. 输出归档提示

### Task 4.1: 测试质量保障 (TQ-01~04)

在 `capacity.k6.js` 中实现：

**TQ-01 数据膨胀控制 + TQ-03 测试隔离:**
- 每轮容量测试前重启服务 → 自动重建 SQLite DB (现有 `getDatabase()` 逻辑)
- 在运行说明中注明：每轮二分法之间需 `kill + npm start`

**TQ-02 预热 (Warm-up):**
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ← Warm-up 阶段, 不纳入 SLA
    { duration: '60s', target: 50 },   // ← 正式测试开始
    // ...
  ],
};
```
> k6 的 thresholds 会统计全程数据，但分析时需对照 stages 手动排除 warm-up 区间。
> 在 k6 HTML 报告的时间线图表中可以直观区分 warm-up 和 steady state。

**TQ-04 结果可重复性:**
- 拐点附近的关键轮次跑 3 次
- 取 p95 中值作为最终结果
- 在容量报告中记录每次结果

---

### Task 5: 单元测试

**修改文件:** `tests/unit/middleware/metrics.test.js`

新增测试用例:

| 用例 | 验收标准 |
|------|---------|
| `/metrics` 返回 cpu 对象 | `cpu.user >= 0`, `cpu.system >= 0`, `cpu.loadavg` 是长度 3 的数组 |
| `/metrics` 返回 memory 对象 | `memory.rss > 0`, `memory.heapUsed > 0`, `memory.freeMem > 0` |
| `/metrics` 返回 eventLoop 对象 | `eventLoop.lag >= 0` |

---

## 4. 任务拆分与执行顺序

| # | Task | 依赖 | 预估文件 |
|---|------|------|---------|
| T0 | Express Cluster 模式 + SQLite 文件模式 | 无 | `src/cluster.js`, `src/db/database.js`, `package.json` |
| T1 | 扩展 `/metrics` 端点 (SM-01~03) | T0 | `src/middleware/metrics.js` |
| T2 | 单元测试 — `/metrics` 新字段 | T1 | `tests/unit/middleware/metrics.test.js` |
| T3 | 系统采集器脚本 (SM-04~08) | 无 | `scripts/collect-metrics.js` |
| T4 | 容量测试 k6 脚本 (漏斗模型) | T1 | `tests/performance/capacity.k6.js` |
| T5 | npm scripts 集成 (SM-09) | T3, T4 | `package.json` |
| T6 | 运行容量测试 + 分析瓶颈 | T0~T5 | 测试报告 |
| T7 | 更新 RTM + 文档 | T6 | `docs/test-cases/rtm-jmeter.md` |

**并行可能:** T0+T3 可并行开发（无依赖关系），T1 依赖 T0 完成。

---

## 5. 容量测试用例设计

| 用例 ID | 测试 | 验收标准 |
|---------|------|---------|
| CLU-01 | Cluster 模式启动 | `npm start` 输出 Master + 4 Worker PID |
| CLU-02 | 多 Worker 处理请求 | 并发请求由不同 Worker 处理 |
| CLU-03 | Worker 崩溃自动重启 | kill Worker → Master 自动 fork 新 Worker |
| CAP-01 | 容量测试脚本可运行 | `npm run capacity:test` 正常完成 |
| CAP-02 | 系统指标 CSV 生成 | `reports/system-metrics.csv` 包含 CPU/mem/disk/net 列 |
| CAP-03 | k6 HTML 报告生成 | `reports/k6-capacity.html` 可打开查看 |
| CAP-04 | `/metrics` 返回系统指标 | CPU, memory, eventLoop 字段存在且合理 |
| CAP-05 | 二分法找到最大并发 (Cluster 模式) | 确定满足 SLA 的最大 VUs (4 核) |
| CAP-06 | 瓶颈层定位 | 根据系统指标判断 CPU/Memory/I-O/Network |

---

## 6. 验证方式

```bash
# T0: Cluster 模式验证
npm start &                  # 应输出 Master + 4 Worker PID
curl http://localhost:3000/health  # 验证可访问
kill %1

# T1+T2: 单元测试
npm test

# T3: 采集器手动验证
node scripts/collect-metrics.js 1000 /tmp/test-metrics.csv &
sleep 5 && kill %1
cat /tmp/test-metrics.csv

# T4+T5: 容量测试 (Cluster 模式)
npm start &                  # Cluster 模式启动 4 Worker
npm run capacity:test

# 检查输出
ls reports/k6-capacity.html reports/system-metrics.csv
open reports/k6-capacity.html

# 全量回归
npm run lint && npm test
```
