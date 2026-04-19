# Phase 2 测试用例 — 系统指标采集 + 容量测试 (#54)

## 测试对象 — 漏斗模型

| 操作         | API                     | 权重 | 特征                         |
| ------------ | ----------------------- | ---- | ---------------------------- |
| 浏览商品列表 | `GET /api/products`     | 60%  | 读操作                       |
| 查看商品详情 | `GET /api/products/:id` | 30%  | 读操作                       |
| 下单购买     | `POST /api/orders`      | 10%  | 写操作 (事务锁 + 50ms delay) |

## 系统指标采集用例

| 用例 ID  | 测试项                      | 验收标准                                                | 标签 |
| -------- | --------------------------- | ------------------------------------------------------- | ---- |
| SM-UT-01 | `/metrics` 返回 CPU 指标    | `cpu.user >= 0`, `cpu.loadavg` 长度 3                   | UT P1 regression |
| SM-UT-02 | `/metrics` 返回内存指标     | `memory.rss > 0`, `memory.heapUsed > 0`                 | UT P1 regression |
| SM-UT-03 | `/metrics` 返回事件循环延迟 | `eventLoop.lag >= 0`                                    | UT P1 regression |
| SM-IT-01 | 采集器生成 CSV              | `reports/system-metrics-*.csv` 包含 CPU/mem/disk/net 列 | IT P2 regression |
| SM-IT-02 | 采集器每秒记录              | CSV 行间 timestamp 差 ≈ 1s                              | IT P2 regression |
| SM-IT-03 | 采集器优雅退出              | SIGTERM 后 CSV 文件完整，无截断                         | IT P2 regression |

## Cluster 模式用例

### 单元测试 (`tests/unit/cluster.test.js`)

| 用例 ID  | 测试项                         | 验收标准                                          | 标签 |
| -------- | ------------------------------ | ------------------------------------------------- | ---- |
| CLU-01a  | fork 数等于 CPU 核心数 (4 核)  | `cluster.fork()` 被调用 4 次                      | UT P1 regression |
| CLU-01b  | fork 数等于 CPU 核心数 (2 核)  | `cluster.fork()` 被调用 2 次                      | UT P1 regression |
| CLU-01c  | fork 数等于 CPU 核心数 (8 核)  | `cluster.fork()` 被调用 8 次                      | UT P1 regression |
| CLU-01d  | Primary 输出启动日志           | 日志匹配 `Master.*starting.*N.*workers`           | UT P1 regression |
| CLU-01e  | Primary 注册 exit 监听器       | `cluster.on('exit', fn)` 被调用                   | UT P1 regression |
| CLU-02a  | Worker require("./server")     | Worker 分支加载 server 模块                       | UT P1 regression |
| CLU-02b  | Worker 不调用 fork()           | Worker 分支不创建子进程                           | UT P1 regression |
| CLU-02c  | Worker 不注册 exit 监听器      | Worker 分支不监听 exit 事件                       | UT P1 regression |
| CLU-03a  | exit 触发 fork 重建            | Worker exit 回调中调用 `cluster.fork()`           | UT P1 regression |
| CLU-03b  | 重启日志含 PID                 | 日志匹配 `Worker.*PID.*died.*restarting`          | UT P1 regression |
| CLU-03c  | 多 Worker 连续退出均触发 fork  | 3 个 Worker 退出 → fork 调用 +3 次               | UT P1 regression |
| CLU-04a  | 单核 CPU 只 fork 1 个 Worker   | `cluster.fork()` 被调用 1 次                      | UT P2 regression |

### 集成测试 (`tests/integration/cluster.integration.test.js`)

| 用例 ID     | 测试项                       | 验收标准                                          | 标签 |
| ----------- | ---------------------------- | ------------------------------------------------- | ---- |
| CLU-INT-01  | cluster 模式可响应 HTTP 请求 | 启动后 `/health` 返回 `{status: "ok"}`            | IT P1 regression |
| CLU-INT-02  | Worker 崩溃后服务自动恢复    | kill Worker → 重启 → `/health` 恢复正常           | IT P1 regression |
| CLU-INT-03  | SIGTERM 后端口释放           | 发送 SIGTERM → 进程退出 → 端口无占用              | IT P2 regression |

## 容量测试用例

| 用例 ID | 测试项                            | 验收标准                                      | 标签 |
| ------- | --------------------------------- | --------------------------------------------- | ---- |
| CAP-01  | 容量测试脚本可运行                | `npm run capacity:test` 正常完成              | IT P2 regression |
| CAP-02  | 系统指标 CSV 生成                 | `reports/system-metrics.csv` 数据完整         | IT P2 regression |
| CAP-03  | k6 HTML 报告生成                  | `reports/k6-capacity.html` 可打开查看         | IT P2 regression |
| CAP-04  | 漏斗模型流量分布                  | 实际比例接近 60:30:10                         | PT P3 full |
| CAP-05  | 二分法找到最大并发 (Cluster 模式) | 确定满足 SLA 的最大 VUs (4 核)                | PT P3 full |
| CAP-06  | 瓶颈层定位                        | 根据系统指标判断 CPU / Memory / I/O / Network | PT P3 full |

## 测试质量保障用例

| 用例 ID  | 测试项         | 验收标准                                    | 标签 |
| -------- | -------------- | ------------------------------------------- | ---- |
| TQ-IT-01 | 数据膨胀控制   | 每轮测试前重启服务，DB 文件大小重置         | IT P2 regression |
| TQ-IT-02 | 预热不影响 SLA | 前 30s warm-up 数据不纳入 SLA 判定          | IT P2 regression |
| TQ-IT-03 | 测试隔离       | 两轮测试间重启服务，结果无上一轮残留影响    | IT P2 regression |
| TQ-IT-04 | 结果可重复性   | 拐点附近关键轮次跑 3 次，p95 中值偏差 < 20% | IT P2 regression |
