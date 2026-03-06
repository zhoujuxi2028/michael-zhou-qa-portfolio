# Test Cases Documentation

This directory contains all test case documentation for the IWSVA Update module.

## 📚 Documentation Files

### Main Documentation
- **[UPDATE_TEST_CASES.md](./UPDATE_TEST_CASES.md)** - Complete test case documentation (77 test cases)
- **[UPDATE_TEST_CASES.xlsx](./UPDATE_TEST_CASES.xlsx)** - Excel version for reviews and meetings
- **[test-case-mapping.json](./test-case-mapping.json)** - Test case metadata and automation mapping

### Supporting Documentation
- **[traceability-matrix.md](./traceability-matrix.md)** - Requirements to test case traceability
- **[test-data-dictionary.md](./test-data-dictionary.md)** - Test data definitions and constraints
- **[verification-checklist.md](./verification-checklist.md)** - Verification points checklist

## 🎯 Test Case Categories

### 1. Normal Update Flow (7 test cases)
- TC-UPDATE-001 to TC-UPDATE-110
- Covers all component types: Patterns and Engines

### 2. Forced Update Flow (5 test cases)
- TC-FORCED-001 to TC-FORCED-005
- Handles already up-to-date scenarios

### 3. Rollback Flow (8 test cases)
- TC-ROLLBACK-001 to TC-ROLLBACK-008
- Includes restriction tests (e.g., URLF cannot rollback)

### 4. Update All (5 test cases)
- TC-UPDATEALL-001 to TC-UPDATEALL-005
- Batch update scenarios

### 5. UI Interaction (8 test cases)
- TC-UI-001 to TC-UI-008
- User interface verification

### 6. Error Handling (12 test cases)
- TC-ERROR-001 to TC-ERROR-023
- Network, resource, and state errors

### 7. Additional Tests (32 test cases)
- Boundary, dependency, schedule, proxy, logging, performance, business continuity

## 🔍 Test Case Structure

Each test case follows this structure:

```markdown
## TC-XXX-NNN

### Title
Brief description

**Test Case ID**: TC-XXX-NNN
**Priority**: P0/P1/P2/P3
**Category**: Category Name
**Type**: Functional/Integration/Performance
**Automation**: ✅ Yes / ❌ No
**Spec File**: cypress/e2e/path/to/test.cy.js

#### Prerequisites
- Condition 1
- Condition 2

#### Test Data
{json data}

#### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|

#### Verification Points
- UI Verification
- Backend Verification
- Business Verification

#### Related Test Cases
Links to related tests
```

## 🏷️ Priority Levels

- **P0 (Critical)**: Core functionality, blocking issues
- **P1 (High)**: Important features, major flows
- **P2 (Medium)**: Secondary features, edge cases
- **P3 (Low)**: Nice-to-have, rare scenarios

## 📊 Test Case Statistics

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Normal Update | 2 | 5 | 0 | 0 | 7 |
| Forced Update | 0 | 3 | 2 | 0 | 5 |
| Rollback | 1 | 3 | 4 | 0 | 8 |
| Update All | 1 | 3 | 1 | 0 | 5 |
| UI Interaction | 1 | 3 | 3 | 1 | 8 |
| Error Handling | 2 | 6 | 4 | 0 | 12 |
| Others | 3 | 17 | 11 | 1 | 32 |
| **Total** | **10** | **40** | **25** | **2** | **77** |

## 🔗 Navigation

- [Back to Project README](../../README.md)
- [Test Plans](../test-plans/)
- [Test Data](../test-data/)
- [Automation Tests](../../cypress/e2e/iwsva-update/)

## 📝 Maintenance

**Last Updated**: 2025-01-22
**Owner**: QA Team
**Reviewers**: Dev Team, Product Manager

To update test cases:
1. Edit the main documentation file
2. Update the mapping JSON file
3. Update related automation scripts
4. Update this README if structure changes
