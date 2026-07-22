# 需求文档 — 阿里云 ECS + K3s 真实部署 Demo

## 1. 背景

cicd-demo 已有完整的 Helm chart + ArgoCD + K8s 配置，但 deploy pipeline 仅执行 `helm template` + `kubectl --dry-run`，无真实部署目标。接入阿里云 ECS + K3s 后可实现完整的 GitOps 部署闭环。

## 2. 目标

在阿里云 ECS 上搭建 K3s 集群 → 部署 ArgoCD → CI 变更自动同步到集群 → 通过 GitHub Deployments 展示真实部署状态。

## 3. 架构

```
GitHub Actions (docker build & push)
    → 阿里云 ACR (容器镜像仓库)
    → ArgoCD auto-sync (监控 git repo Helm chart 变更)
    → K3s on ECS (真实集群)
    → GitHub Deployments API (记录部署状态)
```

## 4. 需求列表

### ALI-01 云资源创建

| 属性 | 内容 |
|------|------|
| 描述 | 采购并配置阿里云 ECS 抢占式实例 |
| 规格 | 2C4G，Ubuntu 22.04/24.04 |
| 安全组 | 开放 22(SSH)、6443(K3s API)、80/443(Ingress)、8080(ArgoCD UI) |
| 预估费用 | ¥20-50/月 |
| 验收标准 | SSH 可达，基础网络正常 |

### ALI-02 K3s 安装

| 属性 | 内容 |
|------|------|
| 描述 | 在 ECS 上安装 K3s 单节点集群 |
| 工具 | `curl -sfL https://get.k3s.io | sh -` |
| 验收标准 | `kubectl get nodes` 返回 Ready 状态；kubeconfig 可导出到 GitHub Actions |

### ALI-03 ArgoCD 部署

| 属性 | 内容 |
|------|------|
| 描述 | 在 K3s 集群中部署 ArgoCD |
| 已有脚本 | `cicd-demo/gitops/argocd/install-argocd.sh` |
| App 配置 | 使用现有 `gitops/argocd/applications/` 下的 YAML |
| 验收标准 | ArgoCD UI 可访问；应用自动同步并健康 |

### ALI-04 ACR 容器镜像仓库

| 属性 | 内容 |
|------|------|
| 描述 | 创建阿里云容器镜像服务（ACR）个人版仓库 |
| 用途 | 存储 Docker 镜像供 K3s 拉取 |
| 验收标准 | `docker push` 成功；K3s 节点可从 ACR 拉取镜像 |

### ALI-05 CI/CD Pipeline 改造

| 属性 | 内容 |
|------|------|
| 描述 | 将 cicd-demo-deploy.yml 的 dry-run 步骤改为真实部署 |
| 变更点 | Helm package → docker build & push → helm upgrade --install |
| 验收标准 | merge main 后 ArgoCD 自动同步；服务可用 |

### ALI-06 GitHub Deployments 集成

| 属性 | 内容 |
|------|------|
| 描述 | 在 deploy pipeline 中使用 GitHub Deployments API 记录部署状态 |
| 验收标准 | GitHub 环境页面显示 staging/production 部署历史及 commit |

## 5. Scope 边界

| 在范围内 | 不在范围内 |
|----------|-----------|
| 阿里云 ECS 1 台 + K3s | 多节点集群 / HA 配置 |
| ACR 个人版镜像仓库 | 公网域名 / HTTPS 证书配置 |
| ArgoCD GitOps 自动同步 | 监控告警（Prometheus/Grafana） |
| GitHub Deployments 集成 | 蓝绿部署 / 金丝雀发布 |
| CI pipeline docker push 改造 | 性能测试 / 容量规划 |

## 6. 依赖

| 依赖 | 说明 | 状态 |
|------|------|------|
| 阿里云账号 | 已有 | ✅ |
| 阿里云 AK/SK | 需创建 RAM 用户并授权 ACR + ECS 权限 | ⏺ |
| GitHub Secrets | 需配置阿里云 AK/SK + kubeconfig | ⏺ |
| Helm | 本地已安装 | ✅ |
| kubectl | 本地已安装 | ✅ |
| docker | 本地已安装 | ✅ |
