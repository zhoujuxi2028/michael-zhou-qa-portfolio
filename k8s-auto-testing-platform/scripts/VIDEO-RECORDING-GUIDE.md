# K8S Auto Testing Platform - Demo Video Recording Guide

This guide helps you create a professional demo video showcasing the K8S Auto Testing Platform.

---

## Video Specifications

| Setting | Recommended Value |
|---------|-------------------|
| Resolution | 1920x1080 (1080p) |
| Frame Rate | 30 fps |
| Audio | Clear narration, no background noise |
| Duration | 5-8 minutes |
| Format | MP4 (H.264) |

---

## Recording Tools

### macOS
- **QuickTime Player** (built-in) - Screen Recording
- **OBS Studio** (free) - Advanced features
- **ScreenFlow** (paid) - Professional editing

### Windows
- **Xbox Game Bar** (built-in) - Win+G
- **OBS Studio** (free)
- **Camtasia** (paid)

### Linux
- **OBS Studio** (free)
- **SimpleScreenRecorder** (free)

---

## Demo Script (5-8 Minutes)

### 1. Introduction (30 seconds)

**Screen**: Terminal with project directory
**Narration**:
> "Hi, I'm [Name], and today I'll demonstrate the K8S Auto Testing Platform - a Kubernetes automated testing solution I built to validate HPA auto-scaling, chaos engineering, and cluster stability."

**Commands to show**:
```bash
cd k8s-auto-testing-platform
ls -la
```

---

### 2. Project Overview (1 minute)

**Screen**: Show README.md in editor or cat
**Narration**:
> "This platform includes 37 test cases covering deployment health, HPA scaling, service connectivity, and chaos engineering. Let me show you the architecture."

**Commands**:
```bash
cat README.md | head -50
tree -L 2 --dirsfirst
```

---

### 3. K8S Deployment (1.5 minutes)

**Screen**: Terminal with kubectl commands
**Narration**:
> "First, let's deploy our test application to Kubernetes."

**Commands**:
```bash
# Show K8S manifests
cat k8s-manifests/deployment.yaml
cat k8s-manifests/hpa.yaml

# Deploy
kubectl apply -f k8s-manifests/

# Verify deployment
kubectl get all -n k8s-testing
kubectl describe hpa test-app-hpa -n k8s-testing
```

---

### 4. Running Tests (1.5 minutes)

**Screen**: Terminal with pytest output
**Narration**:
> "Now let's run our test suite. We have deployment tests, HPA tests, service tests, and chaos engineering tests."

**Commands**:
```bash
# Run all tests
pytest tests/ -v --tb=short

# Show results
cat reports/test-report.html  # Or open in browser
```

---

### 5. HPA Stress Test Demo (2 minutes)

**Screen**: Split terminal (stress test + kubectl watch)
**Narration**:
> "This is the highlight - watching HPA respond to load in real-time."

**Terminal 1**:
```bash
# Watch pod scaling
kubectl get pods -n k8s-testing -w
```

**Terminal 2**:
```bash
# Run stress test
./scripts/hpa-stress-test.sh --duration 120 --concurrency 15
```

**Key moments to capture**:
1. Initial pod count (2)
2. CPU rising above 50%
3. HPA triggering scale-up
4. New pods becoming ready
5. Load balancing across pods

---

### 6. Chaos Engineering (1 minute)

**Screen**: Terminal with chaos test
**Narration**:
> "Finally, let's demonstrate chaos engineering - testing system resilience by randomly killing pods."

**Commands**:
```bash
# Show chaos test
pytest tests/test_chaos.py -v -k "pod_deletion"

# Or manual chaos
kubectl delete pod -n k8s-testing -l app=test-app --wait=false
kubectl get pods -n k8s-testing -w
```

---

### 7. Closing (30 seconds)

**Screen**: Project metrics summary
**Narration**:
> "To summarize: 37 test cases, 92% pass rate, 12 chaos scenarios, and proven HPA auto-scaling. Thank you for watching!"

**Show**:
- Test report summary
- GitHub repository link

---

## Recording Tips

### Before Recording

1. **Clean terminal**: Clear history, use clean prompt
2. **Set font size**: 16-18pt for readability
3. **Close notifications**: DND mode
4. **Prepare commands**: Have them ready in a notes file
5. **Test audio**: Do a quick recording test

### During Recording

1. **Speak clearly**: Slow, deliberate narration
2. **Pause at key moments**: Let viewers read important output
3. **Highlight with cursor**: Circle important areas
4. **Handle errors gracefully**: They can show real-world scenarios

### After Recording

1. **Trim dead time**: Remove long waits
2. **Add captions**: For key commands
3. **Add intro/outro**: Professional polish
4. **Export at high quality**: 1080p minimum

---

## Quick Recording Commands

### Start Clean
```bash
clear
export PS1='\[\e[32m\]k8s-demo\[\e[0m\]:\[\e[34m\]\W\[\e[0m\]\$ '
```

### Quick Demo Flow
```bash
# 1. Deploy
kubectl apply -f k8s-manifests/ && kubectl get pods -n k8s-testing

# 2. Tests
pytest tests/ -v --tb=line | head -50

# 3. HPA Demo
./scripts/hpa-stress-test.sh --duration 60 --concurrency 10

# 4. Cleanup
kubectl delete -f k8s-manifests/
```

---

## Video Upload Checklist

- [ ] Title: "K8S Auto Testing Platform Demo - HPA & Chaos Engineering"
- [ ] Description with timestamps
- [ ] Tags: kubernetes, testing, hpa, chaos-engineering, devops
- [ ] Thumbnail: Terminal screenshot with metrics
- [ ] Privacy: Unlisted or Public
- [ ] Add to portfolio playlist

---

## Sample Video Description

```
K8S Auto Testing Platform - Demo Video

A Kubernetes automated testing platform demonstrating:
- HPA (Horizontal Pod Autoscaler) validation
- Chaos engineering (pod failure, network disruption)
- Comprehensive test automation with pytest

Timestamps:
0:00 - Introduction
0:30 - Project Overview
1:30 - K8S Deployment
3:00 - Running Tests
4:30 - HPA Stress Test Demo
6:30 - Chaos Engineering
7:30 - Summary

Technologies: Python, Kubernetes, pytest, FastAPI, Prometheus

GitHub: [Your Repository URL]
```

---

**Note**: Recording a demo video is optional. The platform is fully functional and interview-ready without a video recording.
