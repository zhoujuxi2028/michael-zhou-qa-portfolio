# Security Testing Demo

> Automated security testing demonstration using OWASP ZAP for Dynamic Application Security Testing (DAST)

[English](#overview) | [中文](#项目概述)

## Overview

This project demonstrates professional security testing automation capabilities, including:
- **OWASP ZAP Integration**: Automated vulnerability scanning (baseline, full, API scans)
- **Security Test Cases**: 15+ Pytest tests covering OWASP Top 10 vulnerabilities
- **CI/CD Integration**: GitHub Actions for continuous security testing
- **Docker Environment**: Complete testing environment with ZAP and vulnerable targets

### 30-Second Pitch

"I built a security testing automation platform using OWASP ZAP that performs baseline scans in 2-5 minutes, integrates with CI/CD pipelines for continuous security assessment, and includes 15+ automated test cases covering OWASP Top 10 vulnerabilities. The project demonstrates DAST capabilities essential for identifying XSS, SQL injection, CSRF, and authentication flaws in web applications."

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

| Category | Tests | OWASP Top 10 |
|----------|-------|--------------|
| XSS | 4 | A03:2021 - Injection |
| SQL Injection | 4 | A03:2021 - Injection |
| CSRF | 2 | A01:2021 - Broken Access Control |
| Authentication | 3 | A07:2021 - Identification Failures |
| Security Headers | 3 | A05:2021 - Security Misconfiguration |

### Test Execution

```bash
# Run all tests
pytest tests/ -v

# Run specific category
pytest tests/test_xss.py -v
pytest tests/test_sqli.py -v

# Run with report
pytest tests/ -v --html=reports/test-report.html
```

## Project Structure

```
security-testing-demo/
├── zap/                    # OWASP ZAP automation
│   ├── zap-baseline.py     # Baseline scan (2-5 min)
│   ├── zap-full-scan.py    # Full scan (15-30 min)
│   └── zap-api-scan.py     # API security scan
├── tests/                  # Pytest security tests
│   ├── test_xss.py         # XSS vulnerability tests
│   ├── test_sqli.py        # SQL injection tests
│   ├── test_csrf.py        # CSRF tests
│   ├── test_auth.py        # Authentication tests
│   └── test_headers.py     # Security headers tests
├── utils/                  # Helper utilities
├── docker/                 # Docker environment
├── reports/                # Scan reports
└── docs/                   # Documentation
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
- **安全测试用例**: 15+ Pytest 测试，覆盖 OWASP Top 10 漏洞
- **CI/CD 集成**: GitHub Actions 持续安全测试
- **Docker 环境**: 完整的测试环境，包含 ZAP 和靶机

### 面试亮点

1. **DAST 自动化**: 展示动态应用安全测试的自动化实现
2. **OWASP Top 10**: 覆盖主要 Web 安全漏洞类型
3. **CI/CD 集成**: 安全测试左移，在开发阶段发现问题
4. **可演示**: 面试时可实际演示扫描过程和结果

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
