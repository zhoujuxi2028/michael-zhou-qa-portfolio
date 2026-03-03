# K8S Auto Testing Platform - 测试用例清单

## 编号规则

```
TC-[模块]-[类型]-[序号]

TC   = Test Case (测试用例)
模块 = DEP(Deployment) / HPA / SVC(Service)
类型 = CFG(配置) / FUN(功能) / INT(集成) / SMK(冒烟)
序号 = 001-999
```

---

## 测试用例汇总

| 模块 | CFG | FUN | INT | SMK | 合计 |
|------|-----|-----|-----|-----|------|
| Deployment | 3 | 3 | 1 | 1 | 8 |
| HPA | 2 | 3 | 2 | 1 | 8 |
| Service | 4 | 3 | 0 | 1 | 8 |
| **合计** | **9** | **9** | **3** | **3** | **24** |

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

## 优先级说明

| 优先级 | 说明 | 数量 |
|--------|------|------|
| P0 | 核心功能，必须通过 | 12 |
| P1 | 重要功能，应该通过 | 9 |
| P2 | 次要功能，可选通过 | 3 |

---

## 执行命令

```bash
# 运行所有测试
pytest tests/ -v

# 按模块运行
pytest tests/test_deployment.py -v
pytest tests/test_hpa.py -v
pytest tests/test_service.py -v

# 按类型运行
pytest tests/ -v -m smoke      # 冒烟测试
pytest tests/ -v -m integration # 集成测试

# 查看测试用例编号
pytest tests/ -v --collect-only
```

---

*文档版本: 1.0*
*更新日期: 2026-03-03*
