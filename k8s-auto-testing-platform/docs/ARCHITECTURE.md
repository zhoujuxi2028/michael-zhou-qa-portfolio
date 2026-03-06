# K8S Auto Testing Platform - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        K8S Auto Testing Platform                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Pytest     │────▶│  K8S Client  │────▶│  Kubernetes  │        │
│  │  Test Suite  │     │    (API)     │     │   Cluster    │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│         │                                         │                  │
│         ▼                                         ▼                  │
│  ┌──────────────┐                         ┌──────────────┐          │
│  │    Test      │                         │   test-app   │          │
│  │   Reports    │                         │  (FastAPI)   │          │
│  └──────────────┘                         └──────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Test Application (FastAPI)

**Location**: `app/main.py`

```
┌─────────────────────────────────────────────┐
│              FastAPI Application            │
├─────────────────────────────────────────────┤
│  Endpoints:                                 │
│  ├── /health      → Liveness probe          │
│  ├── /ready       → Readiness probe         │
│  ├── /metrics     → CPU/Memory metrics      │
│  ├── /cpu-load    → Generate CPU load       │
│  ├── /memory-load → Allocate memory         │
│  └── /info        → Pod metadata            │
├─────────────────────────────────────────────┤
│  Resource Configuration:                    │
│  ├── CPU Request:  100m                     │
│  ├── CPU Limit:    200m                     │
│  ├── Memory Request: 128Mi                  │
│  └── Memory Limit:   256Mi                  │
└─────────────────────────────────────────────┘
```

### 2. Kubernetes Resources

```
┌─────────────────────────────────────────────────────────────────┐
│                     k8s-testing Namespace                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ ConfigMap   │    │ Deployment  │    │    HPA      │         │
│  │             │    │  (2-10)     │    │ CPU: 50%    │         │
│  │ APP_ENV=dev │───▶│  replicas   │◀───│ Mem: 70%    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Pods (2-10)                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Pod 1   │  │ Pod 2   │  │ Pod 3   │  │  ...    │    │   │
│  │  │test-app │  │test-app │  │test-app │  │         │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────┐              │
│  │              Services                         │              │
│  │  ┌─────────────────┐  ┌─────────────────┐   │              │
│  │  │ ClusterIP:80    │  │ NodePort:30080  │   │              │
│  │  │ (internal)      │  │ (external)      │   │              │
│  │  └─────────────────┘  └─────────────────┘   │              │
│  └──────────────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. HPA (Horizontal Pod Autoscaler)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HPA Configuration                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Metrics:                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │  CPU Utilization                        │                    │
│  │  ├── Target: 50%                        │                    │
│  │  └── Current: ~3%                       │                    │
│  ├─────────────────────────────────────────┤                    │
│  │  Memory Utilization                     │                    │
│  │  ├── Target: 70%                        │                    │
│  │  └── Current: ~25%                      │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  Scaling Behavior:                                               │
│  ┌─────────────────────────────────────────┐                    │
│  │  Scale Up                               │                    │
│  │  ├── Policy: +100% pods                 │                    │
│  │  ├── Max: 4 pods per 15s                │                    │
│  │  └── Stabilization: 0s                  │                    │
│  ├─────────────────────────────────────────┤                    │
│  │  Scale Down                             │                    │
│  │  ├── Policy: -50% pods                  │                    │
│  │  ├── Max: 2 pods per 60s                │                    │
│  │  └── Stabilization: 300s                │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  Replica Range: min=2, max=10                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Test Framework Architecture

### Test Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                       Test Suite (24 Cases)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Test Files                                              │   │
│  │  ├── test_deployment.py (8 tests)                        │   │
│  │  │   └── Deployment, Pods, Resources, Health Checks      │   │
│  │  ├── test_hpa.py (8 tests)                               │   │
│  │  │   └── HPA Config, Scaling, Metrics                    │   │
│  │  └── test_service.py (8 tests)                           │   │
│  │      └── Service, Endpoints, DNS, Connectivity           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  conftest.py (Shared Fixtures)                           │   │
│  │  ├── k8s_client      → K8S API client                    │   │
│  │  ├── apps_v1_api     → Deployment API                    │   │
│  │  ├── core_v1_api     → Pod/Service API                   │   │
│  │  ├── autoscaling_v2  → HPA API                           │   │
│  │  ├── namespace       → k8s-testing                       │   │
│  │  └── wait_helper     → Polling utilities                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tools                                                   │   │
│  │  ├── k8s_helper.py   → K8S operations wrapper            │   │
│  │  └── load_generator.py → CPU/Memory load generation      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Test Categories (Markers)

| Marker | Description | Example Tests |
|--------|-------------|---------------|
| `@pytest.mark.smoke` | Quick sanity checks | test_deployment_smoke |
| `@pytest.mark.deployment` | Deployment tests | test_deployment_exists |
| `@pytest.mark.hpa` | HPA scaling tests | test_hpa_exists |
| `@pytest.mark.service` | Service tests | test_service_exists |
| `@pytest.mark.integration` | Integration tests | test_hpa_scale_up |
| `@pytest.mark.slow` | Long-running tests | test_hpa_scale_down |

## Deployment Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Build  │────▶│  Deploy │────▶│  Verify │────▶│  Test   │
│  Image  │     │  to K8S │     │  Health │     │  Suite  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ docker  │     │ kubectl │     │  curl   │     │ pytest  │
│  build  │     │  apply  │     │ /health │     │ tests/  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐                                              │
│  │ Code Quality  │ ──────────────────────────────┐              │
│  │ (flake8,black)│                               │              │
│  └───────────────┘                               │              │
│         │                                        ▼              │
│         ▼                              ┌───────────────┐        │
│  ┌───────────────┐                     │ Build Status  │        │
│  │  Unit Tests   │ ───────────────────▶│    Check      │        │
│  │  (pytest)     │                     └───────────────┘        │
│  └───────────────┘                               ▲              │
│         │                                        │              │
│         ▼                                        │              │
│  ┌───────────────┐                               │              │
│  │  Integration  │ ──────────────────────────────┘              │
│  │   (Kind K8S)  │ [manual trigger only]                        │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
k8s-auto-testing-platform/
├── app/                          # FastAPI Application
│   ├── main.py                  # Application code
│   ├── Dockerfile               # Container build
│   └── requirements.txt         # App dependencies
│
├── k8s-manifests/               # Kubernetes Configurations
│   ├── namespace.yaml           # Namespace definition
│   ├── configmap.yaml           # Environment config
│   ├── deployment.yaml          # Deployment spec
│   ├── service.yaml             # Service definitions
│   └── hpa.yaml                 # HPA configuration
│
├── tests/                       # Test Suite
│   ├── conftest.py             # Shared fixtures
│   ├── test_deployment.py      # Deployment tests
│   ├── test_hpa.py             # HPA tests
│   └── test_service.py         # Service tests
│
├── tools/                       # Test Utilities
│   ├── k8s_helper.py           # K8S operations
│   └── load_generator.py       # Load generation
│
├── scripts/                     # Automation
│   ├── setup-phase1.sh         # Environment setup
│   ├── run-tests.sh            # Test runner
│   └── setup-proxy.sh          # Proxy config
│
├── docs/                        # Documentation
│   ├── WBS.md                  # Work breakdown
│   ├── TEST-CASES.md           # Test catalog
│   ├── ARCHITECTURE.md         # This file
│   └── TROUBLESHOOTING-LOG.md  # Known issues
│
└── .github/workflows/           # CI/CD
    └── ci.yml                  # GitHub Actions
```

## Key Design Decisions

### 1. Why FastAPI for Test Application?
- Lightweight and fast startup
- Built-in OpenAPI documentation
- Easy to create health check endpoints
- Native async support for load simulation

### 2. Why Pytest for Testing?
- Flexible fixture system
- Rich plugin ecosystem
- Clear test organization with markers
- Built-in coverage support

### 3. Why HPA with CPU + Memory?
- Demonstrates multi-metric scaling
- Shows real-world autoscaling patterns
- Tests both scale-up and scale-down behavior

### 4. Test Isolation
- Each test is independent
- Shared fixtures manage K8S connection
- No state pollution between tests

## Performance Considerations

| Operation | Typical Duration | Notes |
|-----------|-----------------|-------|
| Pod startup | 10-30s | Includes image pull |
| HPA scale-up | 15-60s | After metric threshold |
| HPA scale-down | 300s+ | Stabilization window |
| Full test suite | ~2 min | 24 tests |
| Smoke tests | ~30s | 3 tests |

## Troubleshooting

See `docs/TROUBLESHOOTING-LOG.md` for common issues and solutions.

---

**Author**: Michael Zhou
**Version**: 1.0
**Last Updated**: 2026-03-03
