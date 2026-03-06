# Chaos Mesh Integration

> 声明式混沌工程实验配置

## 目录 / Contents

- [安装 Chaos Mesh](#安装-chaos-mesh)
- [实验类型](#实验类型)
- [使用方法](#使用方法)

---

## 安装 Chaos Mesh

```bash
# 添加 Helm 仓库
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# 安装 Chaos Mesh
kubectl create ns chaos-mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock

# 验证安装
kubectl get pods -n chaos-mesh
```

## 实验类型

| 文件 | 类型 | 描述 |
|-----|------|------|
| `pod-failure.yaml` | PodChaos | Pod 故障注入 |
| `pod-kill.yaml` | PodChaos | Pod 删除测试 |
| `network-delay.yaml` | NetworkChaos | 网络延迟注入 |
| `network-partition.yaml` | NetworkChaos | 网络分区模拟 |
| `cpu-stress.yaml` | StressChaos | CPU 压力测试 |
| `memory-stress.yaml` | StressChaos | 内存压力测试 |
| `hpa-chaos-workflow.yaml` | Workflow | HPA 混沌工作流 |

## 使用方法

```bash
# 应用单个实验
kubectl apply -f chaos-mesh/pod-kill.yaml

# 查看实验状态
kubectl get podchaos -n k8s-testing
kubectl get networkchaos -n k8s-testing
kubectl get stresschaos -n k8s-testing

# 删除实验
kubectl delete -f chaos-mesh/pod-kill.yaml

# 运行完整工作流
kubectl apply -f chaos-mesh/hpa-chaos-workflow.yaml
```

## 与手写测试的对比

| 特性 | 手写测试 (chaos_tester.py) | Chaos Mesh |
|-----|---------------------------|------------|
| Pod 故障 | ✅ K8s API | ✅ CRD |
| 网络故障 | ❌ | ✅ |
| IO 故障 | ❌ | ✅ |
| 定时执行 | ❌ | ✅ Schedule |
| 实验编排 | ❌ | ✅ Workflow |
| Dashboard | ❌ | ✅ |

---

*Version: 1.0.0*
