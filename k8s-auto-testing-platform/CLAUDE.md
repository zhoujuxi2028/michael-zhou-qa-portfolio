# CLAUDE.md - K8S Auto Testing Platform

This file provides guidance to Claude Code when working with this project.

## Project Overview

**K8S Auto Testing Platform** - Kubernetes automated testing platform focused on:
- HPA (Horizontal Pod Autoscaler) auto-scaling testing
- Chaos engineering
- Cloud platform stability validation

| Metric | Value |
|--------|-------|
| Test Cases | 37 |
| Pass Rate | 92% |
| Chaos Scenarios | 12 |
| Chaos Mesh | Supported |

## Project Structure

```
k8s-auto-testing-platform/
├── app/                    # FastAPI test application
├── k8s-manifests/          # Kubernetes configuration files
├── chaos-mesh/             # Chaos Mesh CRD configurations
├── tests/                  # Pytest test suite (37 test cases)
├── tools/                  # Testing utilities (chaos_tester, load_generator)
├── scripts/                # Automation scripts
├── monitoring/             # Prometheus + Grafana setup
├── reports/                # Test reports and coverage
└── docs/                   # Documentation
```

## Key Commands

```bash
# Setup environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Deploy to K8S
kubectl apply -f k8s-manifests/

# Run all tests
pytest tests/ -v

# Run with report
pytest tests/ -v --html=reports/test-report.html

# Run HPA stress test
./scripts/hpa-stress-test.sh --duration 120 --concurrency 15

# Run specific test categories
pytest tests/test_deployment.py -v
pytest tests/test_hpa.py -v
pytest tests/test_chaos.py -v -m chaos
```

## Critical: Proxy Bypass

**IMPORTANT**: This project requires proxy bypass for K8S connections.

Always set before running kubectl or tests:
```bash
export no_proxy=localhost,127.0.0.1,kubernetes.docker.internal,10.0.0.0/8
export NO_PROXY=$no_proxy
```

Or add to `~/.zshrc`:
```bash
export no_proxy="localhost,127.0.0.1,kubernetes.docker.internal,.local"
```

## Troubleshooting Reference

**IMPORTANT**: Always check `docs/TROUBLESHOOTING-LOG.md` for known issues and solutions.

### Common Issues Quick Reference

| Issue | Solution |
|-------|----------|
| kubectl connection fails (EOF) | Set `no_proxy` environment variable |
| Docker build fails | Use `--network=host` or remove gcc dependencies |
| Namespace not found | Re-run `kubectl apply -f k8s-manifests/` |
| Test timing failures | Use `wait_helper` instead of `time.sleep()` |
| HPA not scaling | Check metrics-server, increase load duration/concurrency |

### HPA Not Scaling Up

If HPA stress test shows "NO SCALE-UP DETECTED":

1. **Check metrics-server is running**:
   ```bash
   kubectl get pods -n kube-system | grep metrics-server
   ```

2. **Check current HPA status**:
   ```bash
   kubectl get hpa -n k8s-testing
   kubectl describe hpa test-app-hpa -n k8s-testing
   ```

3. **Check pod CPU usage**:
   ```bash
   kubectl top pods -n k8s-testing
   ```

4. **Increase load parameters**:
   ```bash
   ./scripts/hpa-stress-test.sh --duration 180 --concurrency 30
   ```

5. **Check if HPA is in cooldown period** (default 5 minutes after scale-down)

## Test Categories

| Category | Test IDs | Description |
|----------|----------|-------------|
| Deployment | TC-DEP-* | Deployment configuration and health |
| Service | TC-SVC-* | Service routing and endpoints |
| HPA | TC-HPA-* | Auto-scaling behavior |
| Pod Chaos | TC-CHAOS-001~008 | Pod failure and recovery |
| Network Chaos | TC-CHAOS-009~012 | Network resilience |

## CI/CD

GitHub Actions workflows:
- `ci.yml` - Full CI pipeline (tests, quality checks)
- `pr-checks.yml` - Fast PR validation

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/WBS.md` | Work Breakdown Structure (project progress) |
| `docs/TROUBLESHOOTING-LOG.md` | Known issues and solutions |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/TEST-CASES.md` | Test case catalog |
| `docs/CHAOS-ENGINEERING.md` | Chaos testing guide |
| `docs/MONITORING-GUIDE.md` | Prometheus/Grafana setup |

## Version

- Current: v1.2.0
- Status: 95% complete
