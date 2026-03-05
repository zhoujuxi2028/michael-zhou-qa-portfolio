# API 文档

**应用**: K8S Test Application
**版本**: 1.0.0
**基础 URL**: `http://localhost:8080` (容器内) / `http://localhost:30080` (NodePort)

---

## 概述

本应用是一个 FastAPI 测试应用，用于 Kubernetes HPA、Deployment 和 Service 的自动化测试。提供健康检查、负载生成、Prometheus 指标等功能。

---

## 端点列表

| 端点 | 方法 | 用途 | 参数 |
|------|------|------|------|
| `/` | GET | 根端点，返回应用信息 | - |
| `/health` | GET | 健康检查 (Liveness Probe) | - |
| `/ready` | GET | 就绪检查 (Readiness Probe) | - |
| `/metrics` | GET | Prometheus 指标 (文本格式) | - |
| `/metrics/json` | GET | JSON 格式资源使用情况 | - |
| `/info` | GET | Pod 信息 | - |
| `/cpu-load` | GET | 生成 CPU 负载 | `duration` (int) |
| `/memory-load` | GET | 分配内存 | `size_mb` (int) |
| `/memory-release` | GET | 释放内存 | - |
| `/version` | GET | 应用版本 | - |
| `/env` | GET | 环境变量 (调试用) | - |

---

## 端点详情

### GET /

根端点，返回应用基本信息。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/
```

**响应**:
```json
{
  "message": "K8S Auto Testing Platform - Test Application",
  "status": "running",
  "timestamp": "2026-03-05T10:30:00.123456",
  "hostname": "k8s-test-app-7d8f9b6c5d-abc12",
  "version": "1.0.0"
}
```

---

### GET /health

健康检查端点，用于 Kubernetes Liveness Probe。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/health
```

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

**K8S 配置**:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

### GET /ready

就绪检查端点，用于 Kubernetes Readiness Probe。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/ready
```

**响应**:
```json
{
  "status": "ready",
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

**K8S 配置**:
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 3
```

---

### GET /metrics

Prometheus 指标端点，返回文本格式的指标数据。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/metrics
```

**响应** (text/plain):
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health",status="200"} 42.0

# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/health",le="0.01"} 40.0

# HELP app_cpu_usage_percent Application CPU usage percentage
# TYPE app_cpu_usage_percent gauge
app_cpu_usage_percent 15.5

# HELP app_memory_usage_percent Application memory usage percentage
# TYPE app_memory_usage_percent gauge
app_memory_usage_percent 45.2
```

**Prometheus 指标列表**:

| 指标名 | 类型 | 标签 | 说明 |
|--------|------|------|------|
| `http_requests_total` | Counter | method, endpoint, status | HTTP 请求总数 |
| `http_request_duration_seconds` | Histogram | method, endpoint | 请求延迟 |
| `http_active_requests` | Gauge | - | 活跃请求数 |
| `app_cpu_usage_percent` | Gauge | - | CPU 使用率 |
| `app_memory_usage_percent` | Gauge | - | 内存使用率 |
| `app_memory_allocated_mb` | Gauge | - | 已分配内存 (MB) |
| `app_scaling_events_total` | Counter | event_type | 扩缩容事件 |
| `app_pod_info` | Gauge | hostname, namespace, pod_ip | Pod 信息 |

---

### GET /metrics/json

JSON 格式的资源使用情况。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/metrics/json
```

**响应**:
```json
{
  "cpu_percent": 15.5,
  "memory_percent": 45.2,
  "memory_available_mb": 4096.5,
  "hostname": "k8s-test-app-7d8f9b6c5d-abc12",
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

---

### GET /info

返回 Pod 详细信息。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/info
```

**响应**:
```json
{
  "hostname": "k8s-test-app-7d8f9b6c5d-abc12",
  "pod_name": "k8s-test-app-7d8f9b6c5d-abc12",
  "pod_namespace": "k8s-testing",
  "pod_ip": "10.1.0.15",
  "node_name": "docker-desktop",
  "service_account": "default",
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

---

### GET /cpu-load

生成 CPU 负载，用于触发 HPA 扩容。

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `duration` | int | 10 | 持续时间 (秒) |

**请求**:
```bash
# 生成 30 秒 CPU 负载
curl --noproxy '*' "http://localhost:30080/cpu-load?duration=30"
```

**响应**:
```json
{
  "message": "CPU load generated for 30 seconds",
  "result": 499999500000000,
  "timestamp": "2026-03-05T10:30:30.123456"
}
```

**注意**: 此端点会阻塞直到负载生成完成。

---

### GET /memory-load

分配内存，用于测试内存扩容。

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size_mb` | int | 100 | 分配内存大小 (MB) |

**请求**:
```bash
# 分配 200MB 内存
curl --noproxy '*' "http://localhost:30080/memory-load?size_mb=200"
```

**响应**:
```json
{
  "message": "Allocated 200MB of memory",
  "total_allocations": 1,
  "memory_percent": 55.3,
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

**注意**: 多次调用会累积分配内存。

---

### GET /memory-release

释放所有已分配的内存。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/memory-release
```

**响应**:
```json
{
  "message": "Released 3 memory allocations",
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

---

### GET /version

返回应用版本信息。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/version
```

**响应**:
```json
{
  "version": "1.0.0",
  "name": "k8s-test-app",
  "build_date": "2026-03-02"
}
```

---

### GET /env

返回环境变量 (仅用于调试)。

**请求**:
```bash
curl --noproxy '*' http://localhost:30080/env
```

**响应**:
```json
{
  "environment": {
    "HOSTNAME": "k8s-test-app-7d8f9b6c5d-abc12",
    "POD_NAMESPACE": "k8s-testing",
    "POD_IP": "10.1.0.15",
    "NODE_NAME": "docker-desktop",
    "PATH": "/usr/local/bin:/usr/bin:/bin",
    ...
  },
  "timestamp": "2026-03-05T10:30:00.123456"
}
```

**安全警告**: 此端点可能暴露敏感信息，生产环境应禁用。

---

## OpenAPI / Swagger

FastAPI 自动生成 OpenAPI 文档:

- **Swagger UI**: `http://localhost:30080/docs`
- **ReDoc**: `http://localhost:30080/redoc`
- **OpenAPI JSON**: `http://localhost:30080/openapi.json`

---

## 错误响应

所有端点在发生错误时返回标准 HTTP 错误码:

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 422 | 参数验证失败 |
| 500 | 服务器内部错误 |

**错误响应示例**:
```json
{
  "detail": [
    {
      "loc": ["query", "duration"],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

---

## 相关文档

- [架构设计](ARCHITECTURE.md)
- [监控指南](MONITORING-GUIDE.md)
- [测试用例](TEST-CASES.md)
