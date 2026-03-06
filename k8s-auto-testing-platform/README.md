# K8S Auto Testing Platform

[![CI](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.25+-326CE5.svg)](https://kubernetes.io/)
[![Chaos Mesh](https://img.shields.io/badge/Chaos%20Mesh-Ready-orange.svg)](https://chaos-mesh.org/)
[![pylint](https://img.shields.io/badge/pylint-9.68%2F10-brightgreen.svg)](https://pylint.org/)
[![flake8](https://img.shields.io/badge/flake8-0%20errors-brightgreen.svg)](https://flake8.pycqa.org/)

---

## Table of Contents

- [English](#english)
  - [Overview](#overview)
  - [Features](#features)
  - [Test Results](#test-results)
  - [Quick Start](#quick-start)
  - [Project Structure](#project-structure)
  - [Documentation](#documentation)
- [中文](#中文)
  - [项目简介](#项目简介)
  - [核心功能](#核心功能)
  - [测试结果](#测试结果)
  - [快速开始](#快速开始)
  - [项目结构](#项目结构-1)
  - [文档](#文档)

---

# English

## Overview

Kubernetes automated testing platform focused on **HPA auto-scaling testing**, **chaos engineering**, and **cloud platform stability validation**.

| Metric | Value |
|--------|-------|
| Test Cases | 37 |
| Test Results | 27 passed, 10 skipped, 0 failed |
| Pass Rate | 100% |
| Chaos Scenarios | 12 |
| Chaos Mesh | Supported |

## Features

**1. HPA Testing**
- Scale-up/down behavior verification
- Min/max replica boundary testing
- CPU/Memory threshold validation
- Stress testing with configurable load

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

**4. Performance Testing**
- Locust load testing framework (`tests/locustfile.py`)
- HPA stress test automation (`scripts/hpa-stress-test.sh`)
- Configurable duration and concurrency
- CSV metrics export and reporting

**5. Monitoring**
- Prometheus metrics collection (`monitoring/prometheus-deployment.yaml`)
- Grafana dashboards (`monitoring/grafana-deployment.yaml`)
- Custom HPA monitoring dashboard (`monitoring/grafana-dashboard.json`)
- Alert rules configuration (`monitoring/prometheus-rules.yaml`)

**6. CI/CD Integration**
- GitHub Actions automation
- Code quality checks (pylint: 9.68/10, flake8: 0 errors)
- Test report generation (HTML, JUnit XML, JSON)
- Automated PR validation

## Test Results

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

# Run tests with HTML report
pytest tests/ -v --html=reports/test-report.html

# Run chaos tests
pytest tests/test_chaos.py -v -m chaos

# Run HPA stress test
./scripts/hpa-stress-test.sh --duration 120 --concurrency 15

# Run performance test
./scripts/run-performance-test.sh
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
│   ├── test_chaos.py       # Chaos tests (13)
│   └── locustfile.py       # Locust load testing
├── tools/                  # Testing utilities
│   ├── chaos_tester.py     # Chaos tester
│   └── load_generator.py   # Load generator
├── monitoring/             # Prometheus + Grafana
│   ├── prometheus-deployment.yaml
│   ├── prometheus-rules.yaml
│   ├── grafana-deployment.yaml
│   └── grafana-dashboard.json
├── scripts/                # Automation scripts
│   ├── hpa-stress-test.sh  # HPA stress testing
│   ├── run-performance-test.sh
│   ├── run-tests.sh
│   ├── generate-report.sh
│   ├── DEMO-GUIDE.md       # Demo walkthrough
│   └── VIDEO-RECORDING-GUIDE.md
├── reports/                # Test reports
│   ├── test-report.html
│   ├── executive-summary.html
│   ├── junit-results.xml
│   ├── test-results.json
│   └── hpa-stress/         # HPA stress test logs
└── docs/                   # Documentation
```

## Documentation

### Core Documentation
- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Test Cases](docs/TEST-CASES.md) - Complete test case catalog
- [Chaos Engineering](docs/CHAOS-ENGINEERING.md) - Chaos testing methodology
- [Monitoring Guide](docs/MONITORING-GUIDE.md) - Prometheus/Grafana setup

### Technical References
- [API Documentation](docs/API-DOCUMENTATION.md) - FastAPI endpoints
- [FAQ](docs/FAQ.md) - Frequently asked questions
- [Troubleshooting](docs/TROUBLESHOOTING-LOG.md) - Known issues and solutions

### Reports & Analysis
- [Performance Report](docs/PERFORMANCE-REPORT.md) - Load testing results
- [Coverage Report](docs/COVERAGE-REPORT.md) - Test coverage analysis
- [Test Report](docs/TEST-REPORT.md) - Test execution summary

### Interview Preparation
- [Interview Story](docs/INTERVIEW-STORY.md) - Project talking points
- [Technical Q&A](docs/TECHNICAL-QA.md) - Technical interview prep
- [WBS Guide](docs/WBS-GUIDE.md) - Work breakdown structure

### Demo Resources
- [Demo Guide](scripts/DEMO-GUIDE.md) - Live demo walkthrough
- [Video Recording Guide](scripts/VIDEO-RECORDING-GUIDE.md) - Recording instructions
- [Chaos Mesh Guide](chaos-mesh/README.md) - Chaos Mesh usage

---

# 中文

## 项目简介

Kubernetes 自动化测试平台，专注于 **HPA 自动扩缩容测试**、**混沌工程** 和 **云平台稳定性验证**。

| 指标 | 数值 |
|-----|------|
| 测试用例 | 37 |
| 测试结果 | 27 通过, 10 跳过, 0 失败 |
| 通过率 | 100% |
| 混沌场景 | 12 类 |
| Chaos Mesh | 支持 |

## 核心功能

**1. HPA 测试**
- 扩容/缩容行为验证
- 最小/最大副本数边界测试
- CPU/内存指标阈值验证
- 可配置负载的压力测试

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

**4. 性能测试**
- Locust 负载测试框架 (`tests/locustfile.py`)
- HPA 压力测试自动化 (`scripts/hpa-stress-test.sh`)
- 可配置持续时间和并发数
- CSV 指标导出和报告

**5. 监控**
- Prometheus 指标收集 (`monitoring/prometheus-deployment.yaml`)
- Grafana 仪表板 (`monitoring/grafana-deployment.yaml`)
- 自定义 HPA 监控面板 (`monitoring/grafana-dashboard.json`)
- 告警规则配置 (`monitoring/prometheus-rules.yaml`)

**6. CI/CD 集成**
- GitHub Actions 自动化
- 代码质量检查 (pylint: 9.68/10, flake8: 0 错误)
- 测试报告生成 (HTML, JUnit XML, JSON)
- 自动化 PR 验证

## 测试结果

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

# 运行测试并生成 HTML 报告
pytest tests/ -v --html=reports/test-report.html

# 运行混沌测试
pytest tests/test_chaos.py -v -m chaos

# 运行 HPA 压力测试
./scripts/hpa-stress-test.sh --duration 120 --concurrency 15

# 运行性能测试
./scripts/run-performance-test.sh
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
│   ├── test_chaos.py       # 混沌测试 (13)
│   └── locustfile.py       # Locust 负载测试
├── tools/                  # 测试工具
│   ├── chaos_tester.py     # 混沌测试器
│   └── load_generator.py   # 负载生成器
├── monitoring/             # Prometheus + Grafana
│   ├── prometheus-deployment.yaml
│   ├── prometheus-rules.yaml
│   ├── grafana-deployment.yaml
│   └── grafana-dashboard.json
├── scripts/                # 自动化脚本
│   ├── hpa-stress-test.sh  # HPA 压力测试
│   ├── run-performance-test.sh
│   ├── run-tests.sh
│   ├── generate-report.sh
│   ├── DEMO-GUIDE.md       # 演示指南
│   └── VIDEO-RECORDING-GUIDE.md
├── reports/                # 测试报告
│   ├── test-report.html
│   ├── executive-summary.html
│   ├── junit-results.xml
│   ├── test-results.json
│   └── hpa-stress/         # HPA 压力测试日志
└── docs/                   # 文档
```

## 文档

### 核心文档
- [架构设计](docs/ARCHITECTURE.md) - 系统设计和组件
- [测试用例](docs/TEST-CASES.md) - 完整测试用例目录
- [混沌工程](docs/CHAOS-ENGINEERING.md) - 混沌测试方法论
- [监控指南](docs/MONITORING-GUIDE.md) - Prometheus/Grafana 设置

### 技术参考
- [API 文档](docs/API-DOCUMENTATION.md) - FastAPI 端点
- [常见问题](docs/FAQ.md) - 常见问题解答
- [故障排除](docs/TROUBLESHOOTING-LOG.md) - 已知问题和解决方案

### 报告与分析
- [性能报告](docs/PERFORMANCE-REPORT.md) - 负载测试结果
- [覆盖率报告](docs/COVERAGE-REPORT.md) - 测试覆盖分析
- [测试报告](docs/TEST-REPORT.md) - 测试执行摘要

### 面试准备
- [项目故事](docs/INTERVIEW-STORY.md) - 项目要点
- [技术问答](docs/TECHNICAL-QA.md) - 技术面试准备
- [WBS 指南](docs/WBS-GUIDE.md) - 工作分解结构

### 演示资源
- [演示指南](scripts/DEMO-GUIDE.md) - 现场演示流程
- [视频录制指南](scripts/VIDEO-RECORDING-GUIDE.md) - 录制说明
- [Chaos Mesh 指南](chaos-mesh/README.md) - Chaos Mesh 使用

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Container | Docker, Kubernetes |
| Language | Python 3.9+ |
| Testing | Pytest, Locust |
| Chaos | Chaos Mesh, K8s API |
| Monitoring | Prometheus, Grafana |
| CI/CD | GitHub Actions |
| Code Quality | pylint, flake8, black |

## Author

**Michael Zhou** | [GitHub](https://github.com/zhoujuxi2028) | zhou_juxi@hotmail.com

---

*Version: 1.2.0 | License: MIT*
