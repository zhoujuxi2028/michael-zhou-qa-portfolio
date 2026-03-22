# Security Testing Demo Architecture

## Overview

This project demonstrates a professional security testing automation framework using OWASP ZAP for Dynamic Application Security Testing (DAST).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Testing Demo                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  ZAP Scripts │    │  Pytest      │    │  GitHub      │  │
│  │              │    │  Tests       │    │  Actions     │  │
│  │  - baseline  │    │              │    │              │  │
│  │  - full      │    │  - XSS       │    │  - CI/CD     │  │
│  │  - api       │    │  - SQLi      │    │  - Scheduled │  │
│  └──────┬───────┘    │  - CSRF      │    │  - On-demand │  │
│         │            │  - Auth      │    └──────────────┘  │
│         │            │  - Headers   │                       │
│         │            └──────┬───────┘                       │
│         │                   │                                │
│         ▼                   ▼                                │
│  ┌─────────────────────────────────────────┐                │
│  │           Utils / Helpers               │                │
│  │  ┌─────────────┐  ┌─────────────────┐  │                │
│  │  │ ZAP Helper  │  │ Report Generator│  │                │
│  │  └─────────────┘  └─────────────────┘  │                │
│  │  ┌─────────────────────────────────┐   │                │
│  │  │ Vulnerability Parser            │   │                │
│  │  └─────────────────────────────────┘   │                │
│  └─────────────────────────────────────────┘                │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Environment                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  OWASP ZAP   │  │    DVWA      │  │  Juice Shop  │      │
│  │  (Scanner)   │  │   (Target)   │  │   (Target)   │      │
│  │  :8090       │  │   :80        │  │   :3000      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. ZAP Automation Scripts

Python scripts that automate OWASP ZAP scanning:

| Script | Purpose | Duration |
|--------|---------|----------|
| `zap-baseline.py` | Quick passive scan | 2-5 min |
| `zap-full-scan.py` | Comprehensive active scan | 15-30 min |
| `zap-api-scan.py` | API-focused scanning | 5-10 min |

### 2. Pytest Security Tests

Manual security test cases organized by vulnerability type:

```
tests/
├── conftest.py          # Shared fixtures
├── test_xss.py          # XSS vulnerability tests
├── test_sqli.py         # SQL injection tests
├── test_csrf.py         # CSRF tests
├── test_auth.py         # Authentication tests
└── test_headers.py      # Security headers tests
```

### 3. Utility Modules

| Module | Purpose |
|--------|---------|
| `zap_helper.py` | ZAP API wrapper |
| `report_generator.py` | Report generation |
| `vulnerability_parser.py` | Alert categorization |

### 4. Docker Environment

```yaml
services:
  zap:        # OWASP ZAP daemon on :8090
  dvwa:       # Vulnerable web app on :80
  juice-shop: # Modern vulnerable app on :3000
```

## Data Flow

### Scan Workflow

```
1. Start Environment
   └── docker compose up -d
       ├── ZAP starts in daemon mode
       ├── DVWA starts
       └── Juice Shop starts

2. Execute Scan
   └── python zap/zap-baseline.py --target http://localhost
       ├── Spider target URL
       ├── Passive scan analysis
       └── Generate alerts

3. Generate Report
   └── Reports saved to /reports
       ├── HTML report
       ├── JSON report
       └── XML report
```

### CI/CD Workflow

```
1. Trigger
   ├── Push to main
   ├── Pull request
   ├── Weekly schedule
   └── Manual dispatch

2. Jobs
   ├── security-tests     # Run Pytest tests
   ├── zap-baseline-scan  # ZAP baseline scan
   └── dependency-scan    # Check dependencies

3. Artifacts
   └── Upload reports to GitHub
```

## OWASP Top 10 Coverage

| ID | Vulnerability | Test File |
|----|---------------|-----------|
| A01 | Broken Access Control | test_auth.py, test_csrf.py |
| A03 | Injection | test_xss.py, test_sqli.py |
| A05 | Security Misconfiguration | test_headers.py |
| A07 | Identification Failures | test_auth.py |

## Integration Points

### With Burp Suite (Learning)

While this project uses ZAP for automation:
- Concepts learned from Burp Suite apply
- ZAP provides similar functionality
- Both tools follow same testing methodologies

### With CI/CD Pipeline

```yaml
# Integration example
- name: OWASP ZAP Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: '${{ env.TARGET_URL }}'
```

## Security Considerations

1. **Authorized Testing Only**: Only scan systems you own or have permission to test
2. **Isolated Environment**: Use Docker containers to isolate vulnerable targets
3. **No Production Scanning**: Don't run active scans against production systems
4. **Credential Management**: Use environment variables for sensitive data
