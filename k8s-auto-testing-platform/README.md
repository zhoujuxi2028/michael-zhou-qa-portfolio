# 🚀 K8S Auto Testing Platform

> Kubernetes 自动化测试平台 - 专注于 HPA/CA 测试、稳定性验证和混沌工程

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.25+-326CE5.svg)](https://kubernetes.io/)
[![Pytest](https://img.shields.io/badge/Pytest-7.0+-green.svg)](https://pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 项目简介

**K8S Auto Testing Platform** 是一个针对 Kubernetes 云原生应用开发的自动化测试平台。该项目专注于：
- **HPA/CA 自动扩缩容测试**
- **云平台稳定性验证**
- **混沌工程实践**
- **DevOps 测试工具链集成**

### 核心价值
- ✅ **自动化优先** - 一键执行完整测试流程
- ✅ **覆盖全面** - 从单元测试到集成测试到混沌测试
- ✅ **可视化报告** - 清晰的测试结果和性能指标
- ✅ **CI/CD 集成** - 无缝接入持续集成流水线

---

## 🎯 功能特性

### 1. HPA (Horizontal Pod Autoscaler) 测试 ⭐⭐⭐⭐⭐
- ✅ 扩容测试 - 负载增加时 Pod 自动扩展
- ✅ 缩容测试 - 负载降低时 Pod 自动回收
- ✅ 边界测试 - 验证 min/maxReplicas 限制
- ✅ 性能测试 - 测量扩缩容响应时间

### 2. Deployment 测试
- ✅ 滚动更新测试 - 验证零停机部署
- ✅ 回滚测试 - 测试版本回退能力
- ✅ 资源限制测试 - 验证 CPU/Memory limits
- ✅ 健康检查测试 - Liveness/Readiness Probes

### 3. Service 测试
- ✅ 负载均衡测试 - 验证流量分发
- ✅ 服务发现测试 - DNS 解析验证
- ✅ 端口映射测试 - ClusterIP/NodePort/LoadBalancer

### 4. 混沌工程测试 ⭐⭐⭐
- ✅ Pod 故障注入 - 随机删除 Pod 测试自愈
- ✅ 网络延迟注入 - 模拟网络抖动
- ✅ 资源耗尽测试 - CPU/Memory 压力测试

### 5. CI/CD 集成
- ✅ GitHub Actions 自动化测试
- ✅ 测试报告自动生成
- ✅ 覆盖率统计

---

## 📦 项目结构

```
k8s-auto-testing-platform/
├── app/                          # 测试目标应用
│   ├── main.py                  # FastAPI 应用入口
│   ├── Dockerfile               # 应用容器化
│   └── requirements.txt         # Python 依赖
│
├── k8s-manifests/               # Kubernetes 配置文件
│   ├── deployment.yaml          # Deployment 配置
│   ├── service.yaml             # Service 配置
│   ├── hpa.yaml                 # HPA 配置 ⭐
│   ├── configmap.yaml           # ConfigMap 配置
│   └── namespace.yaml           # Namespace 配置
│
├── tests/                       # 自动化测试
│   ├── conftest.py             # Pytest 配置
│   ├── test_deployment.py      # Deployment 测试
│   ├── test_hpa.py             # HPA 测试 ⭐⭐⭐
│   ├── test_service.py         # Service 测试
│   ├── test_chaos.py           # 混沌测试
│   └── test_integration.py     # 集成测试
│
├── tools/                       # 测试工具
│   ├── load_generator.py       # 负载生成器
│   ├── metrics_collector.py    # 指标收集器
│   ├── k8s_helper.py           # K8S 操作封装
│   └── report_generator.py     # 报告生成器
│
├── docs/                        # 文档
│   ├── architecture.md         # 架构设计
│   ├── test-plan.md            # 测试计划
│   └── test-report.md          # 测试报告
│
├── .github/workflows/          # CI/CD
│   └── test.yml                # 自动化测试流水线
│
├── requirements.txt            # 项目依赖
├── pytest.ini                  # Pytest 配置
└── README.md                   # 本文件
```

---

## 🚀 快速开始

### 前置条件

- Python 3.9+
- Docker Desktop (启用 Kubernetes)
- kubectl 命令行工具

### 1. 克隆项目

```bash
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/k8s-auto-testing-platform
```

### 2. 安装依赖

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 部署测试应用到 K8S

```bash
# 创建命名空间
kubectl apply -f k8s-manifests/namespace.yaml

# 部署应用
kubectl apply -f k8s-manifests/

# 验证部署
kubectl get all -n k8s-testing
```

### 4. 运行测试

```bash
# 运行所有测试
pytest tests/ -v

# 运行 HPA 测试
pytest tests/test_hpa.py -v -s

# 生成覆盖率报告
pytest tests/ --cov=. --cov-report=html
```

---

## 🛠️ 技术栈

| 类别 | 技术 |
|-----|------|
| **容器编排** | Kubernetes, Docker |
| **编程语言** | Python 3.9+ |
| **测试框架** | Pytest, Locust |
| **应用框架** | FastAPI |
| **CI/CD** | GitHub Actions |
| **工具库** | kubernetes-client, requests, pyyaml |

---

## 📝 开发计划

### Phase 1: 基础搭建
- [ ] 项目结构搭建
- [ ] 测试应用开发
- [ ] K8S 配置文件
- [ ] 基础测试用例

### Phase 2: 核心功能
- [ ] HPA 测试框架
- [ ] 负载生成器
- [ ] 测试报告生成
- [ ] CI/CD 集成

### Phase 3: 高级功能
- [ ] 混沌工程实践
- [ ] 性能监控集成
- [ ] 完整测试报告

---

## 👤 作者

**Michael Zhou**
- 📧 Email: zhou_juxi@hotmail.com / zhoujuxi@163.com
- 🔗 GitHub: [@zhoujuxi2028](https://github.com/zhoujuxi2028)
- 💼 职位目标: 资深测试工程师（云产品）

---

## 📄 许可证

本项目采用 MIT 许可证

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：
- 📧 Email: zhou_juxi@hotmail.com
- 📧 备用邮箱: zhoujuxi@163.com
- 🔗 GitHub: https://github.com/zhoujuxi2028

---

**⭐ 如果这个项目对您有帮助，欢迎 Star！**

---

*项目创建时间: 2026-03-02*
*最后更新: 2026-03-02*
