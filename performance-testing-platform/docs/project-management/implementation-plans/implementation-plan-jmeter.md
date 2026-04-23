# JMeter Implementation Plan（JMeter 实施计划）

**Issue:** [#17 — New project: Performance Testing Platform (k6/JMeter)](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17)
**Branch:** `feature/performance-testing`
**Date:** 2026-03-28

---

## 目录

- [1. 概述](#1-概述)
- [2. 前置条件](#2-前置条件)
- [3. 文件结构](#3-文件结构)
- [4. 任务拆分](#4-任务拆分)
- [5. npm Scripts](#5-npm-scripts)
- [6. CI Pipeline](#6-ci-pipeline)
- [7. Reviewer 修复记录](#7-reviewer-修复记录)

---

## 1. 概述

在现有 k6 测试基础上，添加 JMeter 企业级性能测试引擎，实现双引擎测试能力。

| 维度     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| 目标     | 4 种测试模式 (smoke/load/stress/spike) 与 k6 参数一致   |
| 模式     | CLI non-GUI 模式 (`jmeter -n -t ...`)                   |
| 报告     | HTML Dashboard Report (`-e -o reports/`)                |
| 可观测   | Backend Listener → InfluxDB → Grafana                   |
| CI       | JMeter smoke test 作为性能门禁                          |
| 线程建模 | 仅使用标准 JMeter 组件（多 ThreadGroup 模拟分阶段负载） |

---

## 2. 前置条件

| 工具    | 验证命令           | 安装命令              |
| ------- | ------------------ | --------------------- |
| JMeter  | `jmeter --version` | `brew install jmeter` |
| Node.js | `node --version`   | 已安装                |
| Docker  | `docker --version` | 已安装                |

> **注意:** 不依赖 JMeter 第三方插件（Ultimate Thread Group / Stepping Thread Group 等），所有测试计划仅使用标准 JMeter 组件。

### JMeter 堆内存配置

stress/spike 测试（200 threads）可能需要增大堆内存：

```bash
export JVM_ARGS="-Xms1g -Xmx2g"
jmeter -n -t tests/jmeter/stress.jmx ...
```

---

## 3. 文件结构

```
tests/jmeter/
├── config/
│   ├── smoke.properties       # smoke 参数 (threads=2, duration=30)
│   ├── load.properties        # load 参数 (threads=50, ramp-up, duration)
│   ├── stress.properties      # stress 参数 (threads=200, staged ramp)
│   └── spike.properties       # spike 参数 (threads=100, burst)
├── smoke.jmx                  # 冒烟测试计划
├── load.jmx                   # 负载测试计划
├── stress.jmx                 # 压力测试计划
└── spike.jmx                  # 尖峰测试计划

grafana/
├── dashboards/
│   ├── k6-results.json        # k6 Grafana dashboard (已有)
│   └── jmeter-results.json    # JMeter Grafana dashboard (新增)
└── provisioning/datasources/
    ├── influxdb.yml           # k6 数据源 (db=k6, 已有)
    └── influxdb-jmeter.yml    # JMeter 数据源 (db=jmeter, 新增)

results/                       # .jtl 结果文件 (gitignored)
reports/                       # HTML 报告输出 (gitignored)
```

---

## 4. 任务拆分

### Task J1: JMeter Smoke Test Plan

**文件:** `tests/jmeter/smoke.jmx` + `tests/jmeter/config/smoke.properties`

**JMX 结构:**

```xml
<TestPlan>
  <ThreadGroup>                        <!-- 线程组: ${threads} users, ${duration}s -->
    <HTTPSamplerProxy>                 <!-- GET /health -->
    <HTTPSamplerProxy>                 <!-- GET /api/products -->
    <HTTPSamplerProxy>                 <!-- GET /api/products/1 -->
    <ResponseAssertion>                <!-- status = 200 -->
    <ConstantTimer>                    <!-- think time: 1000ms -->
    <BackendListener>                  <!-- InfluxDB (条件启用) -->
  </ThreadGroup>
</TestPlan>
```

> **注意:** 不使用 DurationAssertion。k6 的阈值是 p95<500ms（百分位），JMeter 的 DurationAssertion 是逐请求断言，会产生更严格的误判。阈值验证统一在 CI 中通过 .jtl 文件解析 p95 实现。

**Properties:**

```properties
# smoke.properties
threads=2
duration=30
rampup=5
base_url=localhost
port=3000
```

**验收:** `jmeter -n -t tests/jmeter/smoke.jmx -q tests/jmeter/config/smoke.properties` 成功运行，无错误

---

### Task J2: JMeter Load Test Plan

**文件:** `tests/jmeter/load.jmx` + `tests/jmeter/config/load.properties`

**与 k6 对齐:**

| 参数        | k6 load.k6.js              | JMeter load.jmx                                                                                                                        |
| ----------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| VUs/Threads | 20→50→0                    | 多 ThreadGroup 模拟分阶段 ramp: TG1(20 threads, ramp 60s, hold 60s) + TG2(30 threads, delay 60s, ramp 60s, hold 120s) + TG3(ramp-down) |
| 时长        | 5m                         | 5m (300s)                                                                                                                              |
| 场景        | products + detail + orders | 相同 3 个 HTTP Sampler                                                                                                                 |
| 阈值        | p95<500ms, p99<1s, err<1%  | CI 解析 .jtl 验证 p95 + 错误率                                                                                                         |

> **不使用 Ultimate Thread Group 插件**（非标准组件），改用多个标准 ThreadGroup 配合 delay 和 ramp-up 参数模拟分阶段负载。

**Properties:**

```properties
# load.properties
threads_phase1=20
threads_phase2=50
duration=300
rampup=60
base_url=localhost
port=3000
```

**验收:** 运行完成，生成 .jtl 结果文件，HTML 报告可查看

---

### Task J3: JMeter Stress Test Plan

**文件:** `tests/jmeter/stress.jmx` + `tests/jmeter/config/stress.properties`

**与 k6 对齐:**

| 参数        | k6 stress.k6.js      | JMeter stress.jmx                                                                                                   |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| VUs/Threads | 50→100→150→200→200→0 | 4 个标准 ThreadGroup 模拟阶梯递增: TG1(50, 0s delay) + TG2(50, 30s delay) + TG3(50, 60s delay) + TG4(50, 90s delay) |
| 时长        | 3.5m                 | 3.5m (210s)                                                                                                         |
| 场景        | products + orders    | 相同 HTTP Sampler                                                                                                   |
| 阈值        | p95<1s, err<5%       | CI 解析 .jtl 验证                                                                                                   |

> **堆内存:** 200 threads 建议 `JVM_ARGS="-Xms1g -Xmx2g"`

**Properties:**

```properties
# stress.properties
threads_per_stage=50
stages=4
duration=210
base_url=localhost
port=3000
```

---

### Task J4: JMeter Spike Test Plan

**文件:** `tests/jmeter/spike.jmx` + `tests/jmeter/config/spike.properties`

**与 k6 对齐:**

| 参数        | k6 spike.k6.js    | JMeter spike.jmx                                                                                                                                |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| VUs/Threads | 5→100→100→5→5→0   | 3 个标准 ThreadGroup: TG1(5 threads, 0s delay, 10s ramp, hold 全程) + TG2(95 threads, 10s delay, 5s ramp, hold 30s then stop) + TG3(恢复观察期) |
| 时长        | 1.5m              | 1.5m (90s)                                                                                                                                      |
| 场景        | health + products | 相同 HTTP Sampler                                                                                                                               |
| 阈值        | p95<2s, err<10%   | CI 解析 .jtl 验证                                                                                                                               |

> **不使用 Synchronizing Timer**（用途是线程同步，非尖峰模拟）。改用多 ThreadGroup 配合 delay 参数模拟突增和回落。

**Properties:**

```properties
# spike.properties
threads_base=5
threads_spike=95
spike_rampup=5
duration=90
base_url=localhost
port=3000
```

---

### Task J5: JMeter HTML Report + Grafana Dashboard

**HTML Report:**

```bash
# 运行前清理旧结果（JMeter 不允许覆盖已有目录）
rm -rf reports/jmeter-smoke results/jmeter-smoke.jtl
jmeter -n -t tests/jmeter/smoke.jmx -q tests/jmeter/config/smoke.properties \
  -l results/jmeter-smoke.jtl -e -o reports/jmeter-smoke
```

**InfluxDB 双数据库配置:**

docker-compose.yml 的 InfluxDB 使用 init 脚本创建两个数据库：

```yaml
influxdb:
  image: influxdb:1.8
  ports:
    - '8086:8086'
  environment:
    - INFLUXDB_DB=k6
    - INFLUXDB_HTTP_AUTH_ENABLED=false
  volumes:
    - ./influxdb/init.iql:/docker-entrypoint-initdb.d/init.iql
```

`influxdb/init.iql`:

```sql
CREATE DATABASE "jmeter"
```

> InfluxDB 1.8 的 `INFLUXDB_DB=k6` 只创建一个默认数据库。通过 init 脚本额外创建 `jmeter` 数据库。

**Grafana 数据源:** 新增 `grafana/provisioning/datasources/influxdb-jmeter.yml`

```yaml
apiVersion: 1
datasources:
  - name: InfluxDB-JMeter
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: jmeter
    isDefault: false
```

**Grafana Dashboard:** `grafana/dashboards/jmeter-results.json`

| 面板                            | 数据源          | 查询                                                                                  |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------- |
| Active Threads                  | InfluxDB-JMeter | `SELECT last("maxAT") FROM "jmeter" WHERE "statut"='all'`                             |
| Response Time (avg/p90/p95/p99) | InfluxDB-JMeter | `SELECT mean("avg"), mean("pct90.0"), mean("pct95.0"), mean("pct99.0") FROM "jmeter"` |
| Throughput (req/s)              | InfluxDB-JMeter | `SELECT sum("count") FROM "jmeter" WHERE $timeFilter GROUP BY time($__interval)`      |
| Error Rate                      | InfluxDB-JMeter | `SELECT mean("countError") / mean("count") * 100 FROM "jmeter"`                       |
| Response Time Distribution      | InfluxDB-JMeter | `SELECT mean("avg") FROM "jmeter" GROUP BY "transaction"`                             |
| Top 5 Slowest Requests          | InfluxDB-JMeter | `SELECT mean("avg") FROM "jmeter" GROUP BY "transaction" ORDER BY mean DESC LIMIT 5`  |

> **注意:** JMeter InfluxDB Backend Listener 的 `statut` 字段确实是法语拼写（非 `status`），这是 JMeter 源码的已知行为。

**Backend Listener 配置 (在 .jmx 中):**

```xml
<BackendListener>
  <stringProp name="classname">org.apache.jmeter.visualizers.backend.influxdb.InfluxdbBackendListenerClient</stringProp>
  <stringProp name="influxdbUrl">http://localhost:8086/write?db=jmeter</stringProp>
  <stringProp name="application">performance-testing-platform</stringProp>
</BackendListener>
```

---

### Task J6: npm Scripts + .gitignore + Docker Compose

**npm scripts (追加到 package.json):**

> 每个 script 先清理旧结果，避免 JMeter 因目录已存在而失败。

```json
{
  "jmeter:smoke": "rm -rf reports/jmeter-smoke results/jmeter-smoke.jtl && jmeter -n -t tests/jmeter/smoke.jmx -q tests/jmeter/config/smoke.properties -l results/jmeter-smoke.jtl -e -o reports/jmeter-smoke",
  "jmeter:load": "rm -rf reports/jmeter-load results/jmeter-load.jtl && jmeter -n -t tests/jmeter/load.jmx -q tests/jmeter/config/load.properties -l results/jmeter-load.jtl -e -o reports/jmeter-load",
  "jmeter:stress": "rm -rf reports/jmeter-stress results/jmeter-stress.jtl && jmeter -n -t tests/jmeter/stress.jmx -q tests/jmeter/config/stress.properties -l results/jmeter-stress.jtl -e -o reports/jmeter-stress",
  "jmeter:spike": "rm -rf reports/jmeter-spike results/jmeter-spike.jtl && jmeter -n -t tests/jmeter/spike.jmx -q tests/jmeter/config/spike.properties -l results/jmeter-spike.jtl -e -o reports/jmeter-spike"
}
```

**docker-compose.yml 更新:**

- InfluxDB 添加 init 脚本卷挂载，创建 `jmeter` 数据库
- 详见 Task J5

**.gitignore 追加:**

```
results/
reports/
*.jtl
apache-jmeter-*/
```

---

### Task J7: CI Pipeline — JMeter Smoke Gate

**更新 `.github/workflows/performance-ci.yml`:**

```yaml
jmeter-smoke-test:
  runs-on: ubuntu-latest
  needs: unit-tests
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: npm
        cache-dependency-path: performance-testing-platform/package-lock.json
    - run: npm ci
    - name: Install JMeter
      run: |
        sudo apt-get update
        sudo apt-get install -y default-jre
        wget -q https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.3.tgz
        tar -xzf apache-jmeter-5.6.3.tgz
        echo "$PWD/apache-jmeter-5.6.3/bin" >> $GITHUB_PATH
    - name: Start target API
      run: node src/server.js &
    - name: Wait for API
      run: |
        for i in $(seq 1 10); do
          curl -sf http://localhost:3000/health && break
          sleep 1
        done
    - name: Run JMeter smoke test (performance gate)
      run: jmeter -n -t tests/jmeter/smoke.jmx -q tests/jmeter/config/smoke.properties -l results/jmeter-smoke.jtl
    - name: Check JMeter results (fail on errors)
      run: |
        ERROR_COUNT=$(tail -n +2 results/jmeter-smoke.jtl | awk -F',' '{if($8=="false") count++} END{print count+0}')
        TOTAL_COUNT=$(tail -n +2 results/jmeter-smoke.jtl | wc -l | tr -d ' ')
        echo "Errors: $ERROR_COUNT / Total: $TOTAL_COUNT"
        if [ "$TOTAL_COUNT" -eq 0 ]; then
          echo "FAIL: No test results found"
          exit 1
        fi
        ERROR_RATE=$(echo "scale=4; $ERROR_COUNT / $TOTAL_COUNT * 100" | bc)
        echo "Error rate: ${ERROR_RATE}%"
        if [ "$(echo "$ERROR_RATE >= 1.0" | bc)" -eq 1 ]; then
          echo "FAIL: Error rate >= 1% threshold"
          exit 1
        fi
    - name: Stop API
      if: always()
      run: kill $(lsof -ti:3000) 2>/dev/null || true
    - name: Upload JMeter results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: jmeter-smoke-results
        path: performance-testing-platform/results/
```

> **错误率阈值:** 使用 `>= 1.0` 与 k6 的 `rate<0.01` 保持严格一致（k6 是 strictly less than 1%）。

---

## 5. npm Scripts（完整列表）

| Script          | 命令                                      |
| --------------- | ----------------------------------------- |
| `jmeter:smoke`  | 清理旧结果 + 运行 smoke test + HTML 报告  |
| `jmeter:load`   | 清理旧结果 + 运行 load test + HTML 报告   |
| `jmeter:stress` | 清理旧结果 + 运行 stress test + HTML 报告 |
| `jmeter:spike`  | 清理旧结果 + 运行 spike test + HTML 报告  |

---

## 6. CI Pipeline

```
lint → unit-tests → ┬─ k6 smoke gate
                   └─ jmeter smoke gate
```

k6 和 JMeter smoke test 并行运行，两者都通过才算 CI 绿灯。

---

## 7. Reviewer 修复记录

| #   | 问题                                        | 严重度 | 修复                                                 |
| --- | ------------------------------------------- | ------ | ---------------------------------------------------- |
| 1   | DurationAssertion ≠ p95 阈值，会产生误判    | High   | 移除 DurationAssertion，改用 CI .jtl 解析验证        |
| 2   | InfluxDB 双数据库未明确配置                 | High   | 添加 init.iql 脚本 + 独立 Grafana 数据源             |
| 3   | CI lsof 可用性风险                          | High   | 保持与现有 k6 CI 一致（ubuntu-latest 默认包含 lsof） |
| 4   | npm scripts 重跑失败（目录已存在）          | Medium | 每个 script 前加 `rm -rf` 清理                       |
| 5   | Ultimate/Stepping Thread Group 是第三方插件 | Medium | 改用多个标准 ThreadGroup + delay 参数模拟分阶段负载  |
| 6   | Spike 测试用 SynchronizingTimer 建模错误    | Medium | 改用多 ThreadGroup + 快速 ramp-up 模拟突增           |
| 7   | 错误率边界条件 (< vs >=)                    | Medium | CI 改用 `>= 1.0` 与 k6 `rate<0.01` 严格一致          |
| 8   | Throughput InfluxQL 查询数学错误            | Low    | 修正为 `sum("count") GROUP BY time($__interval)`     |
| 9   | .gitignore 不完整                           | Low    | 添加 `*.jtl` 和 `apache-jmeter-*/`                   |
| 10  | 200 threads 无堆内存配置指导                | Low    | 添加 JVM_ARGS 配置说明                               |
