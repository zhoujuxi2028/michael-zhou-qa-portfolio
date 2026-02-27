# DevOps Platform - WBS

**总工时**: 16h (2天)
**状态**: ⬜ 未开始

---

## Day 1 (8h)

| ID | 任务 | 工时 | 状态 |
|----|------|------|------|
| **1.1** | **环境准备** | **1h** | |
| 1.1.1 | 安装工具 (docker,kubectl,k3d,terraform,helm) | 30m | ⬜ |
| 1.1.2 | 创建 k3d 集群 | 20m | ⬜ |
| 1.1.3 | 验证环境 | 10m | ⬜ |
| **1.2** | **Terraform (IaC)** | **4h** | |
| 1.2.1 | 创建目录: terraform/{modules,environments} | 10m | ⬜ |
| 1.2.2 | 写 main.tf, variables.tf, outputs.tf | 2h | ⬜ |
| 1.2.3 | 写 dev.tfvars, staging.tfvars, prod.tfvars | 30m | ⬜ |
| 1.2.4 | 配置 Localstack (AWS本地模拟) | 30m | ⬜ |
| 1.2.5 | terraform init/plan/apply | 30m | ⬜ |
| 1.2.6 | 写 README.md | 30m | ⬜ |
| **1.3** | **Kubernetes** | **2.5h** | |
| 1.3.1 | 创建目录: k8s/ | 5m | ⬜ |
| 1.3.2 | 写 deployment.yaml, service.yaml, configmap.yaml, ingress.yaml | 1.5h | ⬜ |
| 1.3.3 | kubectl apply 部署 | 15m | ⬜ |
| 1.3.4 | 验证 pods 运行 | 15m | ⬜ |
| 1.3.5 | 写部署脚本 deploy-to-k8s.sh | 15m | ⬜ |
| 1.3.6 | 写 README.md | 20m | ⬜ |
| **1.4** | **Security** | **1.5h** | |
| 1.4.1 | 创建 security-scan.yml workflow | 45m | ⬜ |
| 1.4.2 | 配置 Trivy 容器扫描 | 30m | ⬜ |
| 1.4.3 | 集成 npm audit | 15m | ⬜ |

---

## Day 2 (8h)

| ID | 任务 | 工时 | 状态 |
|----|------|------|------|
| **1.5** | **GitOps (ArgoCD)** | **4h** | |
| 1.5.1 | 创建目录: gitops/argocd/applications | 5m | ⬜ |
| 1.5.2 | 写 install-argocd.sh | 30m | ⬜ |
| 1.5.3 | 安装 ArgoCD 到 k3d | 30m | ⬜ |
| 1.5.4 | 配置 UI 访问,获取密码 | 15m | ⬜ |
| 1.5.5 | 写 Application CRDs (dev/staging) | 1h | ⬜ |
| 1.5.6 | kubectl apply,测试自动同步 | 45m | ⬜ |
| 1.5.7 | 测试回滚功能 | 30m | ⬜ |
| 1.5.8 | 写 README.md | 30m | ⬜ |
| **1.6** | **Monitoring** | **4h** | |
| 1.6.1 | helm安装 Prometheus | 1h | ⬜ |
| 1.6.2 | helm安装 Grafana | 1h | ⬜ |
| 1.6.3 | 配置数据源 | 15m | ⬜ |
| 1.6.4 | 创建2个 Dashboard (Cluster+Tests) | 1.5h | ⬜ |
| 1.6.5 | 写 README.md | 15m | ⬜ |

**可选** (如果时间够):

| ID | 任务 | 工时 | 状态 |
|----|------|------|------|
| 1.7 | 写文档 (QUICKSTART,ARCHITECTURE,INTERVIEW-POINTS) | 2h | ⬜ |
| 1.8 | 端到端测试+演示排练 | 1h | ⬜ |

---

## 快速命令

### 环境准备
```bash
# Mac
brew install kubectl k3d terraform helm

# 创建集群
k3d cluster create qa-portfolio --agents 2 --port "8080:80@loadbalancer"

# 验证
docker version && kubectl version && k3d version && terraform version && helm version
```

### 创建目录
```bash
cd cicd-demo
mkdir -p terraform/{modules,environments} k8s gitops/argocd/applications monitoring/{dashboards} security scripts docs
```

---

## 验收标准

### Day 1 结束
- [x] terraform apply 成功
- [x] kubectl get pods 全部 Running
- [x] security-scan workflow 运行成功

### Day 2 结束
- [x] ArgoCD UI 可访问
- [x] Git改动触发自动部署
- [x] Grafana 显示2个 dashboard

---

## 进度

| 阶段 | 进度 | 用时 |
|------|------|------|
| Day 1 | 0/4 完成 | 0/8h |
| Day 2 | 0/2 完成 | 0/8h |
| 可选 | 0/2 完成 | 0/3h |

---

**准备好了吗？** 回复 "开始" 或告诉我什么时候开始。
