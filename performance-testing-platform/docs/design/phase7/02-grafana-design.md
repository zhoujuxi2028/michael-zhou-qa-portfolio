# Grafana Dashboard 设计

## 新增 3 个面板

### 1. 错误分布面板 (PERF-OBS-FR-001)

**Query:**
```sql
SELECT time, endpoint, error_rate FROM measurement WHERE test=soak
```

**Visualization:** Graph (line) - 按 endpoint 分组

---

### 2. 延迟热力图 (PERF-OBS-FR-002)

**Query:**
```sql
SELECT time, p95_ms, p99_ms FROM measurement
```

**Visualization:** Heatmap - 请求延迟分布

---

### 3. 自定义指标聚合 (PERF-OBS-FR-003)

**Metrics:**
- `soak_heap_used_mb` (Trend from k6)
- `soak_event_loop_lag` (Trend)
- `soak_order_success_rate` (Counter)

**Visualization:** Multi-line graph

---

## 告警规则 (PERF-OBS-FR-004)

| 规则 | 条件 | 触发动作 |
|------|------|---------|
| High p95 | p95 > 500ms for 5m | ⚠️ Alert → Webhook |
| Error Spike | error_rate > 1% | ⚠️ Alert → Webhook |
| Memory Growth | heap持续增长 2h | ⚠️ Alert → Webhook |

**Webhook 配置：** Contact Points → Webhook (目标 URL 由用户配置)

---

## 实现步骤

1. 导入现有 dashboard JSON
2. 新增 3 个 panel definition
3. 配置 InfluxDB datasource query
4. 配置告警规则
5. 导出 dashboard JSON to `grafana/dashboards/performance-dashboard.json`
