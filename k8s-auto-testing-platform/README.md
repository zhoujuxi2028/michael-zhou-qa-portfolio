# K8S Auto Testing Platform

[![CI](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.25+-326CE5.svg)](https://kubernetes.io/)

---

## 目录 / Table of Contents

- [中文](#中文)
  - [项目简介](#项目简介)
  - [核心功能](#核心功能)
  - [快速开始](#快速开始)
  - [项目结构](#项目结构)
- [English](#english)
  - [Overview](#overview)
  - [Features](#features)
  - [Quick Start](#quick-start)
  - [Project Structure](#project-structure)

---

# 中文

## 项目简介

Kubernetes 自动化测试平台，专注于 **HPA 自动扩缩容测试**、**混沌工程** 和 **云平台稳定性验证**。

| 指标 | 数值 |
|-----|------|
| 测试用例 | 24 |
| 通过率 | 92% |
| 混沌场景 | 8 类 |

## 核心功能

**1. HPA 测试**
- 扩容/缩容行为验证
- 最小/最大副本数边界测试
- CPU/内存指标阈值验证

**2. 混沌工程**
- Pod 故障注入与恢复
- CPU/内存压力测试
- 多 Pod 级联故障
- 滚动混沌测试

**3. 部署与服务测试**
- Deployment 健康检查
- Service 负载均衡验证
- NodePort 端点测试

**4. CI/CD 集成**
- GitHub Actions 自动化
- 代码质量检查 (flake8, black)
- 测试报告生成

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
```

## 项目结构

```
k8s-auto-testing-platform/
├── app/                    # FastAPI 测试应用
├── k8s-manifests/          # K8S 配置文件
├── tests/                  # Pytest 测试套件
│   ├── test_deployment.py  # 部署测试
│   ├── test_hpa.py         # HPA 测试
│   ├── test_service.py     # 服务测试
│   └── test_chaos.py       # 混沌测试
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
| Test Cases | 24 |
| Pass Rate | 92% |
| Chaos Scenarios | 8 |

## Features

**1. HPA Testing**
- Scale-up/down behavior verification
- Min/max replica boundary testing
- CPU/Memory threshold validation

**2. Chaos Engineering**
- Pod fault injection and recovery
- CPU/Memory stress testing
- Multi-pod cascade failures
- Rolling chaos testing

**3. Deployment & Service Testing**
- Deployment health checks
- Service load balancing
- NodePort endpoint testing

**4. CI/CD Integration**
- GitHub Actions automation
- Code quality checks (flake8, black)
- Test report generation

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
```

## Project Structure

```
k8s-auto-testing-platform/
├── app/                    # FastAPI test application
├── k8s-manifests/          # K8S configuration files
├── tests/                  # Pytest test suite
│   ├── test_deployment.py  # Deployment tests
│   ├── test_hpa.py         # HPA tests
│   ├── test_service.py     # Service tests
│   └── test_chaos.py       # Chaos tests
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
| CI/CD | GitHub Actions |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Test Cases](docs/TEST-CASES.md)
- [Chaos Engineering](docs/CHAOS-ENGINEERING.md)

## Author

**Michael Zhou** | [GitHub](https://github.com/zhoujuxi2028) | zhou_juxi@hotmail.com

---

*Version: 1.0.0 | License: MIT*
