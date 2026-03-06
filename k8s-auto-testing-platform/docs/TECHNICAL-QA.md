# 技术问答文档 (Technical Q&A)

**项目**: K8S Auto Testing Platform
**用途**: 面试准备 / 技术讨论

---

## 目录

1. [Kubernetes 相关](#kubernetes-相关)
2. [HPA 自动扩缩容](#hpa-自动扩缩容)
3. [混沌工程](#混沌工程)
4. [测试框架设计](#测试框架设计)
5. [监控与可观测性](#监控与可观测性)
6. [CI/CD 与代码质量](#cicd-与代码质量)
7. [问题排查](#问题排查)

---

## Kubernetes 相关

### Q1: 项目使用了哪些 Kubernetes 资源？

| 资源 | 用途 | 配置文件 |
|------|------|---------|
| Namespace | 资源隔离 | `namespace.yaml` |
| Deployment | 应用部署 | `deployment.yaml` |
| Service | 服务暴露 | `service.yaml` |
| HPA | 自动扩缩容 | `hpa.yaml` |
| ConfigMap | 配置管理 | `configmap.yaml` |
| ServiceMonitor | Prometheus 抓取 | `servicemonitor.yaml` |

---

### Q2: 为什么选择 Deployment 而不是 StatefulSet？

**答**:

1. **无状态应用**: 测试应用不需要持久化存储
2. **可替换性**: Pod 可以随时删除和重建
3. **简单性**: Deployment 管理更简单
4. **HPA 兼容**: 与 HPA 配合更好

如果测试需要有状态场景 (如数据库)，会考虑 StatefulSet。

---

### Q3: Service 使用了哪些类型？为什么？

| 类型 | 端口 | 用途 |
|------|------|------|
| ClusterIP | 8080 | 集群内部通信 |
| NodePort | 30080 | 外部访问 (本地开发) |

**选择理由**:
- ClusterIP: Prometheus 抓取指标
- NodePort: 本地 curl 测试，无需 Ingress

生产环境会使用 LoadBalancer 或 Ingress。

---

### Q4: 如何保证 Pod 的健康？

**Probes 配置**:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 3
  failureThreshold: 3
```

**区别**:
- **Liveness**: Pod 是否存活，失败则重启
- **Readiness**: Pod 是否就绪，失败则从 Service 移除

---

## HPA 自动扩缩容

### Q5: HPA 是如何工作的？

**工作流程**:

1. **指标收集**: Metrics Server 每 15s 收集 Pod 指标
2. **计算期望副本数**: `desiredReplicas = ceil(currentReplicas * (currentMetricValue / targetMetricValue))`
3. **稳定窗口**: 等待一段时间避免抖动
4. **执行扩缩容**: 通知 Deployment 调整副本数

**配置示例**:
```yaml
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
```

---

### Q6: HPA 为什么有时不扩容？

**常见原因**:

1. **Metrics Server 未安装**
   ```bash
   kubectl get pods -n kube-system | grep metrics-server
   ```

2. **Pod 未设置 resource requests**
   ```yaml
   resources:
     requests:
       cpu: "100m"  # 必须设置
   ```

3. **稳定窗口未过**
   - 默认 scaleUp: 0s
   - 默认 scaleDown: 300s (5分钟)

4. **已达到 maxReplicas**

---

### Q7: 如何调试 HPA？

```bash
# 查看 HPA 状态
kubectl describe hpa k8s-test-app-hpa -n k8s-testing

# 关键字段
# - AbleToScale: 是否能扩缩容
# - ScalingActive: 是否正在扩缩容
# - Current/Target: 当前值/目标值

# 查看 metrics
kubectl top pods -n k8s-testing

# 查看 events
kubectl get events -n k8s-testing --sort-by='.lastTimestamp'
```

---

## 混沌工程

### Q8: 什么是混沌工程？为什么重要？

**定义**: 通过主动注入故障来验证系统韧性的实践。

**重要性**:
1. **发现隐藏问题**: 生产问题往往难以在测试环境复现
2. **验证恢复机制**: 确保自动恢复功能正常工作
3. **提高信心**: 面对故障时更有准备
4. **改进设计**: 识别系统薄弱点

**Netflix 格言**: "The best way to avoid failure is to fail constantly."

---

### Q9: 项目实现了哪些混沌场景？

**Pod 混沌** (K8S API):

| 场景 | 测试 ID | 说明 |
|------|---------|------|
| Pod 删除恢复 | TC-CHAOS-001 | 删除 Pod，验证自动重建 |
| 负载下 Kill | TC-CHAOS-002 | 高负载时删除 Pod |
| CPU 耗尽 | TC-CHAOS-003 | 触发 CPU 扩容 |
| 内存耗尽 | TC-CHAOS-004 | 触发内存扩容 |
| 容器重启 | TC-CHAOS-005 | 重启后恢复 |
| 多 Pod 故障 | TC-CHAOS-006 | 50% Pod 同时故障 |
| 滚动混沌 | TC-CHAOS-007 | 逐个删除 Pod |
| HPA 周转 | TC-CHAOS-008 | 扩容期间混沌 |

**网络混沌** (Chaos Mesh):

| 场景 | CRD 文件 | 说明 |
|------|----------|------|
| 网络延迟 | network-delay.yaml | 注入 100ms 延迟 |
| 网络分区 | network-partition.yaml | 模拟网络隔离 |
| 丢包 | network-loss.yaml | 30% 丢包率 |

---

### Q10: Chaos Mesh 和直接调用 K8S API 有什么区别？

| 特性 | K8S API | Chaos Mesh |
|------|---------|------------|
| 安装要求 | 无 | 需要安装 CRD |
| 场景复杂度 | 简单 (Pod 删除) | 复杂 (网络、IO、时间) |
| 可编排性 | 需要代码 | YAML 声明式 |
| 可视化 | 无 | Dashboard |
| 生产可用 | 风险较高 | 有安全机制 |

**项目选择**: 两种都支持，根据场景选择。

---

### Q11: 如何保证混沌测试的安全性？

1. **命名空间隔离**
   ```python
   namespace = "k8s-testing"  # 独立命名空间
   ```

2. **标签选择器**
   ```yaml
   selector:
     labelSelectors:
       app: k8s-test-app  # 只影响特定应用
   ```

3. **持续时间限制**
   ```yaml
   duration: "30s"  # 最多 30 秒
   ```

4. **恢复验证**
   ```python
   def test_pod_deletion_recovery():
       # 删除 pod
       chaos_tester.delete_random_pod()
       # 验证恢复
       assert wait_for_pods_ready(timeout=120)
   ```

---

## 测试框架设计

### Q12: 测试套件的架构是怎样的？

```
tests/
├── conftest.py          # 共享 fixtures
├── test_deployment.py   # Deployment 测试 (8)
├── test_service.py      # Service 测试 (8)
├── test_hpa.py          # HPA 测试 (8)
└── test_chaos.py        # Chaos 测试 (13)

tools/
├── k8s_helper.py        # K8S 操作封装
├── chaos_tester.py      # 混沌测试工具 (852 行)
├── load_generator.py    # 负载生成
├── metrics_collector.py # 指标收集
└── report_generator.py  # 报告生成
```

---

### Q13: conftest.py 中有哪些关键 fixtures？

```python
@pytest.fixture(scope="session")
def k8s_client():
    """K8S API 客户端，整个测试会话复用"""
    config.load_kube_config()
    return client.CoreV1Api()

@pytest.fixture(scope="function")
def chaos_tester(k8s_client):
    """每个测试函数独立的 ChaosTester"""
    return ChaosTester(namespace="k8s-testing")

@pytest.fixture
def wait_helper():
    """动态等待辅助函数"""
    def _wait(condition, timeout=120, interval=5):
        start = time.time()
        while time.time() - start < timeout:
            if condition():
                return True
            time.sleep(interval)
        return False
    return _wait
```

---

### Q14: 如何处理测试中的异步等待？

**问题**: K8S 操作是异步的，直接断言会失败。

**解决方案**: 轮询等待 + 超时

```python
def wait_for_pods_ready(namespace, expected_count, timeout=120):
    """等待指定数量的 Pod 就绪"""
    start = time.time()
    while time.time() - start < timeout:
        pods = get_running_pods(namespace)
        ready_count = sum(1 for p in pods if is_pod_ready(p))
        if ready_count >= expected_count:
            return True
        time.sleep(5)
    return False

# 使用
def test_min_replicas():
    assert wait_for_pods_ready("k8s-testing", 2, timeout=120)
```

---

### Q15: 测试如何分类和选择性运行？

**使用 pytest markers**:

```python
# pytest.ini
[pytest]
markers =
    deployment: Deployment related tests
    hpa: HPA related tests
    chaos: Chaos engineering tests
    smoke: Quick smoke tests
    slow: Long running tests

# 测试文件
@pytest.mark.deployment
@pytest.mark.smoke
def test_deployment_exists():
    ...
```

**运行命令**:
```bash
pytest -m smoke           # 只运行 smoke
pytest -m "not slow"      # 排除 slow
pytest -m "hpa and chaos" # 组合
```

---

## 监控与可观测性

### Q16: 应用暴露了哪些 Prometheus 指标？

| 指标 | 类型 | 说明 |
|------|------|------|
| `http_requests_total` | Counter | HTTP 请求计数 |
| `http_request_duration_seconds` | Histogram | 请求延迟分布 |
| `http_active_requests` | Gauge | 当前活跃请求 |
| `app_cpu_usage_percent` | Gauge | CPU 使用率 |
| `app_memory_usage_percent` | Gauge | 内存使用率 |
| `app_scaling_events_total` | Counter | 扩缩容事件 |

---

### Q17: MetricsCollector 是如何工作的？

```python
class MetricsCollector:
    def __init__(self, prometheus_url):
        self.prom = PrometheusConnect(url=prometheus_url)

    def get_cpu_usage(self, pod_name):
        query = f'app_cpu_usage_percent{{pod="{pod_name}"}}'
        result = self.prom.custom_query(query)
        return float(result[0]['value'][1])

    def collect_metrics_over_time(self, duration, interval):
        """持续收集指标"""
        samples = []
        for _ in range(duration // interval):
            samples.append(self.get_current_metrics())
            time.sleep(interval)
        return samples
```

---

## CI/CD 与代码质量

### Q18: GitHub Actions 工作流包含什么？

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    - flake8 .
    - black --check .
    - pylint tools/ app/

  test:
    - pytest tests/ -m smoke -v

  report:
    - pytest --html=report.html
    - Upload artifacts
```

---

### Q19: 代码质量如何保证？

| 工具 | 用途 | 结果 |
|------|------|------|
| black | 代码格式化 | 统一风格 |
| flake8 | 代码规范检查 | 0 errors |
| pylint | 静态分析 | 9.68/10 |
| isort | import 排序 | 已配置 |

**配置** (pyproject.toml):
```toml
[tool.black]
line-length = 88

[tool.pylint.messages_control]
disable = ["C0114", "C0115"]  # 允许缺少 docstring

[tool.isort]
profile = "black"
```

---

## 问题排查

### Q20: 项目中遇到的最难的问题是什么？

**问题**: curl 请求被本地代理拦截，HPA 压力测试无法触发扩容。

**现象**:
- 脚本显示 "NO SCALE-UP DETECTED"
- HPA CPU 指标始终为 0

**排查过程**:
1. 检查 HPA 配置 - 正常
2. 检查 Metrics Server - 正常
3. 查看应用日志 - 无请求记录
4. 使用 curl -v 调试 - 发现返回 502
5. 发现请求走了本地代理

**解决方案**:
```bash
# 所有 curl 添加 --noproxy
curl --noproxy '*' http://localhost:30080/cpu-load
```

**经验**: 本地开发环境的代理配置需要特别注意。

---

### Q21: 如何系统性地排查 K8S 问题？

**四层排查法**:

1. **集群层**
   ```bash
   kubectl cluster-info
   kubectl get nodes
   kubectl get events -A
   ```

2. **Namespace 层**
   ```bash
   kubectl get all -n k8s-testing
   kubectl describe ns k8s-testing
   ```

3. **Workload 层**
   ```bash
   kubectl describe deployment k8s-test-app -n k8s-testing
   kubectl describe hpa k8s-test-app-hpa -n k8s-testing
   ```

4. **Pod 层**
   ```bash
   kubectl logs <pod-name> -n k8s-testing
   kubectl describe pod <pod-name> -n k8s-testing
   kubectl exec -it <pod-name> -n k8s-testing -- /bin/sh
   ```

---

## 快速参考卡

### 常用命令

```bash
# 部署
kubectl apply -f k8s-manifests/

# 测试
pytest tests/ -m smoke -v
pytest tests/ --cov=. --cov-report=html

# 监控
watch kubectl get hpa,pods -n k8s-testing

# 负载
curl --noproxy '*' "http://localhost:30080/cpu-load?duration=30"

# 混沌
kubectl delete pod <name> -n k8s-testing
```

### 项目指标

| 指标 | 数值 |
|------|------|
| 测试用例 | 37 |
| 通过率 | 100% |
| 代码质量 | 9.68/10 |
| 混沌场景 | 12 |

---

## 相关文档

- [面试叙述](INTERVIEW-STORY.md)
- [Demo 指南](../scripts/DEMO-GUIDE.md)
- [FAQ](FAQ.md)
- [架构设计](ARCHITECTURE.md)
