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

### #4 test_deployment_smoke 失败

| 项目 | 内容 |
|------|------|
| 测试文件 | `tests/test_deployment.py:173` |
| 现象 | `AssertionError: No ready replicas found (ready: 0)` |
| 原因 | 时序问题 - 无等待机制，直接断言 pod 就绪状态 |
| 分类 | 测试设计缺陷 |
| 解决 | 使用 `wait_helper` 动态等待 pods 就绪（timeout=120s, interval=5s）|

### #5 test_min_replicas_maintained 失败

| 项目 | 内容 |
|------|------|
| 测试文件 | `tests/test_hpa.py:71` |
| 现象 | `AssertionError: Expected at least 2 replicas, got 1` |
| 原因 | 时序问题 - 硬编码 10s 延迟不足，chaos 测试删除 pods 后恢复时间不够 |
| 分类 | 测试设计缺陷 |
| 解决 | 替换 `time.sleep(10)` 为 `wait_helper` 动态等待（timeout=120s, interval=5s）|

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
