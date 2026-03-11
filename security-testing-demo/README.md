# Security Testing Demo

> Automated security testing demonstration using OWASP ZAP for Dynamic Application Security Testing (DAST)

[English](#overview) | [中文](#项目概述)

## Overview

This project demonstrates professional security testing automation capabilities, including:
- **OWASP ZAP Integration**: Automated vulnerability scanning (baseline, full, API scans)
- **Security Test Cases**: 103 Pytest tests covering OWASP Top 10 vulnerabilities (DVWA, Juice Shop, ZAP, Nessus, OpenVAS)
- **Multiple Target Apps**: DVWA (PHP/MySQL) and Juice Shop (Node.js/Angular)
- **CI/CD Integration**: GitHub Actions for continuous security testing
- **Docker Environment**: Complete testing environment with ZAP and vulnerable targets

## Project Phases

| Phase | Content | Tools | Status |
|-------|---------|-------|--------|
| 1 | DVWA Security Tests | Pytest | ✅ 25 tests |
| 2 | ZAP Automation | OWASP ZAP | ✅ 13 tests |
| 3 | Burp Suite Learning | Burp Suite CE | ✅ Guide |
| 4 | Juice Shop Tests | Pytest + ZAP | ✅ 30 tests |
| 5 | Nessus Scanning | Nessus Essentials | ✅ 15 tests |
| 6 | OpenVAS Scanning | OpenVAS/GVM | ✅ 20 tests |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.9+
- OWASP ZAP (optional for local development)

### Setup

```bash
# Clone and navigate
cd security-testing-demo

# Start environment (ZAP + DVWA)
docker compose -f docker/docker-compose.yml up -d

# Install Python dependencies
pip install -r requirements.txt

# Wait for DVWA initialization, then run tests
pytest tests/ -v
```

### Run ZAP Scans

```bash
# Baseline scan (fast, passive)
python zap/zap-baseline.py --target http://localhost

# Full scan (comprehensive, active)
python zap/zap-full-scan.py --target http://localhost

# API scan (OpenAPI/GraphQL)
python zap/zap-api-scan.py --spec openapi.yaml
```

## Test Cases

### DVWA Tests (25 tests)

| Category | Tests | OWASP Top 10 |
|----------|-------|--------------|
| XSS | 5 | A03:2021 - Injection |
| SQL Injection | 5 | A03:2021 - Injection |
| CSRF | 4 | A01:2021 - Broken Access Control |
| Authentication | 6 | A07:2021 - Identification Failures |
| Security Headers | 5 | A05:2021 - Security Misconfiguration |

### Juice Shop Tests (30 tests)

| Category | Tests | OWASP Top 10 |
|----------|-------|--------------|
| API Security | 9 | A01:2021 - Broken Access Control |
| JWT Authentication | 6 | A07:2021 - Identification Failures |
| NoSQL Injection | 7 | A03:2021 - Injection |
| Business Logic | 8 | A04:2021 - Insecure Design |

### ZAP Integration Tests (13 tests)

| Category | Tests | Purpose |
|----------|-------|---------|
| Connection | 2 | ZAP daemon connectivity |
| Spider | 1 | URL discovery |
| Scanning | 4 | Passive/Active scan workflow |
| Alerts & Reports | 6 | Alert filtering, report generation |

### Test Execution

```bash
# Run all tests
pytest tests/ -v

# Run DVWA tests
pytest tests/test_xss.py tests/test_sqli.py tests/test_csrf.py -v

# Run Juice Shop tests
pytest tests/test_juice_shop_api.py tests/test_jwt.py tests/test_nosql_injection.py -v

# Run ZAP integration tests
pytest -m zap -v

# Run with report
pytest tests/ -v --html=reports/test-report.html
```

## Learning Guides

Step-by-step learning guides for each phase:

| Guide | Content | Level |
|-------|---------|-------|
| [Phase 1: DVWA Security Testing](docs/PHASE1-LEARNING-GUIDE.md) | XSS, SQL Injection, CSRF, Authentication, Security Headers | Beginner |
| [Phase 2: ZAP Automation](docs/PHASE2-LEARNING-GUIDE.md) | ZAP API, Spider, Scanning, CI/CD Integration | Intermediate |
| [Phase 3: Burp Suite Manual Testing](docs/PHASE3-LEARNING-GUIDE.md) | Proxy, Repeater, Intruder, Decoder | Intermediate |
| [Phase 4: Juice Shop API Testing](docs/PHASE4-LEARNING-GUIDE.md) | REST API, JWT, NoSQL Injection, Business Logic | Advanced |
| [Phase 5: Nessus Essentials](docs/PHASE5-LEARNING-GUIDE.md) | Vulnerability Scanning, CVE, CVSS, Compliance | Intermediate |
| [Phase 6: OpenVAS](docs/PHASE6-LEARNING-GUIDE.md) | Open Source Scanning, GVM Architecture, NVT | Intermediate |

## Project Structure

```
security-testing-demo/
├── zap/                          # OWASP ZAP automation
│   ├── zap-baseline.py           # Baseline scan (2-5 min)
│   ├── zap-full-scan.py          # Full scan (15-30 min)
│   └── zap-api-scan.py           # API security scan
├── tests/                        # Pytest security tests (103 tests)
│   ├── conftest.py               # Fixtures for DVWA + Juice Shop
│   ├── test_xss.py               # XSS vulnerability tests
│   ├── test_sqli.py              # SQL injection tests
│   ├── test_csrf.py              # CSRF tests
│   ├── test_auth.py              # Authentication tests
│   ├── test_headers.py           # Security headers tests
│   ├── test_zap_scan.py          # ZAP integration tests
│   ├── test_juice_shop_api.py    # Juice Shop API security
│   ├── test_jwt.py               # JWT authentication tests
│   ├── test_nosql_injection.py   # NoSQL injection tests
│   └── test_business_logic.py    # Business logic tests
├── utils/                        # Helper utilities
├── docker/                       # Docker environment
├── reports/                      # Scan reports
└── docs/                         # Documentation
    ├── PHASE1-LEARNING-GUIDE.md  # DVWA security testing guide
    ├── PHASE2-LEARNING-GUIDE.md  # ZAP automation guide
    ├── PHASE3-LEARNING-GUIDE.md  # Burp Suite guide
    ├── PHASE4-LEARNING-GUIDE.md  # Juice Shop API testing guide
    ├── PHASE5-LEARNING-GUIDE.md  # Nessus Essentials guide
    ├── PHASE6-LEARNING-GUIDE.md  # OpenVAS/GVM guide
    ├── BURP-SUITE-GUIDE.md       # Burp Suite quick reference
    └── TROUBLESHOOTING.md        # Troubleshooting guide
```

## CI/CD Integration

The project includes GitHub Actions workflow for automated security scanning:

```yaml
# Triggers
- Push to main branch
- Weekly scheduled scan (Sunday 00:00 UTC)
- Manual workflow dispatch

# Actions
- OWASP ZAP baseline scan
- Security test execution
- Report generation and artifact upload
```

## Technologies

- **Scanner**: OWASP ZAP 2.14+
- **Testing**: Python 3.9+, Pytest
- **Targets**: DVWA, Juice Shop
- **Container**: Docker Compose
- **CI/CD**: GitHub Actions

---

## 项目概述

本项目展示专业的安全测试自动化能力，包括：
- **OWASP ZAP 集成**: 自动化漏洞扫描（基线扫描、全量扫描、API 扫描）
- **安全测试用例**: 103 个 Pytest 测试，覆盖 OWASP Top 10 漏洞 (DVWA, Juice Shop, ZAP, Nessus, OpenVAS)
- **多目标应用**: DVWA (PHP/MySQL) 和 Juice Shop (Node.js/Angular)
- **CI/CD 集成**: GitHub Actions 持续安全测试
- **Docker 环境**: 完整的测试环境，包含 ZAP 和靶机

### 项目阶段

| 阶段 | 内容 | 工具 | 状态 |
|------|------|------|------|
| 1 | DVWA 安全测试 | Pytest | ✅ 25 tests |
| 2 | ZAP 自动化 | OWASP ZAP | ✅ 13 tests |
| 3 | Burp Suite 学习 | Burp Suite CE | ✅ 指南 |
| 4 | Juice Shop 测试 | Pytest + ZAP | ✅ 30 tests |
| 5 | Nessus 扫描 | Nessus Essentials | ✅ 15 tests |
| 6 | OpenVAS 扫描 | OpenVAS/GVM | ✅ 20 tests |

### 学习指南

| 指南 | 内容 | 级别 |
|------|------|------|
| [Phase 1: DVWA 安全测试](docs/PHASE1-LEARNING-GUIDE.md) | XSS、SQL 注入、CSRF、认证、安全头 | 入门 |
| [Phase 2: ZAP 自动化](docs/PHASE2-LEARNING-GUIDE.md) | ZAP API、爬虫、扫描、CI/CD 集成 | 中级 |
| [Phase 3: Burp Suite 手动测试](docs/PHASE3-LEARNING-GUIDE.md) | Proxy、Repeater、Intruder、Decoder | 中级 |
| [Phase 4: Juice Shop API 测试](docs/PHASE4-LEARNING-GUIDE.md) | REST API、JWT、NoSQL 注入、业务逻辑 | 高级 |
| [Phase 5: Nessus Essentials](docs/PHASE5-LEARNING-GUIDE.md) | 漏洞扫描、CVE、CVSS、合规检查 | 中级 |
| [Phase 6: OpenVAS](docs/PHASE6-LEARNING-GUIDE.md) | 开源扫描、GVM 架构、NVT | 中级 |

### 项目亮点

1. **DAST 自动化**: 展示动态应用安全测试的自动化实现
2. **OWASP Top 10**: 覆盖主要 Web 安全漏洞类型
3. **现代应用测试**: Juice Shop (Angular/Node.js) + 传统 DVWA (PHP)
4. **JWT/NoSQL**: 现代 Web 应用常见安全问题
5. **可演示**: 实际运行扫描并生成报告

### 快速开始

```bash
# 启动环境
docker compose -f docker/docker-compose.yml up -d

# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest tests/ -v

# 运行 ZAP 扫描
python zap/zap-baseline.py --target http://localhost
```

## License

MIT License - See [LICENSE](LICENSE) for details.
