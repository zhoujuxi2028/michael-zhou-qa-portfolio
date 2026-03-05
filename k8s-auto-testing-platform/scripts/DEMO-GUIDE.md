# K8S Auto Testing Platform - Demo Guide

**版本**: v1.2.0
**预计时长**: 15-20 分钟
**目标受众**: 技术面试官、团队成员

---

## Demo 准备

### 前置检查

```bash
# 1. 启动 Docker Desktop 并启用 Kubernetes
# 检查集群状态
kubectl cluster-info
kubectl get nodes

# 2. 确保应用已部署
kubectl get pods -n k8s-testing
kubectl get hpa -n k8s-testing

# 3. 验证服务可访问
curl --noproxy '*' http://localhost:30080/health
```

### 环境要求

- Docker Desktop with Kubernetes
- Python 3.9+ (虚拟环境已激活)
- 终端工具 (iTerm2 推荐，可分屏)
- 浏览器 (查看报告)

---

## Demo 流程

### 第一部分: 项目概述 (2分钟)

**展示项目结构**:
```bash
cd /path/to/k8s-auto-testing-platform

# 展示目录结构
tree -L 2 -I 'venv|__pycache__|htmlcov'
```

**关键点**:
- 37 个测试用例
- 12 种混沌场景
- 完整的 CI/CD 流程
- 代码质量: pylint 9.68/10

---

### 第二部分: Kubernetes 部署 (3分钟)

**1. 展示 K8S 资源**:
```bash
# 查看 namespace
kubectl get ns k8s-testing

# 查看所有资源
kubectl get all -n k8s-testing
```

**2. 展示 HPA 配置**:
```bash
kubectl describe hpa k8s-test-app-hpa -n k8s-testing
```

**关键点**:
- CPU 阈值: 50%
- 内存阈值: 70%
- 副本范围: 2-10

**3. 展示应用健康状态**:
```bash
curl --noproxy '*' http://localhost:30080/health
curl --noproxy '*' http://localhost:30080/info
```

---

### 第三部分: HPA 自动扩缩容演示 (5分钟)

**1. 打开监控窗口** (新终端):
```bash
# 实时监控 HPA 和 Pods
watch -n 2 'kubectl get hpa,pods -n k8s-testing'
```

**2. 触发 CPU 负载**:
```bash
# 并发请求生成负载
for i in {1..5}; do
  curl --noproxy '*' "http://localhost:30080/cpu-load?duration=60" &
done
```

**3. 观察扩容过程**:
- 等待 30-60 秒
- HPA TARGETS 从 <50% 上升
- 观察 REPLICAS 从 2 增加到 3-4

**4. 停止负载后观察缩容**:
- 约 5 分钟后自动缩容
- 可用 `kubectl get hpa -n k8s-testing -w` 持续观察

**或使用压力测试脚本**:
```bash
./scripts/hpa-stress-test.sh --duration 60 --concurrency 5
```

---

### 第四部分: 测试套件演示 (3分钟)

**1. 展示测试结构**:
```bash
# 查看测试文件
ls -la tests/

# 查看测试用例数量
pytest tests/ --collect-only | grep "test session starts" -A 5
```

**2. 运行 Smoke 测试** (快速):
```bash
pytest tests/ -m smoke -v
```

**3. 运行指定测试**:
```bash
# 运行 deployment 测试
pytest tests/test_deployment.py -v --tb=short
```

**关键点**:
- 使用 pytest markers 分类测试
- 支持 HTML 报告输出
- 自动等待机制避免时序问题

---

### 第五部分: 混沌工程演示 (5分钟)

**1. 展示混沌测试工具**:
```bash
# 查看 ChaosTester 功能
head -50 tools/chaos_tester.py
```

**2. 演示 Pod 删除与恢复**:
```bash
# 查看当前 pods
kubectl get pods -n k8s-testing

# 删除一个 pod
kubectl delete pod $(kubectl get pods -n k8s-testing -o jsonpath='{.items[0].metadata.name}') -n k8s-testing

# 观察自动恢复
watch kubectl get pods -n k8s-testing
```

**3. 展示 Chaos Mesh CRD** (如已安装):
```bash
# 查看 Chaos Mesh 配置文件
cat chaos-mesh/pod-kill.yaml
cat chaos-mesh/network-delay.yaml
```

**关键点**:
- Kubernetes 自动维护期望副本数
- 支持 8 种 Pod 混沌场景
- 支持 4 种网络混沌场景

---

### 第六部分: 报告与监控 (2分钟)

**1. 生成测试报告**:
```bash
# 生成 HTML 报告
pytest tests/ -m smoke --html=reports/demo-report.html --self-contained-html

# 打开报告
open reports/demo-report.html
```

**2. 展示 Prometheus 指标**:
```bash
curl --noproxy '*' http://localhost:30080/metrics | head -30
```

**3. 展示 JSON 指标**:
```bash
curl --noproxy '*' http://localhost:30080/metrics/json | python -m json.tool
```

---

## Demo 结束语

### 项目亮点总结

1. **完整性**: 从部署到测试到监控的完整闭环
2. **自动化**: 37 个自动化测试用例，CI/CD 集成
3. **可靠性**: 混沌工程验证系统韧性
4. **可观测性**: Prometheus 指标，HTML 报告

### 技术栈展示

| 类别 | 技术 |
|------|------|
| 容器编排 | Kubernetes, HPA |
| 测试框架 | pytest, pytest-html |
| 混沌工程 | Chaos Mesh, K8S API |
| 监控 | Prometheus, Grafana |
| CI/CD | GitHub Actions |
| 应用 | FastAPI, Python |

### 数据支撑

- 37 测试用例，100% 通过率 (排除跳过)
- 12 混沌场景
- 代码质量 9.68/10 (pylint)
- 0 个 flake8 错误

---

## 备选演示路径

### 快速演示 (5分钟)

```bash
# 1. 展示集群状态
kubectl get all -n k8s-testing

# 2. 运行 smoke 测试
pytest tests/ -m smoke -v

# 3. 展示 HPA
kubectl describe hpa -n k8s-testing

# 4. 触发负载
curl --noproxy '*' "http://localhost:30080/cpu-load?duration=10"
```

### 问题排查演示

如果 Demo 中遇到问题:

```bash
# 检查 pods 状态
kubectl describe pods -n k8s-testing | grep -A 10 "Events:"

# 查看应用日志
kubectl logs -l app=k8s-test-app -n k8s-testing --tail=20

# 检查代理问题
echo $no_proxy
```

---

## Demo 检查清单

开始前确认:

- [ ] Docker Desktop 运行中
- [ ] Kubernetes 启用
- [ ] `kubectl get nodes` 返回 Ready
- [ ] 应用部署: `kubectl get pods -n k8s-testing`
- [ ] 服务可访问: `curl --noproxy '*' http://localhost:30080/health`
- [ ] 终端字体够大 (演示用)
- [ ] 分屏准备好 (监控窗口)
