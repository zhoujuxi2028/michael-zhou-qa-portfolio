# Consolidated Tests Quick Start

## Overview

The normal update tests have been consolidated into a single file for easier execution and maintenance.

**File**: `cypress/e2e/01-normal-update/all-components-normal-update.cy.js`

**Components tested**: All 9 components (6 patterns + 3 engines) automatically

---

## Quick Commands

### Run All Normal Update Tests

```bash
# Headless (recommended for CI/CD)
npx cypress run --spec "cypress/e2e/01-normal-update/all-components-normal-update.cy.js"

# Headed mode (watch tests run in Firefox)
npx cypress run --spec "cypress/e2e/01-normal-update/all-components-normal-update.cy.js" --headed --browser firefox

# Interactive mode
npm run cypress:open
# Then select: e2e/01-normal-update/all-components-normal-update.cy.js
```

### Run Individual Component Tests (Original Files Still Available)

```bash
# Single component
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-ptn.cy.js"

# Multiple components
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-{ptn,eng,spyware}.cy.js"

# All original files
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-*.cy.js"
```

---

## What's Tested

### Patterns (6)
- ✅ PTN (Virus Pattern) - P0 Critical
- ✅ SPYWARE (Spyware Pattern) - P1
- ✅ BOT (Bot Pattern) - P1
- ✅ ITP (IntelliTrap Pattern) - P2
- ✅ ITE (IntelliTrap Exception) - P2
- ✅ ICRCAGENT (Smart Scan Agent) - P2

### Engines (3)
- ✅ ENG (Virus Scan Engine) - P0 Critical
- ✅ ATSEENG (ATSE Scan Engine) - P1
- ✅ TMUFEENG (URL Filtering Engine) - P1

**Total**: ~99-117 test cases (11-13 tests per component)

---

## Benefits

1. **Single Command**: Run all 9 components with one command
2. **Auto-Discovery**: New components automatically included (via ComponentRegistry)
3. **Maintainable**: One file to update instead of nine
4. **Consistent**: All components use same test configuration

---

## File Comparison

| Aspect | Individual Files | Consolidated File |
|--------|-----------------|-------------------|
| Files | 9 separate files | 1 file |
| Commands | 9 commands (or glob pattern) | 1 command |
| Maintenance | Update 9 files | Update 1 file |
| New component | Create new file | Auto-included |

---

## Validation Checklist

Before relying on consolidated file exclusively:

- [ ] Run consolidated file successfully
- [ ] Verify all 9 components execute
- [ ] Compare results with individual file runs
- [ ] Check test count matches expected (~99-117 tests)
- [ ] Verify test names are descriptive

**Command to validate**:
```bash
npx cypress run --spec "cypress/e2e/01-normal-update/all-components-normal-update.cy.js" --headed --browser firefox
```

---

## Troubleshooting

### Issue: Consolidated file not running
**Solution**: Check that ComponentRegistry.js and NormalUpdateTestGenerator.js are accessible

### Issue: Missing components
**Solution**: Verify ComponentRegistry.getComponentIds() returns all 9 IDs

### Issue: Want different options per component
**Solution**: Either:
1. Modify consolidated file to use component-specific options
2. Use original individual files for specific components

---

## Related Files

- **Consolidated file**: `cypress/e2e/01-normal-update/all-components-normal-update.cy.js`
- **Test generator**: `cypress/support/test-generators/NormalUpdateTestGenerator.js`
- **Component registry**: `cypress/fixtures/ComponentRegistry.js`
- **Documentation**: `CONSOLIDATION_SUMMARY.md`

---

## Next Steps

1. Run validation tests (see checklist above)
2. Use consolidated file for full regression runs
3. Keep individual files for component-specific debugging
4. After 1-2 weeks of stable usage, optionally delete individual files

---

## Getting Help

For detailed information, see:
- `CONSOLIDATION_SUMMARY.md` - Complete implementation details
- `CLAUDE.md` - General test framework documentation
- `UPDATE_MODULE_README.md` - Update module overview
