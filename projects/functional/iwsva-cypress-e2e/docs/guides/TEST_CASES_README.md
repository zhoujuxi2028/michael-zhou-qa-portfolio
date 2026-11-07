# IWSVA Update Module - Test Cases Quick Guide

**Project**: GUI-mz/cypress-tests
**Module**: IWSVA Update
**Last Updated**: 2025-01-22

---

## Quick Reference

### Test Case Statistics

| Category | Test Cases | P0 | P1 | P2 | P3 | Automation | Spec Files |
|----------|------------|----|----|----|----|------------|------------|
| Normal Update | 7 | 2 | 4 | 1 | 0 | 100% | `01-normal-update/*.cy.js` |
| Forced Update | 5 | 0 | 3 | 2 | 0 | 100% | `02-forced-update/*.cy.js` |
| Rollback | 8 | 1 | 3 | 4 | 0 | 100% | `03-rollback/*.cy.js` |
| Update All | 5 | 1 | 3 | 1 | 0 | 100% | `04-update-all/*.cy.js` |
| UI Interaction | 8 | 1 | 4 | 3 | 0 | 100% | `05-ui-interaction/*.cy.js` |
| Error Handling | 12 | 2 | 6 | 4 | 0 | 100% | `06-error-handling/*.cy.js` |
| Schedule | 5 | 0 | 3 | 2 | 0 | 100% | `07-schedule/*.cy.js` |
| Proxy | 4 | 0 | 2 | 2 | 0 | 100% | `08-proxy/*.cy.js` |
| Logging | 3 | 0 | 2 | 1 | 0 | 100% | `09-logging/*.cy.js` |
| Performance | 2 | 1 | 1 | 0 | 0 | 100% | `10-performance/*.cy.js` |
| Business | 18 | 2 | 9 | 5 | 2 | 100% | `11-business/*.cy.js` |
| **Total** | **77** | **10** | **40** | **25** | **2** | **100%** | **77 files** |

---

## Running Test Cases

### By Priority

```bash
# P0 - Critical Smoke Tests (10 cases, ~30 min)
npm run test:p0

# P0 + P1 - Core Functionality (50 cases, ~2 hours)
npm run test:p1

# All Test Cases (77 cases, ~3-4 hours)
npm run test:update
```

### By Category

```bash
npm run test:update:normal       # Normal update tests
npm run test:update:forced       # Forced update tests
npm run test:update:rollback     # Rollback tests
npm run test:update:all          # Update All tests
npm run test:update:ui           # UI interaction tests
npm run test:update:errors       # Error handling tests
npm run test:update:schedule     # Schedule tests
npm run test:update:proxy        # Proxy tests
npm run test:update:logging      # Logging tests
npm run test:update:performance  # Performance tests
npm run test:update:business     # Business continuity tests
```

### By Component

```bash
# Run tests for specific component
npx cypress run --spec "cypress/e2e/iwsva-update/**/*PTN*.cy.js"      # Virus Pattern
npx cypress run --spec "cypress/e2e/iwsva-update/**/*SPYWARE*.cy.js"  # Spyware Pattern
npx cypress run --spec "cypress/e2e/iwsva-update/**/*ENG*.cy.js"      # Scan Engine
```

### Interactive Mode

```bash
# Open Cypress Test Runner for debugging
npx cypress open
```

---

## Test Case Categories

### 1. Normal Update (7 test cases)

**Purpose**: Verify standard update workflows for patterns and engines

**Key Test Cases:**
- **TC-UPDATE-001** (P0): Virus Pattern Normal Update
- **TC-UPDATE-002** (P1): Already Up-to-date Scenario
- **TC-UPDATE-010** (P1): Spyware Pattern Update
- **TC-UPDATE-100** (P0): Scan Engine Update

**Coverage**: All 12 components (9 patterns + 3 engines)

**Execution Time**: ~10 minutes per component

---

### 2. Forced Update (5 test cases)

**Purpose**: Verify re-download and reinstall functionality

**Key Test Cases:**
- **TC-FORCED-001** (P1): Forced Update - Virus Pattern
- **TC-FORCED-002** (P2): Cancel Forced Update
- **TC-FORCED-003** (P1): Forced Update - Scan Engine

**Use Case**: When update is needed even if version is up-to-date

**Execution Time**: ~10 minutes per test

---

### 3. Rollback (8 test cases)

**Purpose**: Verify version restoration from backup

**Key Test Cases:**
- **TC-ROLLBACK-001** (P0): Rollback Virus Pattern
- **TC-ROLLBACK-002** (P1): Cancel Rollback
- **TC-ROLLBACK-003** (P1): Rollback Scan Engine
- **TC-ROLLBACK-004** (P1): URL Filtering Rollback Restriction

**Coverage**: Components with rollback support (excludes TMUFEENG)

**Execution Time**: ~5 minutes per test

---

### 4. Update All (5 test cases)

**Purpose**: Verify batch update of all components

**Key Test Cases:**
- **TC-UPDATEALL-001** (P0): Update All Components
- **TC-UPDATEALL-002** (P1): Update All with Some Up-to-date
- **TC-UPDATEALL-003** (P1): Cancel Update All

**Use Case**: Update all components in one operation

**Execution Time**: ~30 minutes per test

---

### 5. UI Interaction (8 test cases)

**Purpose**: Verify user interface display and interactions

**Key Test Cases:**
- **TC-UI-001** (P0): Page Display Verification
- **TC-UI-002** (P1): Version Display
- **TC-UI-003** (P1): Update Status Display
- **TC-UI-004** (P1): Schedule Configuration UI

**Coverage**: All UI elements on update pages

**Execution Time**: <1 minute per test

---

### 6. Error Handling (12 test cases)

**Purpose**: Verify graceful error handling for failure scenarios

**Network Errors (4 cases):**
- **TC-ERROR-001** (P0): Network Error During Update
- **TC-ERROR-002** (P1): Update Server Unreachable
- **TC-ERROR-004** (P1): Network Timeout

**Resource Errors (3 cases):**
- **TC-ERROR-010** (P1): Insufficient Disk Space
- **TC-ERROR-011** (P2): Memory Exhaustion
- **TC-ERROR-012** (P2): File System Error

**State Errors (5 cases):**
- **TC-ERROR-020** (P2): Concurrent Update Attempt
- **TC-ERROR-021** (P2): Stale Lock File
- **TC-ERROR-023** (P2): Version Mismatch

**Execution Time**: <5 minutes per test

---

### 7. Schedule (5 test cases)

**Purpose**: Verify scheduled update configuration and execution

**Key Test Cases:**
- **TC-SCHEDULE-001** (P1): Configure Daily Schedule
- **TC-SCHEDULE-002** (P1): Configure Weekly Schedule
- **TC-SCHEDULE-003** (P1): Disable Scheduled Update
- **TC-SCHEDULE-004** (P2): Schedule Conflict Handling
- **TC-SCHEDULE-005** (P2): Schedule Execution Verification

**Coverage**: All schedule configuration options

**Execution Time**: ~5 minutes per test

---

### 8. Proxy (4 test cases)

**Purpose**: Verify proxy configuration for update server connection

**Key Test Cases:**
- **TC-PROXY-001** (P1): Configure Proxy Settings
- **TC-PROXY-002** (P1): Update Through Proxy
- **TC-PROXY-003** (P2): Proxy Authentication
- **TC-PROXY-004** (P2): Invalid Proxy Configuration

**Coverage**: Proxy settings and authentication

**Execution Time**: ~5 minutes per test

---

### 9. Logging (3 test cases)

**Purpose**: Verify update logging and audit trails

**Key Test Cases:**
- **TC-LOG-001** (P1): Update Success Logging
- **TC-LOG-002** (P1): Update Failure Logging
- **TC-LOG-003** (P2): Audit Trail Verification

**Coverage**: All update operations logged correctly

**Execution Time**: <5 minutes per test

---

### 10. Performance (2 test cases)

**Purpose**: Verify update performance meets SLA

**Key Test Cases:**
- **TC-PERF-001** (P0): Pattern Update Duration
- **TC-PERF-002** (P1): Resource Usage During Update

**Metrics**:
- Pattern update: <10 minutes
- Engine update: <15 minutes
- CPU usage: <80%
- Memory growth: Within limits

**Execution Time**: ~15 minutes per test

---

### 11. Business Continuity (18 test cases)

**Purpose**: Verify no service interruption during updates

**Key Test Cases:**
- **TC-BUSINESS-001** (P0): Scanning During Pattern Update
- **TC-BUSINESS-002** (P0): URL Filtering During Engine Update
- **TC-BUSINESS-003** (P1): Policy Enforcement During Update

**Coverage**: All critical business functions continue during updates

**Execution Time**: ~15 minutes per test

---

## Critical Path Test Cases (P0)

These 10 test cases MUST pass before any release:

| ID | Title | Category | Duration | Description |
|----|-------|----------|----------|-------------|
| TC-UPDATE-001 | Virus Pattern Update | Normal | ~10 min | Core pattern update flow |
| TC-UPDATE-100 | Scan Engine Update | Normal | ~12 min | Core engine update flow |
| TC-ROLLBACK-001 | Rollback Virus Pattern | Rollback | ~5 min | Version restoration |
| TC-UPDATEALL-001 | Update All Components | Update All | ~30 min | Batch update |
| TC-UI-001 | Page Display | UI | <1 min | UI rendering |
| TC-ERROR-001 | Network Error | Error | <1 min | Error handling |
| TC-PERF-001 | Pattern Update Duration | Performance | ~15 min | Performance SLA |
| TC-BUSINESS-001 | Scanning Continuity | Business | ~15 min | Service availability |
| TC-BUSINESS-002 | Filtering Continuity | Business | ~15 min | Feature availability |
| TC-BUSINESS-003 | Policy Enforcement | Business | ~10 min | Security continuity |

**Total P0 Execution Time**: ~30 minutes

---

## Test Case Naming Convention

```
TC-{CATEGORY}-{ID}-{description}.cy.js
```

**Examples:**
- `TC-UPDATE-001-virus-pattern.cy.js`
- `TC-FORCED-001-virus-pattern.cy.js`
- `TC-ROLLBACK-001-virus-pattern.cy.js`
- `TC-ERROR-001-network-error.cy.js`

**Category Codes:**
- `UPDATE`: Normal update tests
- `FORCED`: Forced update tests
- `ROLLBACK`: Rollback tests
- `UPDATEALL`: Update All tests
- `UI`: UI interaction tests
- `ERROR`: Error handling tests
- `SCHEDULE`: Schedule tests
- `PROXY`: Proxy tests
- `LOG`: Logging tests
- `PERF`: Performance tests
- `BUSINESS`: Business continuity tests

---

## Test Data

### Component IDs

| Component ID | Display Name | Type |
|--------------|--------------|------|
| PTN | Virus Pattern | Pattern |
| SPYWARE | Spyware Pattern | Pattern |
| BOT | Bot Pattern | Pattern |
| ITP | IntelliTrap Pattern | Pattern |
| ITE | IntelliTrap Exception | Pattern |
| SPAM | Spam Pattern | Pattern |
| ICRCAGENT | Smart Scan Agent | Pattern |
| TMSA | Smart Analysis | Pattern |
| DPIPTN | DPI Pattern | Pattern |
| ENG | Virus Scan Engine | Engine |
| ATSEENG | ATSE Scan Engine | Engine |
| TMUFEENG | URL Filtering Engine | Engine |

### Test Versions

Defined in `cypress/fixtures/component-test-versions.json`

**Example:**
```json
{
  "PTN": {
    "oldVersion": "18.500.00",
    "newVersion": "18.501.00",
    "rollbackVersion": "18.499.00"
  }
}
```

---

## Verification Levels

All test cases implement multi-level verification:

### Level 1: UI Verification ✅
- Version number displayed correctly
- Status messages accurate
- Button states appropriate

### Level 2: Backend Verification ✅
- INI file updated (`/opt/trend/iwsva/intscan.ini`)
- Pattern files exist in correct location
- Lock files managed properly

### Level 3: Log Verification ✅
- Update logged in `/var/log/trend/iwsva/update.log`
- Audit trail created
- No unexpected errors

### Level 4: Business Function Verification ✅
- Virus scanning works post-update
- URL filtering functional
- Services remain available

---

## Documentation

### For Test Case Details

📖 **[Complete Test Cases Documentation](docs/test-cases/UPDATE_TEST_CASES.md)**
- Detailed test steps
- Prerequisites
- Expected results
- Verification points

### For Test Planning

📋 **[Test Plan](docs/test-plans/IWSVA-Update-Test-Plan.md)**
- Test scope and approach
- Schedule and milestones
- Entry/exit criteria
- Risk assessment

📋 **[Test Strategy](docs/test-plans/Test-Strategy.md)**
- Testing philosophy
- Test levels and types
- Automation framework
- Quality gates

### For Test Data

📊 **[Test Data Dictionary](docs/test-cases/test-data-dictionary.md)**
- Component metadata
- Version data
- File paths and timeouts
- Error messages

📊 **[Traceability Matrix](docs/test-cases/traceability-matrix.md)**
- Requirements to test case mapping
- Coverage analysis
- Gap identification

### For Test Execution

✅ **[Verification Checklist](docs/test-cases/verification-checklist.md)**
- UI verification steps
- Backend verification steps
- Log verification steps
- Business function verification

---

## Test Reports

### Report Location

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

- Pass/Fail summary
- Execution duration
- Screenshots on failure
- Test logs
- Coverage metrics

---

## Adding New Test Cases

### Step-by-Step Guide

1. **Document Test Case**: Add to `docs/test-cases/UPDATE_TEST_CASES.md`
2. **Update Mapping**: Add entry to `test-case-mapping.json`
3. **Update Matrix**: Add to `traceability-matrix.md`
4. **Implement Test**: Create spec file in appropriate category folder
5. **Use Framework Components**:
   - Page Objects (`cypress/support/pages/`)
   - Workflows (`cypress/support/workflows/`)
   - Factories (`cypress/support/factories/`)
6. **Run Test**: Execute and verify results
7. **Code Review**: Submit PR
8. **Update Stats**: Update this document

---

## Troubleshooting

### Test Execution Issues

**Issue**: Test timeout
**Solution**: Check network, increase timeout, verify environment

**Issue**: Frame not found
**Solution**: Verify frame IDs in JSP, check navigation logic

**Issue**: Version mismatch
**Solution**: Check test data fixture, verify INI file path

**Issue**: Lock file error
**Solution**: Run cleanup, check teardown hooks

### Debug Commands

```bash
# Run with verbose logging
DEBUG=cypress:* npx cypress run

# Run specific test in headed mode
npx cypress run --spec "path/to/test.cy.js" --headed --no-exit

# Open Test Runner for debugging
npx cypress open
```

---

## Support

### Contacts

- **QA Lead**: [Name/Email]
- **Automation Engineer**: [Name/Email]
- **Development Team**: [Team Contact]

### Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Project Main README](README.md)
- [Update Module Overview](UPDATE_MODULE_README.md)

---

## Quick Commands Cheat Sheet

```bash
# Installation
npm install

# Run all update tests
npm run test:update

# Run by priority
npm run test:p0                  # Critical tests
npm run test:p1                  # P0 + P1 tests

# Run by category
npm run test:update:normal       # Normal updates
npm run test:update:forced       # Forced updates
npm run test:update:rollback     # Rollback
npm run test:update:all          # Update All
npm run test:update:ui           # UI tests
npm run test:update:errors       # Error handling

# Interactive mode
npx cypress open

# Run specific test
npx cypress run --spec "cypress/e2e/iwsva-update/01-normal-update/TC-UPDATE-001*.cy.js"

# Generate report
npm run report:generate

# Lint code
npm run lint
npm run lint:fix
```

---

**Document Status**: ✅ Active
**Last Updated**: 2025-01-22
**Version**: 1.0.0
