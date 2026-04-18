# Grafana Dashboard 设计

## 环境要求

| 组件 | 版本 | 查询语言 | 备注 |
|------|------|---------|------|
| InfluxDB | 1.8 | InfluxQL | 当前生产版本 |
| Grafana | 10.2.0 | - | 支持 InfluxQL 1.8 |

**注:** 本设计使用 **InfluxQL** 查询语言，完全兼容 InfluxDB 1.8。若升级至 2.x，需使用 Flux 语言重写查询。

---

## 新增 3 个面板

### 1. 错误分布面板 (PERF-OBS-DASH-FR-001)

**Query (InfluxQL):**
```sql
SELECT sum("value") FROM "http_req_failed"
WHERE $timeFilter
GROUP BY time($__interval), "endpoint"
```

**Visualization:** Graph (line) - 按 endpoint 分组

---

### 2. 延迟热力图 (PERF-OBS-DASH-FR-002)

**Query (InfluxQL):**
```sql
SELECT mean("value") FROM "http_req_duration"
WHERE $timeFilter
GROUP BY time($__interval), "endpoint"
```

**Visualization:** Heatmap - 请求延迟分布

---

### 3. 自定义指标聚合 (PERF-OBS-DASH-FR-003)

**Metrics:**
- `soak_heap_used_mb` (Trend from k6)
- `soak_event_loop_lag` (Trend)
- `soak_order_success_rate` (Counter)

**Visualization:** Multi-line graph

---

## 告警规则 (PERF-OBS-ALERT-FR-001)

### SLA 与告警阈值对应表

| 指标 | SLA | Warning 级别 | Critical 级别 | 告警延迟 |
|------|------|-------------|---------------|---------|
| p95 延迟 | 500ms | 400ms (≤5m) | 1000ms (≤2m) | 300s/120s |
| 错误率 | 1% | 0.5% (≤5m) | 5% (≤2m) | 300s/120s |
| 内存增长 | 无限制 | 200MB/h | 500MB/h | 1h/30m |

### 告警规则详细定义

| 规则 | 条件 | 级别 | 触发动作 | 目的 |
|------|------|------|---------|------|
| High p95 Warning | p95 > 400ms for 5m | ⚠️ Warning | Webhook (info) | 提前告警，SLA 前 100ms 预警 |
| High p95 Critical | p95 > 1000ms for 2m | 🔴 Critical | Webhook (critical) + Page | SLA 突破，2 倍之上，立即告警 |
| Error Spike Warning | error_rate > 0.5% for 5m | ⚠️ Warning | Webhook (info) | 提前告警，SLA 前 0.5% 预警 |
| Error Spike Critical | error_rate > 5% for 2m | 🔴 Critical | Webhook (critical) + Page | SLA 突破 5 倍，立即告警 |
| Memory Growth | heap 增长 > 200MB/h for 1h | ⚠️ Warning | Webhook (info) | 检测内存泄漏趋势 |
| Memory Overflow | heap 增长 > 500MB/h for 30m | 🔴 Critical | Webhook (critical) + Page | 内存溢出风险 |

**Webhook 配置：** Contact Points → Webhook (目标 URL 由用户配置)

---

## Webhook 配置示例 (PERF-OBS-ALERT-FR-001-WEBHOOK)

### 方式 1: 本地测试 - curl 模拟告警

```bash
# 测试告警发送
curl -X POST http://localhost:9000/webhook/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighP95",
          "severity": "warning"
        },
        "annotations": {
          "summary": "p95 latency > 400ms",
          "description": "Current p95: 450ms"
        }
      }
    ]
  }'
```

### 方式 2: 生产接收端 - Flask 服务

参考 `grafana/examples/webhook-receiver.py` 部署告警接收端:

```bash
# 1. 启动接收端
python3 grafana/examples/webhook-receiver.py

# 2. 在 Grafana 中配置 Webhook
# Contact Points → New contact point → Webhook
# URL: http://<your-server>:9000/webhook/alerts
# Method: POST
# Headers: Content-Type: application/json

# 3. 测试告警规则
# 在 Alert rule 中选择该 contact point
```

**接收端响应示例:**

```json
{
  "received_at": "2026-04-17T12:34:56Z",
  "alerts_count": 1,
  "alerts": [
    {
      "alert_name": "HighP95",
      "status": "firing",
      "value": "450ms"
    }
  ]
}
```

---

## 实现步骤

1. 导入现有 dashboard JSON
2. 新增 3 个 panel definition
3. 配置 InfluxDB datasource query
4. 配置告警规则
5. 导出 dashboard JSON to `grafana/dashboards/performance-dashboard.json`
