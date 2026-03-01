# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-01

### Added
- Enterprise-grade Postman API Test Automation Framework
- 60+ API test requests across 8 categories:
  - User Management (8 requests)
  - Product Management
  - Cart Management
  - Order Management
  - Coupon Management
  - Payment
  - Negative Tests
  - Enhanced Testing (Data-Driven & Correlation)
- Newman CLI integration for CI/CD
- Environment configurations (dev, staging, prod)
- Pre-commit hooks (Husky + lint-staged)
- Commit message validation (commitlint)
- Collection and environment validators
- Test data files (CSV)
- HTML and JSON test reports

### Features
- Data-driven testing support
- Response correlation and chaining
- Advanced assertions and error handling
- Performance timing checks
- Schema validation

### Dependencies
- newman@^6.1.0
- newman-reporter-htmlextra@^1.23.1
- husky@^9.0.0
- lint-staged@^15.2.0
- @commitlint/cli@^18.6.0

### Scripts
- `npm test` - Run all tests
- `npm run test:dev` - Run against dev environment
- `npm run test:staging` - Run against staging environment
- `npm run test:prod` - Run against prod environment
- `npm run test:smoke` - Run smoke tests
- `npm run test:ci` - Run for CI/CD with bail on failure
- `npm run validate` - Validate collection and environment
