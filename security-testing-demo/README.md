# Security Testing Demo

> Automated security testing demonstration using OWASP ZAP for Dynamic Application Security Testing (DAST)

[English](#overview) | [中文](#项目概述)

## Overview

This project demonstrates professional security testing automation capabilities, including:
- **OWASP ZAP Integration**: Automated vulnerability scanning (baseline, full, API scans)
- **Security Test Cases**: 59 Pytest tests covering OWASP Top 10 vulnerabilities
- **Multiple Target Apps**: DVWA (PHP/MySQL) and Juice Shop (Node.js/Angular)
- **CI/CD Integration**: GitHub Actions for continuous security testing
- **Docker Environment**: Complete testing environment with ZAP and vulnerable targets

## Project Phases

| Phase | Content | Tools | Status |
|-------|---------|-------|--------|
| 1 | DVWA Security Tests | Pytest | ✅ 25 tests |
| 2 | ZAP Automation | OWASP ZAP | ✅ 13 tests |
| 3 | Burp Suite Learning | Burp Suite CE | ✅ Guide |
| 4 | Juice Shop Tests | Pytest + ZAP | 21 tests |
| 5 | Nessus Learning | Nessus Essentials | Notes |

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

### Juice Shop Tests (21 tests)

| Category | Tests | OWASP Top 10 |
|----------|-------|--------------|
| API Security | 5 | A01:2021 - Broken Access Control |
| JWT Authentication | 6 | A07:2021 - Identification Failures |
| NoSQL Injection | 5 | A03:2021 - Injection |
| Business Logic | 5 | A04:2021 - Insecure Design |

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

## Project Structure

```
security-testing-demo/
├── zap/                          # OWASP ZAP automation
│   ├── zap-baseline.py           # Baseline scan (2-5 min)
│   ├── zap-full-scan.py          # Full scan (15-30 min)
│   └── zap-api-scan.py           # API security scan
├── tests/                        # Pytest security tests (59 tests)
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
- **安全测试用例**: 59 个 Pytest 测试，覆盖 OWASP Top 10 漏洞
- **多目标应用**: DVWA (PHP/MySQL) 和 Juice Shop (Node.js/Angular)
- **CI/CD 集成**: GitHub Actions 持续安全测试
- **Docker 环境**: 完整的测试环境，包含 ZAP 和靶机

### 项目阶段

| 阶段 | 内容 | 工具 | 状态 |
|------|------|------|------|
| 1 | DVWA 安全测试 | Pytest | ✅ 25 tests |
| 2 | ZAP 自动化 | OWASP ZAP | ✅ 13 tests |
| 3 | Burp Suite 学习 | Burp Suite CE | ✅ 指南 |
| 4 | Juice Shop 测试 | Pytest + ZAP | 21 tests |
| 5 | Nessus 学习 | Nessus Essentials | 笔记 |

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
