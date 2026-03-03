# 问题排查记录

**日期**: 2026-03-03

---

## 问题清单

### #1 kubectl 连接失败

| 项目 | 内容 |
|------|------|
| 现象 | `kubectl get nodes` 返回 `Unable to connect to the server: EOF` |
| 原因 | 本地代理 (127.0.0.1:7890) 拦截了 K8S 连接 |
| 解决 | 在 `~/.zshrc` 添加: `export no_proxy="localhost,127.0.0.1,kubernetes.docker.internal,.local"` |

### #2 Docker 构建失败

| 项目 | 内容 |
|------|------|
| 现象 | `apt-get update` 无法连接代理 |
| 原因 | 容器内无法访问宿主机代理 |
| 解决 | 使用 `docker build --network=host` 或移除 gcc 依赖 |

### #3 Namespace 未找到

| 项目 | 内容 |
|------|------|
| 现象 | `kubectl apply` 报错 namespace not found |
| 原因 | 资源创建顺序问题 |
| 解决 | 重新执行 `kubectl apply -f k8s-manifests/` |

---

## 环境配置

```bash
# ~/.zshrc 添加
export no_proxy="localhost,127.0.0.1,kubernetes.docker.internal,.local"
```

---

## 测试结果

| 类别 | 通过 | 跳过 | 失败 |
|------|------|------|------|
| Deployment | 8 | 0 | 0 |
| HPA | 6 | 2 | 0 |
| Service | 8 | 0 | 0 |
| **合计** | **22** | **2** | **0** |
