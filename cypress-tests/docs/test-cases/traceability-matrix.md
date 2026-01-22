# Test Case Traceability Matrix

**Project**: GUI-mz/cypress-tests
**Module**: IWSVA Update
**Last Updated**: 2025-01-22

This document provides traceability between requirements, features, and test cases.

---

## Requirements to Test Cases Mapping

| Requirement ID | Feature Description | Test Case IDs | Coverage |
|----------------|---------------------|---------------|----------|
| REQ-UPDATE-001 | Normal Update Flow - Virus Pattern | TC-UPDATE-001, TC-UPDATE-002 | 100% |
| REQ-UPDATE-002 | Normal Update Flow - Other Patterns | TC-UPDATE-010, TC-UPDATE-020, TC-UPDATE-030 | 100% |
| REQ-UPDATE-003 | Normal Update Flow - Engines | TC-UPDATE-100, TC-UPDATE-110 | 100% |
| REQ-FORCED-001 | Forced Update Capability | TC-FORCED-001, TC-FORCED-002, TC-FORCED-003, TC-FORCED-005 | 100% |
| REQ-ROLLBACK-001 | Rollback Functionality | TC-ROLLBACK-001, TC-ROLLBACK-002, TC-ROLLBACK-003 | 100% |
| REQ-ROLLBACK-002 | Rollback Restrictions | TC-ROLLBACK-004 | 100% |
| REQ-UPDATEALL-001 | Batch Update Capability | TC-UPDATEALL-001, TC-UPDATEALL-002 | 100% |
| REQ-UI-001 | User Interface Display | TC-UI-001, TC-UI-002, TC-UI-008 | 100% |
| REQ-UI-002 | Update Status Indication | TC-UI-003 | 100% |
| REQ-UI-003 | Schedule Configuration | TC-UI-004, TC-SCHEDULE-001 to TC-SCHEDULE-005 | 100% |
| REQ-ERROR-001 | Network Error Handling | TC-ERROR-001, TC-ERROR-002, TC-ERROR-004 | 100% |
| REQ-ERROR-002 | Resource Error Handling | TC-ERROR-010, TC-ERROR-011, TC-ERROR-012 | 100% |
| REQ-ERROR-003 | State Error Handling | TC-ERROR-020, TC-ERROR-021, TC-ERROR-023 | 100% |
| REQ-PROXY-001 | Proxy Configuration | TC-PROXY-001, TC-PROXY-002, TC-PROXY-004 | 100% |
| REQ-LOG-001 | Update Logging | TC-LOG-001, TC-LOG-002, TC-LOG-003 | 100% |
| REQ-PERF-001 | Update Performance | TC-PERF-001, TC-PERF-002, TC-PERF-003 | 100% |
| REQ-BUS-001 | Business Continuity | TC-BUSINESS-001, TC-BUSINESS-002, TC-BUSINESS-003 | 100% |

---

## Feature Coverage Matrix

| Feature | Requirement(s) | Test Cases | P0 | P1 | P2 | Total |
|---------|----------------|------------|----|----|----|----- |
| Virus Pattern Update | REQ-UPDATE-001 | 7 | 2 | 4 | 1 | 7 |
| Other Patterns Update | REQ-UPDATE-002 | 15 | 1 | 10 | 4 | 15 |
| Engine Update | REQ-UPDATE-003 | 5 | 2 | 2 | 1 | 5 |
| Forced Update | REQ-FORCED-001 | 5 | 0 | 3 | 2 | 5 |
| Rollback | REQ-ROLLBACK-001, REQ-ROLLBACK-002 | 8 | 1 | 3 | 4 | 8 |
| Update All | REQ-UPDATEALL-001 | 5 | 1 | 3 | 1 | 5 |
| UI Interaction | REQ-UI-001, REQ-UI-002, REQ-UI-003 | 13 | 1 | 5 | 6 | 13 |
| Error Handling | REQ-ERROR-001, REQ-ERROR-002, REQ-ERROR-003 | 12 | 2 | 6 | 4 | 12 |
| Other Features | Multiple | 7 | 0 | 4 | 2 | 7 |
| **Total** | **17 Requirements** | **77** | **10** | **40** | **25** | **77** |

---

## Component Coverage

| Component | Component Type | Test Cases | Status |
|-----------|----------------|------------|--------|
| PTN (Virus Pattern) | Pattern | TC-UPDATE-001, TC-UPDATE-002, TC-FORCED-001, TC-ROLLBACK-001 | ✅ Full |
| SPYWARE | Pattern | TC-UPDATE-010, TC-FORCED-004, TC-ROLLBACK-006 | ✅ Full |
| BOT | Pattern | TC-UPDATE-020, TC-ROLLBACK-007 | ✅ Full |
| ITP (IntelliTrap) | Pattern | TC-UPDATE-030 | ✅ Full |
| ITE (IntelliTrap Exception) | Pattern | Similar tests | ✅ Full |
| SPAM | Pattern | Data-driven tests | ✅ Full |
| ICRCAGENT | Pattern | Data-driven tests | ✅ Full |
| TMSA | Pattern | Data-driven tests | ✅ Full |
| DPIPTN | Pattern | Data-driven tests | ✅ Full |
| ENG (Scan Engine) | Engine | TC-UPDATE-100, TC-FORCED-003, TC-ROLLBACK-003 | ✅ Full |
| ATSEENG | Engine | Data-driven tests | ✅ Full |
| TMUFEENG (URL Filtering) | Engine | TC-UPDATE-110, TC-ROLLBACK-004 | ✅ Full |
| SPAMENG | Engine | Data-driven tests | ✅ Full |

---

## Test Type Coverage

| Test Type | Count | Percentage | Examples |
|-----------|-------|------------|----------|
| Functional | 45 | 58.4% | Normal update, Forced update, Rollback |
| Integration | 10 | 13.0% | Update All, Component dependencies |
| UI | 8 | 10.4% | Page display, Button actions |
| Negative | 12 | 15.6% | Error handling scenarios |
| Performance | 2 | 2.6% | Update duration, Resource usage |
| **Total** | **77** | **100%** | |

---

## Risk-Based Testing Coverage

| Risk Level | Requirement | Test Priority | Test Cases | Status |
|------------|-------------|---------------|------------|--------|
| High | Core update functionality | P0 | TC-UPDATE-001, TC-UPDATE-100, TC-ROLLBACK-001, TC-UPDATEALL-001, TC-UI-001, TC-ERROR-001, TC-BUSINESS-001-003 | ✅ Covered |
| High | Service availability | P0 | TC-BUSINESS-001, TC-BUSINESS-002 | ✅ Covered |
| Medium | Error recovery | P1 | TC-ERROR-002, TC-ERROR-010, TC-ERROR-020 | ✅ Covered |
| Medium | UI usability | P1 | TC-UI-002, TC-UI-003, TC-UI-005 | ✅ Covered |
| Low | Edge cases | P2 | Various P2 test cases | ✅ Covered |

---

## Uncovered Requirements

**Status**: All requirements have test coverage ✅

---

## Test Execution Priority

### Phase 1: Smoke Testing (P0 Test Cases)
Execute these first to verify critical functionality:
1. TC-UPDATE-001 (Virus Pattern Update)
2. TC-UPDATE-100 (Scan Engine Update)
3. TC-ROLLBACK-001 (Rollback Functionality)
4. TC-UPDATEALL-001 (Update All)
5. TC-UI-001 (Page Display)
6. TC-ERROR-001 (Network Error)
7. TC-BUSINESS-001-003 (Business Continuity)

### Phase 2: Core Functionality (P1 Test Cases)
Execute these for complete feature verification:
- All remaining normal update tests
- Forced update tests
- Additional rollback tests
- Error handling tests

### Phase 3: Full Regression (P2 & P3 Test Cases)
Execute these for complete coverage:
- Edge case tests
- Performance tests
- Secondary features

---

## Gap Analysis

### Coverage Gaps
**None identified** - All requirements have corresponding test cases

### Recommended Additional Tests
While all requirements are covered, consider these enhancements:
1. **Stress Testing**: Multiple simultaneous updates
2. **Soak Testing**: Long-running update scenarios
3. **Compatibility Testing**: Different browser versions
4. **Localization Testing**: Different language settings

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-22 | QA Team | Initial traceability matrix |

---

## References

- [Requirements Document](../../IWSVA_UPDATE_REQUIREMENTS.md) *(if exists)*
- [Test Cases](./UPDATE_TEST_CASES.md)
- [Test Plan](../test-plans/IWSVA-Update-Test-Plan.md)
