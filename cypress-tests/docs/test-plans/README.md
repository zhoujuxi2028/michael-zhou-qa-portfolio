# Test Plans Documentation

This directory contains test plans and strategy documents for IWSVA Update module testing.

---

## 📄 Documents

### [IWSVA-Update-Test-Plan.md](./IWSVA-Update-Test-Plan.md)
**Complete test plan** covering:
- Test objectives and scope
- Test approach and strategy
- Test environment setup
- Test schedule and milestones
- Entry/exit criteria
- Risk assessment
- Resource requirements
- Deliverables

### [Test-Strategy.md](./Test-Strategy.md)
**High-level test strategy** defining:
- Testing philosophy
- Test levels and types
- Automation approach
- Tools and frameworks
- Quality gates
- Continuous integration
- Reporting and metrics

---

## Quick Links

- [Test Cases Documentation](../test-cases/)
- [Test Data](../test-data/)
- [Automation Tests](../../cypress/e2e/iwsva-update/)
- [Project README](../../README.md)

---

## Test Execution

### Running Tests

```bash
# Run all update tests
npm run test:update

# Run by category
npm run test:update:normal      # Normal update tests
npm run test:update:forced      # Forced update tests
npm run test:update:rollback    # Rollback tests
npm run test:update:all         # Update All tests
npm run test:update:ui          # UI tests
npm run test:update:errors      # Error handling tests

# Run by priority
npm run test:p0                 # Critical tests only
npm run test:p1                 # P0 + P1 tests
```

### Test Reporting

Test reports are generated in:
- **HTML Reports**: `reports/html/index.html`
- **JSON Results**: `reports/test-results/*.json`
- **Screenshots**: `reports/screenshots/` (on failure)
- **Videos**: `cypress/videos/` (if enabled)

---

## Test Coverage

| Category | Test Cases | Automation | Status |
|----------|------------|------------|--------|
| Normal Update | 7 | 100% | ✅ Active |
| Forced Update | 5 | 100% | ✅ Active |
| Rollback | 8 | 100% | ✅ Active |
| Update All | 5 | 100% | ✅ Active |
| UI Interaction | 8 | 100% | ✅ Active |
| Error Handling | 12 | 100% | ✅ Active |
| Other | 32 | 100% | ✅ Active |
| **Total** | **77** | **100%** | **✅** |

---

## Test Schedule

### Sprint/Iteration Testing
- **Daily**: Run P0 tests (smoke test)
- **Per PR**: Run affected test suites
- **Weekly**: Full regression (all 77 tests)
- **Release**: Complete test cycle + manual exploratory testing

### Test Execution Time
- **P0 Suite**: ~30 minutes
- **P0 + P1 Suite**: ~2 hours
- **Full Suite**: ~3-4 hours

---

## Entry Criteria

Before starting test execution:
- [ ] Test environment setup complete
- [ ] IWSVA system accessible
- [ ] Test data prepared
- [ ] Test accounts configured
- [ ] Cypress environment configured (`cypress.env.json`)
- [ ] Dependencies installed (`npm install`)

---

## Exit Criteria

Test completion criteria:
- [ ] All P0 tests passed
- [ ] ≥95% of P1 tests passed
- [ ] No critical defects open
- [ ] Test report generated
- [ ] Known issues documented

---

## Contacts

- **QA Lead**: [Name]
- **Automation Engineer**: [Name]
- **Dev Team Lead**: [Name]
- **Product Manager**: [Name]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-22 | QA Team | Initial test plans README |
