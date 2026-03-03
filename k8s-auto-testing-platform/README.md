# K8S Auto Testing Platform

> Kubernetes 自动化测试平台 - 专注于 HPA/CA 测试、稳定性验证和混沌工程

[![CI](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.25+-326CE5.svg)](https://kubernetes.io/)
[![Pytest](https://img.shields.io/badge/Pytest-7.4.3-green.svg)](https://pytest.org/)
[![Code Style](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Project Overview

**K8S Auto Testing Platform** is an automated testing platform for Kubernetes cloud-native applications. This project focuses on:

- **HPA/CA Auto-scaling Testing** - Verify horizontal pod autoscaler behavior
- **Cloud Platform Stability Validation** - Ensure reliable deployments
- **Chaos Engineering Practices** - Test system resilience
- **DevOps Toolchain Integration** - CI/CD pipeline automation

### Key Achievements

| Metric | Value |
|--------|-------|
| Test Cases | 24 |
| Pass Rate | 92% (22/24) |
| Code Coverage | 54% |
| Code Quality | flake8 + black |

---

## Features

### 1. HPA (Horizontal Pod Autoscaler) Testing

- Scale-up testing - Pod auto-expansion under load
- Scale-down testing - Pod auto-reduction when idle
- Boundary testing - Verify min/max replica limits
- Metrics verification - CPU and Memory thresholds

### 2. Deployment Testing

- Rolling update testing - Zero-downtime deployments
- Resource limit testing - CPU/Memory constraints
- Health check testing - Liveness/Readiness probes
- Pod restart testing - Self-healing verification

### 3. Service Testing

- Load balancing - Traffic distribution
- Service discovery - DNS resolution
- Port mapping - ClusterIP/NodePort
- Endpoint verification

### 4. CI/CD Integration

- GitHub Actions automated testing
- Code quality checks (flake8, black, isort)
- Test coverage reporting
- Artifact upload

---

## Project Structure

```
k8s-auto-testing-platform/
├── app/                          # Test application (FastAPI)
│   ├── main.py                  # 10 API endpoints
│   ├── Dockerfile               # Multi-stage build
│   └── requirements.txt         # App dependencies
│
├── k8s-manifests/               # Kubernetes configurations
│   ├── namespace.yaml           # k8s-testing namespace
│   ├── configmap.yaml           # Environment config
│   ├── deployment.yaml          # 2-10 replica deployment
│   ├── service.yaml             # ClusterIP + NodePort
│   └── hpa.yaml                 # CPU 50% / Memory 70%
│
├── tests/                       # Pytest test suite
│   ├── conftest.py             # Shared fixtures
│   ├── test_deployment.py      # 8 deployment tests
│   ├── test_hpa.py             # 8 HPA tests
│   └── test_service.py         # 8 service tests
│
├── tools/                       # Testing utilities
│   ├── k8s_helper.py           # K8S operations wrapper
│   └── load_generator.py       # CPU/Memory load generator
│
├── scripts/                     # Automation scripts
│   ├── setup-phase1.sh         # Environment setup
│   ├── run-tests.sh            # One-command test runner
│   └── setup-proxy.sh          # Proxy configuration
│
├── docs/                        # Documentation
│   ├── WBS.md                  # Work breakdown structure
│   ├── ARCHITECTURE.md         # System architecture
│   ├── TEST-CASES.md           # Test case catalog
│   └── TROUBLESHOOTING-LOG.md  # Known issues
│
├── .github/workflows/           # CI/CD
│   └── ci.yml                  # GitHub Actions workflow
│
├── PROJECT_STATUS.md            # Current progress (100%)
├── requirements.txt             # Python dependencies
├── pytest.ini                   # Pytest configuration
└── README.md                    # This file
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Docker Desktop with Kubernetes enabled
- kubectl CLI tool

### 1. Clone Repository

```bash
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/k8s-auto-testing-platform
```

### 2. Setup Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure proxy bypass (if needed)
./scripts/setup-proxy.sh
source ~/.zshrc
```

### 3. Deploy to Kubernetes

```bash
# Build Docker image
cd app && docker build -t test-app:latest . && cd ..

# Deploy to K8S
kubectl apply -f k8s-manifests/

# Verify deployment
kubectl get all -n k8s-testing
```

### 4. Run Tests

```bash
# One-command test runner (recommended)
./scripts/run-tests.sh

# Or run manually
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=tests --cov-report=html

# Run smoke tests only
pytest tests/ -v -m smoke
```

---

## Test Results

```
tests/test_deployment.py::TestDeployment::test_deployment_exists PASSED
tests/test_deployment.py::TestDeployment::test_deployment_replicas PASSED
tests/test_deployment.py::TestDeployment::test_deployment_labels PASSED
tests/test_deployment.py::TestDeployment::test_pods_running PASSED
tests/test_deployment.py::TestDeployment::test_pod_health_checks PASSED
tests/test_deployment.py::TestDeployment::test_pod_resources PASSED
tests/test_deployment.py::TestDeployment::test_pod_restart PASSED
tests/test_deployment.py::test_deployment_smoke PASSED
tests/test_hpa.py::TestHPAScaling::test_hpa_exists PASSED
tests/test_hpa.py::TestHPAScaling::test_hpa_metrics_configured PASSED
tests/test_hpa.py::TestHPAScaling::test_min_replicas_maintained PASSED
tests/test_hpa.py::TestHPAScaling::test_hpa_scale_up SKIPPED
tests/test_hpa.py::TestHPAScaling::test_hpa_scale_down SKIPPED
tests/test_hpa.py::TestHPAScaling::test_max_replicas_not_exceeded PASSED
tests/test_hpa.py::TestHPAScaling::test_hpa_status PASSED
tests/test_hpa.py::test_hpa_smoke PASSED
tests/test_service.py::TestService::test_service_exists PASSED
tests/test_service.py::TestService::test_service_type PASSED
tests/test_service.py::TestService::test_service_selector PASSED
tests/test_service.py::TestService::test_service_ports PASSED
tests/test_service.py::TestService::test_service_endpoints PASSED
tests/test_service.py::TestService::test_service_dns PASSED
tests/test_service.py::TestService::test_nodeport_service_exists PASSED
tests/test_service.py::test_service_smoke PASSED

========================= 22 passed, 2 skipped =========================
```

---

## HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: test-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: test-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Container | Docker | 29.x |
| Orchestration | Kubernetes | 1.32+ |
| Runtime | Python | 3.9+ |
| Web Framework | FastAPI | 0.109.0 |
| Testing | Pytest | 7.4.3 |
| K8S Client | kubernetes | 28.1.0 |
| Load Testing | Locust | 2.20.0 |
| Code Quality | flake8, black, isort | Latest |
| CI/CD | GitHub Actions | - |

---

## Development Phases

### Phase 1: Environment Setup ✅
- Project structure setup
- Test application development
- Kubernetes manifests
- Basic test framework

### Phase 2: Core Functionality ✅
- HPA testing implementation
- Test suite execution (22/24 passing)
- Load generation tools
- Automation scripts

### Phase 3: CI/CD & Quality ✅
- GitHub Actions workflow
- Code quality checks (flake8, black)
- Test coverage reporting
- Architecture documentation

### Phase 4: Final Release ✅
- Documentation updates
- Final review and cleanup
- Git tag v1.0.0

---

## Documentation

- [Architecture Design](docs/ARCHITECTURE.md)
- [Test Case Catalog](docs/TEST-CASES.md)
- [Work Breakdown Structure](docs/WBS.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING-LOG.md)
- [Project Status](PROJECT_STATUS.md)

---

## Author

**Michael Zhou**
- Email: zhou_juxi@hotmail.com
- GitHub: [@zhoujuxi2028](https://github.com/zhoujuxi2028)
- Target Role: Senior Test Engineer (Cloud Products)

---

## License

This project is licensed under the MIT License.

---

*Created: 2026-03-02 | Last Updated: 2026-03-03 | Version: 1.0.0*
