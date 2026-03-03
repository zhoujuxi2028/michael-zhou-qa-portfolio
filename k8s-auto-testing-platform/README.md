# K8S Auto Testing Platform

[![CI](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.25+-326CE5.svg)](https://kubernetes.io/)
[![Chaos Mesh](https://img.shields.io/badge/Chaos%20Mesh-Ready-orange.svg)](https://chaos-mesh.org/)

---

## 目录 / Table of Contents

- [中文](#中文)
  - [项目简介](#项目简介)
  - [核心功能](#核心功能)
  - [测试用例](#测试用例)
  - [快速开始](#快速开始)
  - [项目结构](#项目结构)
- [English](#english)
  - [Overview](#overview)
  - [Features](#features)
  - [Test Cases](#test-cases)
  - [Quick Start](#quick-start)
  - [Project Structure](#project-structure)

---

# 中文

## 项目简介

Kubernetes 自动化测试平台，专注于 **HPA 自动扩缩容测试**、**混沌工程** 和 **云平台稳定性验证**。

| 指标 | 数值 |
|-----|------|
| 测试用例 | 37 |
| 通过率 | 100% |
| 混沌场景 | 12 类 |
| Chaos Mesh | 支持 |

## 核心功能

**1. HPA 测试**
- 扩容/缩容行为验证
- 最小/最大副本数边界测试
- CPU/内存指标阈值验证

**2. 混沌工程**
- Pod 故障注入与恢复 (TC-CHAOS-001 ~ 008)
- 网络延迟/丢包测试 (TC-CHAOS-009 ~ 012)
- CPU/内存压力测试
- Chaos Mesh CRD 集成

**3. 网络混沌测试**
- 延迟测量与基线分析
- 并发请求弹性测试
- Pod 扰动期间延迟监控
- NetworkPolicy 分区模拟

**4. CI/CD 集成**
- GitHub Actions 自动化
- 代码质量检查 (pylint, flake8, black)
- 测试报告生成

## 测试用例

| 类别 | 用例数 | 编号 |
|-----|-------|------|
| 部署测试 | 8 | TC-DEP-* |
| HPA 测试 | 8 | TC-HPA-* |
| 服务测试 | 8 | TC-SVC-* |
| Pod 混沌 | 8 | TC-CHAOS-001 ~ 008 |
| 网络混沌 | 4 | TC-CHAOS-009 ~ 012 |
| 冒烟测试 | 1 | TC-CHAOS-SMK-001 |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/k8s-auto-testing-platform

# 安装依赖
pip install -r requirements.txt

# 部署到 K8S
kubectl apply -f k8s-manifests/

# 运行测试
pytest tests/ -v

# 运行混沌测试
pytest tests/test_chaos.py -v -m chaos
```

## 项目结构

```
k8s-auto-testing-platform/
├── app/                    # FastAPI 测试应用
├── k8s-manifests/          # K8S 配置文件
├── chaos-mesh/             # Chaos Mesh CRD 配置
│   ├── pod-kill.yaml       # Pod 删除实验
│   ├── network-delay.yaml  # 网络延迟实验
│   ├── cpu-stress.yaml     # CPU 压力实验
│   └── hpa-chaos-workflow.yaml  # 混沌工作流
├── tests/                  # Pytest 测试套件
│   ├── test_deployment.py  # 部署测试 (8)
│   ├── test_hpa.py         # HPA 测试 (8)
│   ├── test_service.py     # 服务测试 (8)
│   └── test_chaos.py       # 混沌测试 (13)
├── tools/                  # 测试工具
│   ├── chaos_tester.py     # 混沌测试器
│   └── load_generator.py   # 负载生成器
└── docs/                   # 文档
```

---

# English

## Overview

Kubernetes automated testing platform focused on **HPA auto-scaling testing**, **chaos engineering**, and **cloud platform stability validation**.

| Metric | Value |
|--------|-------|
| Test Cases | 37 |
| Pass Rate | 100% |
| Chaos Scenarios | 12 |
| Chaos Mesh | Supported |

## Features

**1. HPA Testing**
- Scale-up/down behavior verification
- Min/max replica boundary testing
- CPU/Memory threshold validation

**2. Chaos Engineering**
- Pod fault injection and recovery (TC-CHAOS-001 ~ 008)
- Network delay/loss testing (TC-CHAOS-009 ~ 012)
- CPU/Memory stress testing
- Chaos Mesh CRD integration

**3. Network Chaos Testing**
- Latency measurement and baseline analysis
- Concurrent request resilience testing
- Latency monitoring during pod churn
- NetworkPolicy partition simulation

**4. CI/CD Integration**
- GitHub Actions automation
- Code quality checks (pylint, flake8, black)
- Test report generation

## Test Cases

| Category | Count | ID Range |
|----------|-------|----------|
| Deployment | 8 | TC-DEP-* |
| HPA | 8 | TC-HPA-* |
| Service | 8 | TC-SVC-* |
| Pod Chaos | 8 | TC-CHAOS-001 ~ 008 |
| Network Chaos | 4 | TC-CHAOS-009 ~ 012 |
| Smoke | 1 | TC-CHAOS-SMK-001 |

## Quick Start

```bash
# Clone repository
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/k8s-auto-testing-platform

# Install dependencies
pip install -r requirements.txt

# Deploy to K8S
kubectl apply -f k8s-manifests/

# Run tests
pytest tests/ -v

# Run chaos tests
pytest tests/test_chaos.py -v -m chaos
```

## Project Structure

```
k8s-auto-testing-platform/
├── app/                    # FastAPI test application
├── k8s-manifests/          # K8S configuration files
├── chaos-mesh/             # Chaos Mesh CRD configs
│   ├── pod-kill.yaml       # Pod kill experiment
│   ├── network-delay.yaml  # Network delay experiment
│   ├── cpu-stress.yaml     # CPU stress experiment
│   └── hpa-chaos-workflow.yaml  # Chaos workflow
├── tests/                  # Pytest test suite
│   ├── test_deployment.py  # Deployment tests (8)
│   ├── test_hpa.py         # HPA tests (8)
│   ├── test_service.py     # Service tests (8)
│   └── test_chaos.py       # Chaos tests (13)
├── tools/                  # Testing utilities
│   ├── chaos_tester.py     # Chaos tester
│   └── load_generator.py   # Load generator
└── docs/                   # Documentation
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Container | Docker, Kubernetes |
| Language | Python 3.9+ |
| Testing | Pytest |
| Chaos | Chaos Mesh, K8s API |
| CI/CD | GitHub Actions |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Test Cases](docs/TEST-CASES.md)
- [Chaos Engineering](docs/CHAOS-ENGINEERING.md)
- [Chaos Mesh Guide](chaos-mesh/README.md)

## Author

**Michael Zhou** | [GitHub](https://github.com/zhoujuxi2028) | zhou_juxi@hotmail.com

---

*Version: 1.2.0 | License: MIT*
