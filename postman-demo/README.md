# 🚀 Postman API Test Automation - Expert Level

**Project**: API Test Automation using Postman & Newman
**Version**: 1.0.0
**Created**: 2026-02-21
**Updated**: 2026-02-25
**Author**: Michael Zhou

---

## ⭐ NEW: E-Commerce API Test Suite (Expert-Level Framework)

**Latest Collection:** `E-Commerce-API-Test-Suite.postman_collection.json`

This expert-level test suite demonstrates advanced API testing capabilities:

### 🎯 Key Features

- **Custom Validation Library** - 15+ validation functions (order totals, Luhn algorithm, email, business rules)
- **Test Data Factory** - Dynamic test data generation (users, products, orders)
- **Advanced Error Handling** - Exponential backoff retry, circuit breaker pattern, rate limiting
- **Business Scenario** - Complete E-commerce order management system
- **280+ Assertions** - Comprehensive validation at multiple levels
- **Production-Ready** - Enterprise-grade test framework

### 📚 Quick Start

```bash
# Navigate to project
cd postman-demo

# Run expert-level test suite
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/dev.postman_environment.json \
  -r html,cli \
  --reporter-html-export reports/expert-test-report.html
```

### 📖 Expert Documentation

- **[ADVANCED-FEATURES.md](docs/ADVANCED-FEATURES.md)** - Complete framework API reference
- **[TEST-DATA-STRATEGY.md](docs/TEST-DATA-STRATEGY.md)** - Data management approach
- **[API-TESTING-GUIDE.md](docs/API-TESTING-GUIDE.md)** - API testing fundamentals

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Running Tests](#-running-tests)
- [Collections](#-collections)
- [Environments](#-environments)
- [Documentation](#-documentation)

---

## 🎯 Overview

This project demonstrates professional API testing skills using Postman and Newman CLI. It includes:

- ✅ RESTful API test collections
- ✅ Environment configuration management
- ✅ Automated test execution via Newman
- ✅ CI/CD integration ready
- ✅ Comprehensive test documentation
- ✅ Test data management
- ✅ Pre-request scripts and test scripts
- ✅ HTML reporting with newman-reporter-html

---

## 📁 Project Structure

```
postman-demo/
├── collections/              # Postman collection files (.json)
│   └── E-Commerce-API-Test-Suite.postman_collection.json
├── environments/            # Environment configuration files
│   ├── dev.postman_environment.json
│   ├── staging.postman_environment.json
│   └── prod.postman_environment.json
├── docs/                    # Documentation
│   ├── API-TESTING-GUIDE.md
│   ├── TEST-CASES.md
│   └── TROUBLESHOOTING.md
├── scripts/                 # Test execution scripts
│   ├── run-tests.sh        # Run all tests
│   ├── run-smoke-tests.sh  # Run smoke tests only
│   └── generate-report.sh  # Generate HTML report
├── reports/                 # Test execution reports (auto-generated)
│   ├── newman-report.html
│   └── newman-report.json
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## 🚀 Getting Started

### Prerequisites

1. **Postman Desktop** (for collection development)
   - Download: https://www.postman.com/downloads/

2. **Node.js & npm** (for Newman CLI)
   - Node.js 14+ required
   - Install: https://nodejs.org/

3. **Newman** (Postman CLI)
   ```bash
   npm install -g newman
   npm install -g newman-reporter-html
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
   cd michael-zhou-qa-portfolio/postman-demo
   ```

2. Verify Newman installation:
   ```bash
   newman --version
   ```

---

## 🏃 Running Tests

### Using Newman CLI

#### Run all tests (dev environment):
```bash
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/dev.postman_environment.json \
  -r html,cli \
  --reporter-html-export reports/newman-report.html
```

#### Run specific folder:
```bash
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/dev.postman_environment.json \
  --folder "User Management"
```

#### Run with different environments:
```bash
# Development
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/dev.postman_environment.json

# Staging
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/staging.postman_environment.json

# Production (read-only tests)
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/prod.postman_environment.json
```

#### Run with iterations (data-driven testing):
```bash
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/dev.postman_environment.json \
  -d test-data.json \
  -n 5
```

### Using Shell Scripts

```bash
# Run all tests
./scripts/run-tests.sh

# Run smoke tests only
./scripts/run-smoke-tests.sh

# Generate HTML report
./scripts/generate-report.sh
```

### Using Postman Desktop

1. Open Postman
2. Import collection: `File → Import → collections/E-Commerce-API-Test-Suite.postman_collection.json`
3. Import environment: `File → Import → environments/dev.postman_environment.json`
4. Select environment in top-right dropdown
5. Click "Run Collection" button
6. Configure and execute

---

## 📦 Collections

Collections are organized by feature/module:

### Current Collections

- **API-Test-Collection** (Coming soon)
  - User Management API
  - Authentication & Authorization
  - Product CRUD Operations
  - Search & Filtering
  - Error Handling

---

## 🌍 Environments

Environment variables for different testing stages:

### Dev Environment (`dev.postman_environment.json`)
- **Base URL**: http://localhost:3000
- **Purpose**: Local development testing
- **Data**: Test/mock data

### Staging Environment (`staging.postman_environment.json`)
- **Base URL**: https://staging.example.com
- **Purpose**: Pre-production testing
- **Data**: Staging data

### Production Environment (`prod.postman_environment.json`)
- **Base URL**: https://api.example.com
- **Purpose**: Read-only smoke tests
- **Data**: Production data (read-only operations)

---

## 📚 Documentation

Detailed documentation available in `docs/`:

- **API-TESTING-GUIDE.md** - Comprehensive API testing guide
- **TEST-CASES.md** - Detailed test case documentation
- **TROUBLESHOOTING.md** - Common issues and solutions

---

## 🧪 Test Features

### Pre-request Scripts
- Set authentication tokens
- Generate dynamic data
- Environment setup

### Test Scripts
- Status code validation
- Response time verification
- JSON schema validation
- Response body assertions
- Negative testing

### Test Organization
- Folders for logical grouping
- Request chaining (using previous response data)
- Environment variable usage
- Data-driven testing

---

## 📊 Test Reports

Newman generates reports in multiple formats:

### HTML Report
- **Location**: `reports/newman-report.html`
- **Features**: Visual dashboard, request/response details, assertions
- **Usage**: Open in browser for detailed view

### JSON Report
- **Location**: `reports/newman-report.json`
- **Features**: Machine-readable, CI/CD integration
- **Usage**: Parse for automated reporting

### CLI Report
- **Location**: Console output
- **Features**: Real-time test execution feedback
- **Usage**: Quick verification during development

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Newman
        run: |
          npm install -g newman
          npm install -g newman-reporter-html

      - name: Run API Tests
        run: |
          newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
            -e environments/dev.postman_environment.json \
            -r html,cli \
            --reporter-html-export reports/newman-report.html

      - name: Upload Test Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: newman-report
          path: reports/newman-report.html
```

---

## 🎓 Best Practices

### Collection Organization
- ✅ Group related requests in folders
- ✅ Use meaningful request names
- ✅ Add descriptions to requests
- ✅ Use environment variables for URLs and tokens

### Test Writing
- ✅ Test positive and negative scenarios
- ✅ Validate status codes
- ✅ Check response times
- ✅ Validate JSON schemas
- ✅ Test error messages

### Data Management
- ✅ Use environment variables for configuration
- ✅ Use collection variables for test data
- ✅ Use CSV/JSON files for data-driven testing
- ✅ Never commit sensitive data (API keys, passwords)

### Maintenance
- ✅ Keep collections in version control
- ✅ Document test cases
- ✅ Review and update tests regularly
- ✅ Use meaningful assertions

---

## 📈 Test Metrics

Track these metrics for test effectiveness:

- **Test Coverage**: % of API endpoints tested
- **Pass Rate**: % of tests passing
- **Response Time**: API performance metrics
- **Failure Rate**: Identify flaky tests
- **Execution Time**: Test suite duration

---

## 🔧 Troubleshooting

### Common Issues

**Newman not found**:
```bash
npm install -g newman
```

**Permission errors**:
```bash
sudo npm install -g newman
```

**Environment variables not loading**:
- Verify environment file path
- Check JSON syntax
- Ensure environment is selected in Postman

**SSL certificate errors**:
```bash
newman run collection.json --insecure
```

For more details, see `docs/TROUBLESHOOTING.md`

---

## 📞 Support

For questions or issues:
- **Email**: zhou_juxi@hotmail.com
- **GitHub Issues**: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🏆 Skills Demonstrated

This project showcases:
- ✅ RESTful API testing
- ✅ Postman collection development
- ✅ Newman CLI automation
- ✅ Environment management
- ✅ Test scripting (JavaScript)
- ✅ CI/CD integration
- ✅ Test documentation
- ✅ Report generation

---

**Built with ❤️ by Michael Zhou**

