# Phase 1 测试用例 — 双引擎性能测试 (#17)

## 单元测试用例表

### 工具模块 (`tests/unit/utils/`)

| ID          | 测试用例                      | 预期结果                   | 标签 |
| ----------- | ----------------------------- | -------------------------- | ---- |
| UT-DELAY-01 | simulateDelay(50) 等待约 50ms | elapsed >= 45ms 且 < 200ms | UT P1 regression |
| UT-DELAY-02 | simulateDelay(0) 立即返回     | elapsed < 50ms             | UT P1 regression |

### 数据库模块 (`tests/unit/db/`)

| ID       | 测试用例                            | 预期结果                                         | 标签 |
| -------- | ----------------------------------- | ------------------------------------------------ | ---- |
| UT-DB-01 | getDatabase() 返回数据库实例        | db 有 prepare 方法                               | UT P1 regression |
| UT-DB-02 | getDatabase() 种子数据包含 5 个商品 | COUNT(\*) = 5                                    | UT P1 regression |
| UT-DB-03 | resetDatabase() 重置单例            | 重新调用 getDatabase() 返回新实例，仍有 5 个商品 | UT P1 regression |

### 健康检查路由 (`tests/unit/routes/health.test.js`)

| ID           | 测试用例    | 预期结果              | 标签 |
| ------------ | ----------- | --------------------- | ---- |
| UT-HEALTH-01 | GET /health | 200, `{status: "ok"}` | UT P1 regression |
| UT-HEALTH-02 | GET /ready  | 200, `{ready: true}`  | UT P1 regression |

### 商品路由 (`tests/unit/routes/products.test.js`)

| ID         | 测试用例                         | 预期结果                        | 标签 |
| ---------- | -------------------------------- | ------------------------------- | ---- |
| UT-PROD-01 | GET /api/products 返回分页列表   | 200, data.length = 5, total = 5 | UT P1 regression |
| UT-PROD-02 | GET /api/products?page=1&limit=2 | 200, data.length = 2            | UT P1 regression |
| UT-PROD-03 | GET /api/products/1              | 200, name = "Laptop"            | UT P1 regression |
| UT-PROD-04 | GET /api/products/999 (不存在)   | 404                             | UT P1 regression |
| UT-PROD-05 | POST /api/products 创建商品      | 201, name = "Monitor"           | UT P1 regression |
| UT-PROD-06 | POST /api/products 缺少 name     | 400                             | UT P1 regression |

### 订单路由 (`tests/unit/routes/orders.test.js`)

| ID          | 测试用例                                     | 预期结果                                   | 标签 |
| ----------- | -------------------------------------------- | ------------------------------------------ | ---- |
| UT-ORDER-01 | GET /api/orders 初始为空                     | 200, data.length = 0                       | UT P1 regression |
| UT-ORDER-02 | POST /api/orders 创建订单并扣减库存          | 201, status = "confirmed", total = 1999.98 | UT P1 regression |
| UT-ORDER-03 | POST /api/orders 商品不存在                  | 404                                        | UT P1 regression |
| UT-ORDER-04 | POST /api/orders 库存不足 (quantity: 200000) | 409                                        | UT P1 regression |
| UT-ORDER-05 | POST /api/orders 缺少字段                    | 400                                        | UT P1 regression |

### 指标中间件 (`tests/unit/middleware/metrics.test.js`)

| ID            | 测试用例                     | 预期结果         | 标签 |
| ------------- | ---------------------------- | ---------------- | ---- |
| UT-METRICS-01 | 发送 3 次请求后查询 /metrics | requestCount = 3 | UT P1 regression |
| UT-METRICS-02 | 发送请求后查询 avgDuration   | avgDuration >= 0 | UT P1 regression |

## 性能测试用例表 (k6 + JMeter)

> k6 脚本: `tests/performance/*.k6.js` | JMeter 测试计划: `tests/performance/jmeter/*.jmx`
>
> 两引擎场景镜像，阈值一致。JMeter 额外输出 HTML Report + Grafana 可视化。

### 冒烟测试 (Smoke)

| ID       | 引擎        | 测试场景                   | 负载               | 阈值                         | 标签 |
| -------- | ----------- | -------------------------- | ------------------ | ---------------------------- | ---- |
| SMOKE-01 | k6 + JMeter | GET /health 可用性         | 2 VUs/threads, 30s | status 200, duration < 200ms | PT P1 smoke |
| SMOKE-02 | k6 + JMeter | GET /api/products 列表     | 2 VUs/threads, 30s | status 200                   | PT P1 smoke |
| SMOKE-03 | k6 + JMeter | GET /api/products/:id 详情 | 2 VUs/threads, 30s | status 200                   | PT P1 smoke |
| SMOKE-04 | k6 + JMeter | 全局阈值                   | 2 VUs/threads, 30s | p95 < 500ms, error < 1%      | PT P1 smoke |

### 负载测试 (Load)

| ID      | 引擎        | 测试场景                       | 负载                | 阈值                  | 标签 |
| ------- | ----------- | ------------------------------ | ------------------- | --------------------- | ---- |
| LOAD-01 | k6 + JMeter | 商品列表 + 详情 + 下单混合流量 | ramp 20→50→0, 5m    | p95 < 500ms, p99 < 1s | PT P2 regression |
| LOAD-02 | k6 + JMeter | 请求吞吐量                     | 50 VUs/threads 持续 | rate > 8 req/s        | PT P2 regression |
| LOAD-03 | k6 + JMeter | 全局错误率                     | 50 VUs/threads, 5m  | error < 1%            | PT P2 regression |

### 压力测试 (Stress)

| ID        | 引擎        | 测试场景            | 负载                 | 阈值         | 标签 |
| --------- | ----------- | ------------------- | -------------------- | ------------ | ---- |
| STRESS-01 | k6 + JMeter | 商品 + 下单混合流量 | ramp 50→200→0, 3.5m  | p95 < 1000ms | PT P2 regression |
| STRESS-02 | k6 + JMeter | 高并发错误率        | 200 VUs/threads 峰值 | error < 5%   | PT P2 regression |
| STRESS-03 | k6 + JMeter | 观察降级点          | 逐步增加 VUs/threads | 记录性能拐点 | PT P2 regression |

### 尖峰测试 (Spike)

| ID       | 引擎        | 测试场景               | 负载                 | 阈值                 | 标签 |
| -------- | ----------- | ---------------------- | -------------------- | -------------------- | ---- |
| SPIKE-01 | k6 + JMeter | 突增到 100 VUs/threads | 5→100 (5s 内)        | p95 < 2000ms         | PT P2 regression |
| SPIKE-02 | k6 + JMeter | 保持尖峰               | 100 VUs/threads, 30s | error < 10%          | PT P2 regression |
| SPIKE-03 | k6 + JMeter | 恢复到基线             | 100→5, 观察 30s      | 性能恢复到尖峰前水平 | PT P2 regression |

### JMeter 报告与可视化

| ID        | 验证项                                            | 预期结果                                 | 标签 |
| --------- | ------------------------------------------------- | ---------------------------------------- | ---- |
| JM-RPT-01 | `jmeter -g results.jtl -o reports/` 生成完整 HTML | reports/ 目录包含 index.html             | PT P2 regression |
| JM-RPT-02 | 报告包含 Summary 统计                             | 显示 total requests, error %, throughput | PT P2 regression |
| JM-RPT-03 | 报告包含 Response Time 图表                       | 折线图可渲染                             | PT P2 regression |
| JM-GRF-01 | Backend Listener → InfluxDB                       | jmeter DB 有数据写入                     | PT P3 full |
| JM-GRF-02 | Grafana JMeter dashboard 加载                     | 6 个面板渲染正常                         | PT P3 full |
| JM-GRF-03 | Active Threads 面板                               | 显示线程数变化曲线                       | PT P3 full |
| JM-GRF-04 | Response Time 面板                                | 显示 avg/p90/p95 延迟                    | PT P3 full |

### k6 报告验证

#### 生成完整性

> 每个 k6 npm script 通过 `--out 'web-dashboard=export=reports/k6-*.html'` 输出独立 HTML 报告。

| ID        | 验证项                | 预期结果                               | 验证命令                                            | 标签 |
| --------- | --------------------- | -------------------------------------- | --------------------------------------------------- | ---- |
| K6-RPT-01 | smoke 生成 HTML 报告  | `reports/k6-smoke.html` 存在且 > 0 KB  | `npm run k6:smoke && ls -l reports/k6-smoke.html`   | PT P1 smoke |
| K6-RPT-02 | load 生成 HTML 报告   | `reports/k6-load.html` 存在且 > 0 KB   | `npm run k6:load && ls -l reports/k6-load.html`     | PT P2 regression |
| K6-RPT-03 | stress 生成 HTML 报告 | `reports/k6-stress.html` 存在且 > 0 KB | `npm run k6:stress && ls -l reports/k6-stress.html` | PT P2 regression |
| K6-RPT-04 | spike 生成 HTML 报告  | `reports/k6-spike.html` 存在且 > 0 KB  | `npm run k6:spike && ls -l reports/k6-spike.html`   | PT P2 regression |

#### 内容完整性

> 以 smoke 报告为基准验证，其余报告结构一致。

| ID        | 验证项                               | 预期结果                            | 验证方式                      | 标签 |
| --------- | ------------------------------------ | ----------------------------------- | ----------------------------- | ---- |
| K6-RPT-05 | 报告包含 SLA 指标 (p95 + error rate) | p95、error rate 数值与 CLI 输出一致 | 浏览器对比 HTML vs CLI stdout | PT P2 regression |
| K6-RPT-06 | 报告包含 Response Time 趋势图        | 时间轴折线图可渲染，无空白          | 浏览器打开 HTML               | PT P2 regression |
| K6-RPT-07 | 报告包含 Threshold 结果 (PASS/FAIL)  | 与 CLI `✓`/`✗` 一致                 | 浏览器对比 HTML vs CLI stdout | PT P2 regression |

### CI 门禁

| ID       | 验证项                         | 预期结果                | 标签 |
| -------- | ------------------------------ | ----------------------- | ---- |
| JM-CI-01 | JMeter smoke test 在 CI 中运行 | GitHub Actions job 成功 | CI P1 smoke |
| JM-CI-02 | 错误率 > 1% 时 CI 失败         | exit code 非 0          | CI P1 smoke |
| JM-CI-03 | .jtl 结果上传为 artifact       | 可在 Actions 中下载     | CI P1 smoke |
