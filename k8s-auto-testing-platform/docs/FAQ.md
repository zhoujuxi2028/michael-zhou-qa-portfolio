# 常见问题解答 (FAQ)

**项目**: K8S Auto Testing Platform
**最后更新**: 2026-03-05

---

## 目录

1. [环境配置问题](#环境配置问题)
2. [测试执行问题](#测试执行问题)
3. [HPA 相关问题](#hpa-相关问题)
4. [混沌测试问题](#混沌测试问题)
5. [监控与指标问题](#监控与指标问题)
6. [CI/CD 问题](#cicd-问题)

---

## 环境配置问题

### Q1: kubectl 连接失败，显示 "Unable to connect to the server: EOF"

**原因**: 本地代理 (如 V2Ray、Clash) 拦截了 Kubernetes API 请求。

**解决方案**:

```bash
# 在 ~/.zshrc 或 ~/.bashrc 添加
export no_proxy="localhost,127.0.0.1,kubernetes.docker.internal,.local"

# 重新加载配置
source ~/.zshrc
```

**验证**:
```bash
kubectl get nodes
# 应该返回节点列表
```

---

### Q2: Docker build 失败，提示无法连接代理

**原因**: 容器内无法访问宿主机代理。

**解决方案**:

方法 1 - 使用 host 网络:
```bash
docker build --network=host -t k8s-test-app:latest .
```

方法 2 - 移除不必要的依赖:
```dockerfile
# 简化 Dockerfile，移除需要编译的依赖 (如 gcc)
FROM python:3.9-slim
# 不安装 build-essential
```

---

### Q3: Namespace not found 错误

**原因**: Kubernetes 资源创建顺序问题。

**解决方案**:

```bash
# 先创建 namespace
kubectl create namespace k8s-testing

# 然后应用其他资源
kubectl apply -f k8s-manifests/
```

或一次性重新应用:
```bash
kubectl apply -f k8s-manifests/ && kubectl apply -f k8s-manifests/
```

---

### Q4: 如何检查 Kubernetes 集群状态？

```bash
# 检查节点状态
kubectl get nodes

# 检查所有 pods
kubectl get pods -A

# 检查 metrics-server (HPA 必需)
kubectl get pods -n kube-system | grep metrics-server

# 查看 HPA 状态
kubectl get hpa -n k8s-testing
```

---

## 测试执行问题

### Q5: 测试失败，显示 "No ready replicas found"

**原因**: 测试等待时间不足，Pod 尚未就绪。

**解决方案**:

已在代码中修复，使用 `wait_helper` 动态等待:

```python
# conftest.py
def wait_helper(condition_func, timeout=120, interval=5):
    """动态等待条件满足"""
    start = time.time()
    while time.time() - start < timeout:
        if condition_func():
            return True
        time.sleep(interval)
    return False
```

**手动验证**:
```bash
# 等待 deployment 就绪
kubectl rollout status deployment/k8s-test-app -n k8s-testing --timeout=120s
```

---

### Q6: 测试超时，如何增加等待时间？

**修改 pytest.ini**:
```ini
[pytest]
timeout = 300  # 5 分钟超时
```

**修改 conftest.py fixture**:
```python
@pytest.fixture
def wait_timeout():
    return 180  # 3 分钟
```

---

### Q7: 如何只运行特定类型的测试？

```bash
# 只运行 deployment 测试
pytest tests/ -m deployment

# 只运行 HPA 测试
pytest tests/ -m hpa

# 只运行 chaos 测试
pytest tests/ -m chaos

# 只运行 smoke 测试 (快速验证)
pytest tests/ -m smoke

# 排除慢速测试
pytest tests/ -m "not slow"
```

---

### Q8: 如何查看详细的测试输出？

```bash
# 显示详细输出
pytest tests/ -v

# 显示 print 语句
pytest tests/ -s

# 显示完整 traceback
pytest tests/ --tb=long

# 组合使用
pytest tests/ -v -s --tb=long
```

---

## HPA 相关问题

### Q9: HPA 不扩容，显示 "<unknown>/50%"

**原因 1**: Metrics Server 未运行
```bash
# 检查 metrics-server
kubectl get pods -n kube-system | grep metrics-server

# 如果没有，安装它
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

**原因 2**: Pod 没有设置资源请求
```yaml
# deployment.yaml 必须包含
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
```

---

### Q10: HPA 压力测试未触发扩容

**原因**: curl 请求被代理拦截。

**解决方案**:
```bash
# 添加 --noproxy 参数
curl --noproxy '*' "http://localhost:30080/cpu-load?duration=30"
```

**诊断**:
```bash
# 检查请求是否被代理
curl -v "http://localhost:30080/health" 2>&1 | grep -E "proxy|502"
```

---

### Q11: 如何手动触发 HPA 扩容？

```bash
# 方法 1: 使用 cpu-load 端点
for i in {1..10}; do
  curl --noproxy '*' "http://localhost:30080/cpu-load?duration=60" &
done

# 方法 2: 使用压力测试脚本
./scripts/hpa-stress-test.sh --duration 120 --concurrency 10

# 监控扩容
watch kubectl get hpa,pods -n k8s-testing
```

---

### Q12: HPA 扩容后为什么不缩容？

**原因**: HPA 默认有 5 分钟冷却期 (stabilization window)。

**查看 HPA 状态**:
```bash
kubectl describe hpa k8s-test-app-hpa -n k8s-testing
```

**加速测试 (不推荐生产)**:
```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 60
```

---

## 混沌测试问题

### Q13: 混沌测试需要安装 Chaos Mesh 吗？

**不一定**。项目支持两种模式:

1. **K8S API 模式** (无需额外安装):
   - 使用 `tools/chaos_tester.py`
   - 直接调用 Kubernetes API 删除/重启 pods

2. **Chaos Mesh 模式** (需要安装):
   - 使用 `chaos-mesh/` 目录下的 CRD 文件
   - 支持更复杂的场景 (网络延迟、CPU 压力等)

---

### Q14: 如何安装 Chaos Mesh？

```bash
# 使用 Helm 安装
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --create-namespace

# 验证安装
kubectl get pods -n chaos-mesh
```

---

### Q15: 混沌测试后 Pod 没有恢复怎么办？

```bash
# 检查 deployment 状态
kubectl get deployment k8s-test-app -n k8s-testing

# 手动触发重建
kubectl rollout restart deployment/k8s-test-app -n k8s-testing

# 等待恢复
kubectl rollout status deployment/k8s-test-app -n k8s-testing
```

---

## 监控与指标问题

### Q16: Prometheus 无法抓取指标

**检查 ServiceMonitor**:
```bash
kubectl get servicemonitor -n k8s-testing
kubectl describe servicemonitor k8s-test-app -n k8s-testing
```

**检查端点**:
```bash
curl --noproxy '*' http://localhost:30080/metrics
```

**检查 Prometheus targets**:
- 访问 `http://localhost:9090/targets`

---

### Q17: Grafana 仪表板显示 "No Data"

1. 检查 Prometheus 数据源配置
2. 确认 Prometheus URL: `http://prometheus:9090`
3. 检查查询语句是否正确
4. 确认时间范围包含数据

---

## CI/CD 问题

### Q18: GitHub Actions 测试失败

**常见原因**:

1. **没有 K8S 集群**: CI 环境需要模拟 K8S
   - 使用 `kind` 或 `k3s` 在 CI 中创建集群

2. **依赖安装失败**:
   ```yaml
   - name: Install dependencies
     run: pip install -r requirements.txt
   ```

3. **代码格式问题**:
   ```bash
   # 本地检查
   flake8 .
   black --check .
   ```

---

### Q19: 如何在本地运行 CI 检查？

```bash
# 代码格式
black --check .
flake8 .
pylint tools/ app/

# 运行测试
pytest tests/ -v --tb=short

# 生成报告
pytest tests/ --html=reports/test-report.html
```

---

## 快速诊断命令

```bash
# 一键检查环境
kubectl cluster-info
kubectl get nodes
kubectl get pods -n k8s-testing
kubectl get hpa -n k8s-testing
kubectl top pods -n k8s-testing

# 一键检查应用
curl --noproxy '*' http://localhost:30080/health
curl --noproxy '*' http://localhost:30080/metrics/json

# 一键查看日志
kubectl logs -l app=k8s-test-app -n k8s-testing --tail=50
```

---

## 相关文档

- [问题排查记录](TROUBLESHOOTING-LOG.md) - 详细的问题解决记录
- [架构设计](ARCHITECTURE.md) - 系统架构说明
- [测试用例](TEST-CASES.md) - 完整测试用例列表
- [监控指南](MONITORING-GUIDE.md) - Prometheus/Grafana 配置
