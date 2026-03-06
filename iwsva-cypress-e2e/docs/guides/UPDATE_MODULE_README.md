# IWSVA Update Module - Testing Documentation

**Project**: GUI-mz/cypress-tests
**Module**: IWSVA Update
**Version**: 1.0.0
**Last Updated**: 2025-01-22

---

## Overview

This document provides a comprehensive overview of the IWSVA Update module testing framework, including test architecture, execution, and documentation.

### Quick Stats

| Metric | Value |
|--------|-------|
| **Total Test Cases** | 77 |
| **Automation Coverage** | 100% |
| **Components Covered** | 12 (9 patterns + 3 engines) |
| **Test Categories** | 11 |
| **Priority Levels** | P0: 10, P1: 40, P2: 25, P3: 2 |
| **Framework** | Cypress v15.9.0 |

---

## What is IWSVA Update Module?

The IWSVA (InterScan Web Security Virtual Appliance) Update module manages security component updates including:

**Patterns (9 components):**
- PTN (Virus Pattern)
- SPYWARE (Spyware Pattern)
- BOT (Bot Pattern)
- ITP (IntelliTrap Pattern)
- ITE (IntelliTrap Exception)
- SPAM (Spam Pattern)
- ICRCAGENT (Smart Scan Agent)
- TMSA (Smart Analysis)
- DPIPTN (DPI Pattern)

**Engines (3 components):**
- ENG (Virus Scan Engine)
- ATSEENG (ATSE Scan Engine)
- TMUFEENG (URL Filtering Engine)

**Key Operations:**
- **Normal Update**: Download and install latest version
- **Forced Update**: Re-download and install current version
- **Rollback**: Restore previous version from backup
- **Update All**: Batch update all components
- **Scheduled Update**: Automatic updates on schedule

---

## Documentation Structure

```
GUI-mz/cypress-tests/
├── UPDATE_MODULE_README.md          # This file - Overview
├── TEST_CASES_README.md             # Quick guide to test cases
├── docs/
│   ├── test-cases/
│   │   ├── README.md                        # Test case documentation index
│   │   ├── UPDATE_TEST_CASES.md             # Detailed test cases (main doc)
│   │   ├── UPDATE_TEST_CASES.xlsx           # Excel version for stakeholders
│   │   ├── test-case-mapping.json           # Machine-readable mapping
│   │   ├── traceability-matrix.md           # Requirements traceability
│   │   ├── test-data-dictionary.md          # Test data definitions
│   │   └── verification-checklist.md        # Multi-level verification
│   └── test-plans/
│       ├── README.md                        # Test plans index
│       ├── IWSVA-Update-Test-Plan.md        # Complete test plan
│       └── Test-Strategy.md                 # High-level strategy
├── cypress/
│   ├── e2e/
│   │   └── iwsva-update/
│   │       ├── 01-normal-update/            # Normal update tests
│   │       ├── 02-forced-update/            # Forced update tests
│   │       ├── 03-rollback/                 # Rollback tests
│   │       ├── 04-update-all/               # Update All tests
│   │       ├── 05-ui-interaction/           # UI tests
│   │       ├── 06-error-handling/           # Error tests
│   │       ├── 07-schedule/                 # Schedule tests
│   │       ├── 08-proxy/                    # Proxy tests
│   │       ├── 09-logging/                  # Logging tests
│   │       ├── 10-performance/              # Performance tests
│   │       └── 11-business/                 # Business continuity tests
│   ├── support/
│   │   ├── pages/                           # Page Object Models
│   │   ├── actions/                         # App Actions
│   │   ├── workflows/                       # Reusable Workflows
│   │   ├── verification/                    # Verification Helpers
│   │   ├── factories/                       # Factory classes
│   │   ├── setup/                           # Setup utilities
│   │   ├── commands.js                      # Custom Commands
│   │   └── e2e.js                          # Global configuration
│   └── fixtures/
│       ├── ComponentRegistry.js             # Component metadata
│       ├── test-scenarios.json              # Test scenario definitions
│       └── component-test-versions.json     # Version test data
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- Access to IWSVA test environment
- Admin credentials configured

### Installation

```bash
# Clone the repository
cd /Users/michael_zhou/Documents/GitHub/GUI-mz/cypress-tests

# Install dependencies
npm install

# Configure environment
cp cypress.env.example.json cypress.env.json
# Edit cypress.env.json with your credentials
```

### Quick Start

```bash
# Run all update tests
npm run test:update

# Run smoke tests (P0 only)
npm run test:p0

# Run specific category
npm run test:update:normal       # Normal update tests
npm run test:update:forced       # Forced update tests
npm run test:update:rollback     # Rollback tests

# Open Cypress Test Runner (interactive)
npx cypress open
```

---

## Test Architecture

### Design Patterns

**1. Page Object Model (POM)**
```javascript
// pages/ManualUpdatePage.js
class ManualUpdatePage {
  selectComponent(component) { /* ... */ }
  clickUpdate() { /* ... */ }
  verifyVersion(version) { /* ... */ }
}
```

**2. App Actions Pattern**
```javascript
// actions/UpdateActions.js
class UpdateActions {
  performUpdate(component) { /* ... */ }
  performRollback(component) { /* ... */ }
}
```

**3. Factory Pattern**
```javascript
// factories/ComponentFactory.js
class ComponentFactory {
  static create(componentId) {
    const metadata = ComponentRegistry.get(componentId)
    return new ComponentHandler(componentId, metadata)
  }
}
```

**4. Data-Driven Testing**
```javascript
// Test multiple components with same logic
components.forEach(component => {
  it(`should update ${component.name}`, () => {
    updateWorkflow.execute(component)
  })
})
```

### Verification Levels

**Level 1: UI Verification**
- Version numbers displayed correctly
- Status messages accurate
- Button states correct

**Level 2: Backend Verification**
- INI file updated (`/opt/trend/iwsva/intscan.ini`)
- Pattern files exist
- Lock files managed properly

**Level 3: Log Verification**
- Update logs recorded (`/var/log/trend/iwsva/update.log`)
- Audit trails created
- No error entries for successful updates

**Level 4: Business Function Verification**
- Virus scanning works post-update
- URL filtering functional
- No service interruption

---

## Test Execution

### By Priority

```bash
# P0 - Critical tests (smoke test)
npm run test:p0                  # ~30 minutes

# P0 + P1 - Core functionality
npm run test:p1                  # ~2 hours

# Full regression
npm run test:update              # ~3-4 hours
```

### By Category

```bash
npm run test:update:normal       # Normal update flow
npm run test:update:forced       # Forced updates
npm run test:update:rollback     # Rollback operations
npm run test:update:all          # Update All functionality
npm run test:update:ui           # UI interaction tests
npm run test:update:errors       # Error handling
npm run test:update:schedule     # Scheduled updates
npm run test:update:proxy        # Proxy configuration
npm run test:update:logging      # Logging verification
npm run test:update:performance  # Performance tests
npm run test:update:business     # Business continuity
```

### By Component

```bash
# Test specific component
npx cypress run --spec "cypress/e2e/iwsva-update/**/*PTN*"
npx cypress run --spec "cypress/e2e/iwsva-update/**/*ENG*"
```

---

## Test Reports

### Report Locations

```bash
# HTML Reports
open reports/html/index.html

# JSON Results
cat reports/test-results/*.json

# Screenshots (on failure)
ls reports/screenshots/

# Videos (if enabled)
ls cypress/videos/
```

### Report Contents

- **Pass/Fail Summary**: Overall test results
- **Execution Time**: Duration for each test
- **Screenshots**: Captured on failure
- **Test Logs**: Detailed execution logs
- **Coverage Metrics**: Test coverage statistics

---

## Key Test Cases

### Critical (P0) Test Cases

| ID | Title | Duration |
|----|-------|----------|
| TC-UPDATE-001 | Virus Pattern Normal Update | ~10 min |
| TC-UPDATE-100 | Scan Engine Update | ~12 min |
| TC-ROLLBACK-001 | Rollback Virus Pattern | ~5 min |
| TC-UPDATEALL-001 | Update All Components | ~30 min |
| TC-UI-001 | Page Display Verification | <1 min |
| TC-ERROR-001 | Network Error Handling | <1 min |
| TC-BUSINESS-001-003 | Business Continuity | ~15 min |

**Total P0 Execution Time**: ~30 minutes

### Test Case Categories

1. **Normal Update** (7 cases) - Standard update workflows
2. **Forced Update** (5 cases) - Re-download and reinstall
3. **Rollback** (8 cases) - Version restoration
4. **Update All** (5 cases) - Batch operations
5. **UI Interaction** (8 cases) - User interface validation
6. **Error Handling** (12 cases) - Failure scenarios
7. **Schedule** (5 cases) - Automated updates
8. **Proxy** (4 cases) - Proxy configuration
9. **Logging** (3 cases) - Audit trails
10. **Performance** (2 cases) - Speed and resource usage
11. **Business Continuity** (18 cases) - Service availability

---

## Development Workflow

### Adding New Test Cases

1. **Design Test Case**: Document in `docs/test-cases/UPDATE_TEST_CASES.md`
2. **Add Mapping**: Update `test-case-mapping.json`
3. **Implement Test**: Create spec file in appropriate category folder
4. **Use Framework**: Leverage Page Objects, Workflows, and Factories
5. **Run Test**: Execute and verify
6. **Code Review**: Submit PR for review
7. **Update Documentation**: Keep docs in sync with code

### Extending for New Components

1. **Add Component Metadata**: Update `ComponentRegistry.js`
```javascript
{
  id: 'NEWCOMPONENT',
  name: 'New Component Name',
  category: 'pattern', // or 'engine'
  iniSection: 'Pattern-Update',
  iniKey: 'newcomponent_ver',
  lockFile: '.newcomponentupdate',
  // ... other metadata
}
```

2. **Add Test Versions**: Update `component-test-versions.json`
3. **Run Data-Driven Tests**: Existing tests will automatically cover new component
4. **Add Specific Tests**: If component has unique behavior, add dedicated test cases

---

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Frame not found"
**Solution**: Check frame navigation in `ManualUpdatePage.js`, ensure frame IDs match JSP

**Issue**: Update timeout
**Solution**: Increase timeout in test, check network connectivity, verify update server accessible

**Issue**: Version verification fails
**Solution**: Check INI file path, ensure SSH access configured, verify parsing logic

**Issue**: Lock file not cleaned up
**Solution**: Run cleanup script, check test teardown hooks, investigate interrupted tests

### Debug Mode

```bash
# Run with debug logging
DEBUG=cypress:* npx cypress run

# Open DevTools in Test Runner
npx cypress open --config video=false
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/cypress-tests.yml
name: Cypress Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:p0  # Run smoke tests
```

### Quality Gates

**Pull Request Approval:**
- All P0 tests pass
- No ESLint errors
- Code review approved

**Release Approval:**
- Full regression ≥95% pass rate
- No critical defects
- Stakeholder sign-off

---

## Resources

### Documentation

- [Test Cases (Detailed)](docs/test-cases/UPDATE_TEST_CASES.md)
- [Test Plan](docs/test-plans/IWSVA-Update-Test-Plan.md)
- [Test Strategy](docs/test-plans/Test-Strategy.md)
- [Test Data Dictionary](docs/test-cases/test-data-dictionary.md)
- [Traceability Matrix](docs/test-cases/traceability-matrix.md)

### External Links

- [Cypress Documentation](https://docs.cypress.io)
- [JavaScript Best Practices](https://github.com/ryanmcdermott/clean-code-javascript)
- [Page Object Model Pattern](https://martinfowler.com/bliki/PageObject.html)

### Support

- **QA Lead**: [Name/Email]
- **Automation Engineer**: [Name/Email]
- **Development Team**: [Team Contact]

---

## Contributing

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run `npm run lint` and fix any errors
4. Run relevant test suites
5. Update documentation if needed
6. Submit PR with clear description
7. Address review comments
8. Merge after approval

### Coding Standards

- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Write descriptive commit messages

---

## Changelog

### Version 1.0.0 (2025-01-22)

**Initial Release:**
- ✅ 77 test cases implemented (100% automation)
- ✅ Test framework with POM, App Actions, Factories
- ✅ Data-driven testing for 13 components
- ✅ Multi-level verification (UI, Backend, Logs, Business)
- ✅ Complete documentation (test cases, plans, strategy)
- ✅ CI/CD integration ready
- ✅ Excel export for stakeholders

---

## License

This test automation framework is proprietary to the project and not open source.

---

## Acknowledgments

- Cypress team for excellent E2E testing framework
- IWSVA development team for domain knowledge and support
- QA team for test case design and implementation

---

**Document Status**: ✅ Active
**For Questions**: Contact QA Lead or Automation Engineer
