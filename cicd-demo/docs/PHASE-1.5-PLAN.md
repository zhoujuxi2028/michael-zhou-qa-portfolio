# Phase 1.5: GitOps (ArgoCD) 实施计划

**预计时间**: 4 小时
**状态**: 📝 计划中
**依赖**: Phase 1.1-1.4 已完成

---

## 1. 目标

实现 GitOps 工作流，使用 ArgoCD 实现：
- Git 仓库作为唯一真实来源 (Single Source of Truth)
- 自动同步 K8s 部署
- 声明式配置管理
- 可视化部署状态和回滚能力

---

## 2. 前置条件检查

| 检查项 | 命令 | 预期结果 |
|--------|------|----------|
| Docker 运行 | `docker ps` | 正常输出 |
| k3d 已安装 | `k3d version` | v5.x.x |
| kubectl 已安装 | `kubectl version --client` | v1.x.x |
| Helm 已安装 | `helm version` | v4.x.x |
| k3d 集群不存在 | `k3d cluster list` | 空或无 qa-portfolio |

---

## 3. 任务分解

### 3.1 环境准备 (20 min)

| ID | 任务 | 描述 | 工时 |
|----|------|------|------|
| 1.5.1.1 | 创建 k3d 集群 | 1 server + 1 agent，端口映射 | 10 min |
| 1.5.1.2 | 验证集群 | kubectl get nodes | 5 min |
| 1.5.1.3 | 部署现有 K8s 资源 | kubectl apply -f k8s/ | 5 min |

**命令参考**:
```bash
# 创建集群 (轻量版 - 适合 MacBook)
k3d cluster create qa-portfolio \
  --agents 1 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer"

# 验证
kubectl get nodes
kubectl cluster-info
```

---

### 3.2 安装 ArgoCD (40 min)

| ID | 任务 | 描述 | 工时 |
|----|------|------|------|
| 1.5.2.1 | 创建 argocd namespace | kubectl create namespace | 2 min |
| 1.5.2.2 | 安装 ArgoCD | kubectl apply 官方 manifest | 10 min |
| 1.5.2.3 | 等待 Pods 就绪 | kubectl wait --for=condition=Ready | 10 min |
| 1.5.2.4 | 获取 admin 密码 | kubectl get secret | 3 min |
| 1.5.2.5 | 配置端口转发 | kubectl port-forward | 5 min |
| 1.5.2.6 | 验证 UI 访问 | 浏览器访问 localhost | 5 min |
| 1.5.2.7 | 编写安装脚本 | install-argocd.sh | 5 min |

**命令参考**:
```bash
# 创建 namespace
kubectl create namespace argocd

# 安装 ArgoCD (官方稳定版)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 等待就绪
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# 获取 admin 密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# 端口转发
kubectl port-forward svc/argocd-server -n argocd 9090:443
# 访问: https://localhost:9090 (admin / <密码>)
```

---

### 3.3 创建 Application CRDs (60 min)

| ID | 任务 | 描述 | 工时 |
|----|------|------|------|
| 1.5.3.1 | 创建 dev Application | qa-portfolio-dev.yaml | 25 min |
| 1.5.3.2 | 创建 staging Application | qa-portfolio-staging.yaml | 20 min |
| 1.5.3.3 | 创建 AppProject | qa-portfolio-project.yaml | 15 min |

**文件结构**:
```
gitops/
├── argocd/
│   ├── install-argocd.sh           # 安装脚本
│   ├── project.yaml                # AppProject 定义
│   └── applications/
│       ├── qa-portfolio-dev.yaml   # Dev 环境 Application
│       └── qa-portfolio-staging.yaml # Staging 环境 Application
└── README.md                       # GitOps 文档
```

**Application CRD 示例** (qa-portfolio-dev.yaml):
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: qa-portfolio-dev
  namespace: argocd
spec:
  project: qa-portfolio
  source:
    repoURL: https://github.com/michael-zhou-qa/michael-zhou-qa-portfolio.git
    targetRevision: feature/devops-platform
    path: cicd-demo/k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: qa-portfolio
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

### 3.4 测试 GitOps 工作流 (60 min)

| ID | 任务 | 描述 | 工时 |
|----|------|------|------|
| 1.5.4.1 | 应用 Application CRDs | kubectl apply | 10 min |
| 1.5.4.2 | 验证自动同步 | ArgoCD UI 查看 | 10 min |
| 1.5.4.3 | 测试 Git 触发部署 | 修改配置 → push → 观察 | 20 min |
| 1.5.4.4 | 测试手动同步 | ArgoCD UI Sync 按钮 | 10 min |
| 1.5.4.5 | 测试回滚 | ArgoCD UI History → Rollback | 10 min |

**测试场景**:
1. **自动同步测试**: 修改 k8s/configmap.yaml → git push → 观察 ArgoCD 自动部署
2. **手动同步测试**: 禁用自动同步 → 修改 → 手动点击 Sync
3. **回滚测试**: 查看 History → 选择旧版本 → Rollback

---

### 3.5 编写文档 (30 min)

| ID | 任务 | 描述 | 工时 |
|----|------|------|------|
| 1.5.5.1 | 编写 gitops/README.md | 使用说明 + 架构图 | 20 min |
| 1.5.5.2 | 更新主 README | 添加 GitOps 章节 | 10 min |

---

## 4. 交付物清单

| 文件 | 描述 | 预计行数 |
|------|------|----------|
| `gitops/argocd/install-argocd.sh` | 安装脚本 | ~60 行 |
| `gitops/argocd/project.yaml` | AppProject 定义 | ~30 行 |
| `gitops/argocd/applications/qa-portfolio-dev.yaml` | Dev Application | ~40 行 |
| `gitops/argocd/applications/qa-portfolio-staging.yaml` | Staging Application | ~40 行 |
| `gitops/README.md` | GitOps 使用文档 | ~150 行 |

**总计**: ~320 行代码/配置

---

## 5. 验收标准

```bash
# 1. ArgoCD 运行正常
kubectl get pods -n argocd
# 预期: 所有 pods Running

# 2. Application 已创建
kubectl get applications -n argocd
# 预期: qa-portfolio-dev, qa-portfolio-staging

# 3. 应用状态健康
kubectl get applications -n argocd -o jsonpath='{.items[*].status.health.status}'
# 预期: Healthy

# 4. UI 可访问
# 浏览器: https://localhost:9090
# 预期: 看到 Applications 列表和状态

# 5. 自动同步工作
# 修改 k8s/ 下任意文件 → git push
# 预期: ArgoCD 自动检测并部署更新
```

---

## 6. 风险和注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| k3d 集群资源不足 | ArgoCD pods 无法启动 | 使用轻量配置 (1 agent) |
| GitHub 访问问题 | ArgoCD 无法拉取仓库 | 使用 HTTPS + public repo |
| 端口冲突 | 服务无法访问 | 使用非标准端口 (9090) |
| 初始密码丢失 | 无法登录 ArgoCD | 脚本中保存密码到文件 |

---

## 7. 面试要点 (Interview Talking Points)

### Q: 什么是 GitOps？
> "GitOps 是一种使用 Git 作为基础设施和应用配置唯一真实来源的运维模式。所有变更通过 Git 提交，自动化工具（如 ArgoCD）监控仓库并自动将变更同步到集群。"

### Q: 为什么选择 ArgoCD？
> "ArgoCD 是 CNCF 毕业项目，提供声明式 GitOps CD，支持多集群、多环境管理。它有直观的 UI，支持自动同步、健康检查和一键回滚，非常适合 Kubernetes 原生应用。"

### Q: GitOps vs 传统 CI/CD？
| 方面 | 传统 CI/CD | GitOps |
|------|-----------|--------|
| 部署触发 | CI 推送到集群 | CD 从 Git 拉取 |
| 配置来源 | 分散在多处 | Git 唯一来源 |
| 审计追踪 | 需要额外工具 | Git 历史即审计 |
| 回滚 | 需要重新部署 | Git revert 即可 |

### Q: 如何保证安全？
> "ArgoCD 使用拉取模式，不需要集群暴露给外部。敏感信息通过 Sealed Secrets 或外部密钥管理。所有变更都有 Git 审计记录。"

---

## 8. 时间安排

| 阶段 | 任务 | 时间 | 累计 |
|------|------|------|------|
| 3.1 | 环境准备 | 20 min | 20 min |
| 3.2 | 安装 ArgoCD | 40 min | 1h |
| 3.3 | 创建 Application CRDs | 60 min | 2h |
| 3.4 | 测试 GitOps 工作流 | 60 min | 3h |
| 3.5 | 编写文档 | 30 min | 3.5h |
| - | Buffer (意外情况) | 30 min | 4h |

**总计**: 4 小时

---

## 9. 下一步

计划完成后，执行顺序：
1. ✅ 审核计划
2. ⬜ 创建 k3d 集群
3. ⬜ 安装 ArgoCD
4. ⬜ 创建 Application CRDs
5. ⬜ 测试验证
6. ⬜ 编写文档
7. ⬜ Git 提交

---

**计划创建时间**: 2026-02-28
**计划状态**: 待审核
