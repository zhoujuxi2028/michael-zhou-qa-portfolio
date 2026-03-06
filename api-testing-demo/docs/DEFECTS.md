# Known Defects & Bug Tracking

**Project**: API Testing Demo (E-Commerce API Test Suite)
**Last Updated**: 2026-03-06
**Maintainer**: Michael Zhou

---

## Defects Summary

| Status | Count |
|--------|-------|
| Open | 12 |
| In Progress | 0 |
| Resolved | 0 |
| **Total** | 12 |

---

## Active Defects

### DEF-001: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Test script declares `responseTime` variable multiple times using `const`, causing JavaScript runtime error.

#### Error Message
```
SyntaxError: Identifier 'responseTime' has already been declared
```

#### Affected Requests
- 07-Negative Tests / 06-Delete Non-existent Resource

#### Root Cause
The test script likely has collection-level pre-request script that declares `const responseTime`, then the request-level script also declares it with the same name.

#### Suggested Fix
Change `const responseTime` to `var responseTime` or use conditional declaration:
```javascript
if (typeof responseTime === 'undefined') {
    var responseTime = pm.response.responseTime;
}
```

---

### DEF-002: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-001.

#### Affected Requests
- 07-Negative Tests / 07-Query with Invalid Parameters

---

### DEF-003: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-001.

#### Affected Requests
- 07-Negative Tests / 08-Post with Very Long Title

---

### DEF-004: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-001.

#### Affected Requests
- 07-Negative Tests / 09-Get with Negative ID

---

### DEF-005: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-001.

#### Affected Requests
- 07-Negative Tests / 10-Concurrent Request Simulation

---

### DEF-006: SyntaxError - Multiple Script Errors

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Test script has multiple errors: `responseTime` duplicate declaration AND unexpected token ')'.

#### Error Messages
```
SyntaxError: Identifier 'responseTime' has already been declared
SyntaxError: Unexpected token ')'
```

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 01-Data-Driven User Creation

#### Root Cause
1. Variable re-declaration issue
2. Missing function argument or extra closing parenthesis

---

### DEF-007: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-001.

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 02-Get Created User (Correlation)

---

### DEF-008: SyntaxError - Multiple Script Errors

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-006.

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 03-Update User with Validation

---

### DEF-009: SyntaxError - responseTime Duplicate Declaration

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-001.

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 04-Data-Driven Product Search

---

### DEF-010: SyntaxError - Multiple Script Errors

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Syntax Error

#### Description
Same issue as DEF-006.

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 05-Workflow Test (Full User Journey)

---

### DEF-011: AssertionError - Correlation Test Fails Due to API Limitation

**Status**: Open
**Severity**: Medium
**Priority**: P2
**Reported**: 2026-03-06
**Category**: Test Design / API Limitation

#### Description
The correlation test attempts to GET a user that was created in a previous POST request. However, JSONPlaceholder is a mock API that doesn't persist data - POST requests return a simulated response with an ID, but the resource is never actually created.

#### Error Message
```
AssertionError: [Enhanced-006] Should retrieve user successfully
Failed to retrieve user. Status: 404: expected 404 to equal 200
```

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 02-Get Created User (Correlation)

#### Root Cause
JSONPlaceholder API behavior:
- POST /users returns `{ id: 11, ... }` (simulated creation)
- GET /users/11 returns 404 (resource doesn't exist)

#### Suggested Fix
**Option 1**: Skip this test when using JSONPlaceholder
**Option 2**: Modify test to expect 404 for mock API environment
**Option 3**: Use a real API backend that persists data

---

### DEF-012: AssertionError - Incorrect Property Assertion Syntax

**Status**: Open
**Severity**: High
**Priority**: P1
**Reported**: 2026-03-06
**Category**: Test Script / Assertion Logic

#### Description
The assertion uses incorrect Chai syntax. The `.to.have.property()` method's second argument should be the expected value, not an error message.

#### Error Message
```
AssertionError: [Enhanced-020] Each result should have required fields
expected { userId: 1, id: 1, ...(2) } to have property 'id' of 'Item 0 missing id field', but got 1
```

#### Affected Requests
- 08-Enhanced Testing (Data-Driven & Correlation) / 04-Data-Driven Product Search

#### Root Cause
Incorrect assertion:
```javascript
// Wrong - second argument is treated as expected value
pm.expect(item).to.have.property('id', 'Item 0 missing id field');
```

#### Suggested Fix
```javascript
// Correct - just check property exists
pm.expect(item, 'Item ' + i + ' missing id field').to.have.property('id');
```

---

## Resolved Defects

**No resolved defects yet.**

---

## Priority Matrix

| Priority | Severity | Count | Defects |
|----------|----------|-------|---------|
| P1 | High | 11 | DEF-001 ~ DEF-010, DEF-012 |
| P2 | Medium | 1 | DEF-011 |

---

## Acceptance Criteria

All defects resolved when:
- [ ] No SyntaxError in test execution
- [ ] All assertions pass with prod environment
- [ ] Newman exit code = 0
- [ ] 100% test pass rate

---

## Environment Information

### Test Configuration
| Environment | Base URL | Status |
|-------------|----------|--------|
| dev | http://localhost:3000 | Requires local server |
| staging | http://localhost:3001 | Requires local server |
| prod | https://jsonplaceholder.typicode.com | Available |

### Test Command
```bash
cd api-testing-demo
newman run collections/E-Commerce-API-Test-Suite.postman_collection.json \
  -e environments/prod.postman_environment.json -r cli
```

---

## Notes

### JSONPlaceholder Limitations
JSONPlaceholder is a free online REST API for testing:
- All POST/PUT/PATCH/DELETE operations are simulated
- Data is not persisted between requests
- Correlation tests (create -> read) will fail by design

### Recommended Actions
1. Fix syntax errors (DEF-001 ~ DEF-010, DEF-012) first
2. Review test design for DEF-011 (API limitation)
3. Consider adding environment-aware assertions

---

**Report Defects**: Add entries following the template above
**Update Status**: Change Open -> In Progress -> Resolved
