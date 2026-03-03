# K8S Auto Testing Platform - 测试用例清单

## 编号规则

```
TC-[模块]-[类型]-[序号]  或  TC-CHAOS-[序号]

TC     = Test Case (测试用例)
模块   = DEP(Deployment) / HPA / SVC(Service) / CHAOS(混沌)
类型   = CFG(配置) / FUN(功能) / INT(集成) / SMK(冒烟)
序号   = 001-999
```

---

## 测试用例汇总

| 模块 | 数量 | 类别 |
|------|------|------|
| Deployment | 8 | 基础设施 |
| HPA | 8 | 自动扩缩 |
| Service | 8 | 网络服务 |
| Pod Chaos | 8 | 混沌工程 |
| Network Chaos | 4 | 混沌工程 |
| Smoke | 1 | 冒烟测试 |
| **合计** | **37** | - |

---

## Deployment 测试 (8个)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-DEP-CFG-001 | 验证 Deployment 存在 | 配置 | P0 |
| TC-DEP-CFG-002 | 验证副本数正确 | 配置 | P0 |
| TC-DEP-CFG-003 | 验证标签配置 | 配置 | P1 |
| TC-DEP-FUN-001 | 验证 Pod 运行状态 | 功能 | P0 |
| TC-DEP-FUN-002 | 验证健康检查配置 | 功能 | P0 |
| TC-DEP-FUN-003 | 验证资源限制 | 功能 | P1 |
| TC-DEP-INT-001 | 验证 Pod 自愈能力 | 集成 | P1 |
| TC-DEP-SMK-001 | Deployment 冒烟测试 | 冒烟 | P0 |

---

## HPA 测试 (8个)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-HPA-CFG-001 | 验证 HPA 存在 | 配置 | P0 |
| TC-HPA-CFG-002 | 验证指标配置 | 配置 | P0 |
| TC-HPA-FUN-001 | 验证最小副本数 | 功能 | P0 |
| TC-HPA-FUN-002 | 验证最大副本限制 | 功能 | P1 |
| TC-HPA-FUN-003 | 验证 HPA 状态 | 功能 | P1 |
| TC-HPA-INT-001 | 验证扩容行为 | 集成 | P1 |
| TC-HPA-INT-002 | 验证缩容行为 | 集成 | P2 |
| TC-HPA-SMK-001 | HPA 冒烟测试 | 冒烟 | P0 |

---

## Service 测试 (8个)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-SVC-CFG-001 | 验证 Service 存在 | 配置 | P0 |
| TC-SVC-CFG-002 | 验证服务类型 | 配置 | P0 |
| TC-SVC-CFG-003 | 验证选择器配置 | 配置 | P1 |
| TC-SVC-CFG-004 | 验证端口配置 | 配置 | P0 |
| TC-SVC-FUN-001 | 验证 Endpoints | 功能 | P0 |
| TC-SVC-FUN-002 | 验证 DNS 名称 | 功能 | P2 |
| TC-SVC-FUN-003 | 验证 NodePort 服务 | 功能 | P1 |
| TC-SVC-SMK-001 | Service 冒烟测试 | 冒烟 | P0 |

---

## Pod 混沌测试 (8个)

| 编号 | 描述 | 方法 | 优先级 |
|------|------|------|--------|
| TC-CHAOS-001 | Pod 删除恢复 | `delete_random_pod()` | P0 |
| TC-CHAOS-002 | 负载下随机 Kill | `delete_random_pod()` | P1 |
| TC-CHAOS-003 | CPU 耗尽扩容 | `exhaust_cpu()` | P1 |
| TC-CHAOS-004 | 内存耗尽处理 | `exhaust_memory()` | P1 |
| TC-CHAOS-005 | 容器重启恢复 | `restart_container()` | P1 |
| TC-CHAOS-006 | 多 Pod 故障 (50%) | `delete_percentage_pods()` | P1 |
| TC-CHAOS-007 | 滚动混沌测试 | `rolling_chaos()` | P2 |
| TC-CHAOS-008 | HPA 扰动稳定性 | Combined | P1 |

---

## 网络混沌测试 (4个)

| 编号 | 描述 | 方法 | 优先级 |
|------|------|------|--------|
| TC-CHAOS-009 | 延迟测量基线 | `measure_latency()` | P1 |
| TC-CHAOS-010 | 并发请求弹性 | `test_network_resilience()` | P1 |
| TC-CHAOS-011 | Pod 扰动期间延迟 | Combined | P2 |
| TC-CHAOS-012 | NetworkPolicy 冒烟 | `apply_network_policy()` | P2 |

---

## 冒烟测试 (1个)

| 编号 | 描述 | 类型 | 优先级 |
|------|------|------|--------|
| TC-CHAOS-SMK-001 | Chaos Tester 冒烟测试 | 冒烟 | P0 |

---

## Chaos Mesh CRD 场景

| 文件 | 类型 | 描述 |
|------|------|------|
| pod-kill.yaml | PodChaos | 随机删除一个 Pod |
| pod-failure.yaml | PodChaos | 注入 Pod 故障 (50%) |
| network-delay.yaml | NetworkChaos | 注入 100ms 延迟 |
| network-partition.yaml | NetworkChaos | 模拟网络分区 |
| network-loss.yaml | NetworkChaos | 注入 30% 丢包 |
| cpu-stress.yaml | StressChaos | 80% CPU 压力 |
| memory-stress.yaml | StressChaos | 128MB 内存压力 |
| hpa-chaos-workflow.yaml | Workflow | 编排多步混沌实验 |

---

## 优先级说明

| 优先级 | 说明 | 数量 |
|--------|------|------|
| P0 | 核心功能，必须通过 | 13 |
| P1 | 重要功能，应该通过 | 17 |
| P2 | 次要功能，可选通过 | 7 |

---

## 执行命令

```bash
# 运行所有测试
pytest tests/ -v

# 按模块运行
pytest tests/test_deployment.py -v
pytest tests/test_hpa.py -v
pytest tests/test_service.py -v
pytest tests/test_chaos.py -v

# 按类型运行
pytest tests/ -v -m smoke        # 冒烟测试
pytest tests/ -v -m integration  # 集成测试
pytest tests/ -v -m chaos        # 混沌测试
pytest tests/ -v -m network      # 网络混沌测试

# 查看测试用例
pytest tests/ -v --collect-only

# 运行 Chaos Mesh 实验
kubectl apply -f chaos-mesh/pod-kill.yaml
kubectl apply -f chaos-mesh/hpa-chaos-workflow.yaml
```

---

*文档版本: 2.0*
*更新日期: 2026-03-03*
