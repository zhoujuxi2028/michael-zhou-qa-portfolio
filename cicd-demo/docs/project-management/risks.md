# 初始风险登记

## 技术风险

| ID | 风险 | 可能性 | 影响 | 缓解措施 |
|----|------|--------|------|----------|
| RISK-01 | 阿里云抢占式实例被回收 | 中 | 集群宕机，需重新部署 | 设置快照；接受非生产环境可容忍的中断 |
| RISK-02 | ECS 公网 IP 变更 | 低 | kubeconfig 中的 IP 失效 | 使用弹性公网 IP（EIP）而非自动分配 |
| RISK-03 | ACR 镜像拉取认证失败 | 中 | K3s 无法拉取私有镜像 | 配置 imagePullSecrets；使用 ACR 临时 token |

## 环境风险

| ID | 风险 | 可能性 | 影响 | 缓解措施 |
|----|------|--------|------|----------|
| RISK-04 | 本地网络无法访问阿里云资源 | 低 | SSH/kubectl 连接失败 | 验证 ECS 安全组规则 |
| RISK-05 | GitHub Actions runner IP 被阿里云防火墙拦截 | 低 | CI 无法 docker push | 配置安全组白名单或使用 OIDC 认证 |

## 依赖风险

| ID | 风险 | 可能性 | 影响 | 缓解措施 |
|----|------|--------|------|----------|
| RISK-06 | GitHub Actions 无阿里云 CLI 或 acr login 异常 | 中 | docker push 失败 | 使用 `aliyun-cli` action 或直接在 runner 安装；先用 `aliyun configure` 测试 |
| RISK-07 | 阿里云 RAM 权限配置复杂 | 中 | AK/SK 权限不足导致操作失败 | 最小权限原则：ECS 只读 + ACR 推送 + ACR 拉取 |

## 已解决

（暂无）
