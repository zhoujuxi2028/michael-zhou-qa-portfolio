# Test Generator Quick Reference

## Overview

The `NormalUpdateTestGenerator` eliminates 85% of code duplication across update tests by providing a standardized test template.

**Location**: `cypress/support/test-generators/NormalUpdateTestGenerator.js`

---

## Quick Start

### Basic Usage

```javascript
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - PTN',
  NormalUpdateTestGenerator.generateTestSuite('PTN')
)
```

That's it! This 4-line file replaces 167 lines of boilerplate code.

---

## API Reference

### `generateTestSuite(componentId, options)`

Generates a complete test suite with all verifications.

**Parameters**:
- `componentId` (string, required) - Component ID (e.g., 'PTN', 'ENG', 'SPYWARE')
- `options` (object, optional) - Configuration options

**Options**:
```javascript
{
  captureScreenshots: true,  // Capture screenshots during test (default: true)
  verboseLogging: false,     // Enable verbose logging (default: false)
  skipCleanup: false         // Skip cleanup after tests (default: false)
}
```

**Example**:
```javascript
describe('Normal Update - ENG',
  NormalUpdateTestGenerator.generateTestSuite('ENG', {
    captureScreenshots: true,
    verboseLogging: true  // Enable for debugging
  })
)
```

---

### `generateSimpleTestSuite(componentId, options)`

Generates a simplified 3-step test suite (Initialize → Trigger → Verify).

**Parameters**:
- `componentId` (string, required) - Component ID
- `options` (object, optional) - Configuration options

**Example**:
```javascript
describe('Normal Update - PTN (Simple)',
  NormalUpdateTestGenerator.generateSimpleTestSuite('PTN', {
    captureScreenshots: false
  })
)
```

**Use when**:
- Quick smoke tests
- CI/CD pipelines (faster execution)
- Initial development/debugging

---

## Generated Test Structure

### Full Test Suite (`generateTestSuite`)

The generator creates the following test structure:

```
describe('TC-UPDATE: [Component] Normal Update')
  ├── Hooks
  │   ├── before('Setup test environment')
  │   ├── after('Cleanup test environment')
  │   ├── beforeEach('Verify test preconditions')
  │   └── afterEach('Test cleanup')
  │
  ├── Test Cases
  │   ├── Should display component in manual update page
  │   ├── Should perform complete normal update
  │   ├── Should verify update at UI level
  │   ├── Should verify update at backend level
  │   ├── Should verify update at log level
  │   ├── Should complete 4-level verification
  │   ├── Should verify rollback support
  │   ├── Should verify component category
  │   ├── Should verify component priority
  │   ├── Should handle subsequent update (already up-to-date)
  │   └── Should verify update timeout is configured
  │
  └── Engine-Specific Tests (if component.category === 'engine')
      ├── Should verify engine DLL integrity after update
      ├── Should verify engine requires service restart
      └── Should verify engine service status after update
```

**Total test cases**:
- Patterns: 11 test cases
- Engines: 13 test cases

---

### Simple Test Suite (`generateSimpleTestSuite`)

```
describe('[Component] Normal Update')
  ├── Step 1: Initialize test environment
  ├── Step 2: Trigger update on page
  ├── Step 3: Verify update completion (UI + Backend/Logs)
  └── after('Cleanup test environment')
```

**Total test cases**: 3 (one per step)

---

## Component Support

### Supported Components

The generator works with all 9 components from `ComponentRegistry`:

**Patterns** (6):
- `PTN` - Virus Pattern (P0)
- `SPYWARE` - Spyware Pattern (P1)
- `BOT` - Bot Pattern (P1)
- `ITP` - IntelliTrap Pattern (P2)
- `ITE` - IntelliTrap Exception (P2)
- `ICRCAGENT` - Smart Scan Agent (P2)

**Engines** (3):
- `ENG` - Virus Scan Engine (P0)
- `ATSEENG` - ATSE Scan Engine (P1)
- `TMUFEENG` - URL Filtering Engine (P1, cannot rollback)

### Component-Specific Behavior

The generator automatically adapts to component type:

**For Engines**:
- Adds engine DLL verification test
- Adds service restart requirement test
- Adds service status verification test

**For TMUFEENG** (special case):
- Rollback support test expects `false` (cannot rollback)
- Skips rollback-related verifications

**For P0 Components** (PTN, ENG):
- Priority test expects `P0`
- Critical flag test expects `true`

---

## What Gets Tested

### Multi-Level Verification

Each generated test performs verification at 4 levels:

1. **UI Level**
   - Component version displayed correctly
   - Timestamp is recent (<10 minutes)
   - Component row exists and is selectable

2. **Backend Level**
   - INI file version matches expected
   - Component files exist (pattern/engine files)
   - Lock file removed after update

3. **Log Level**
   - Update log entry exists
   - No error messages in logs
   - Success message in logs

4. **Business Logic Level**
   - Component category correct (pattern/engine)
   - Rollback support matches specification
   - Service restart requirement correct
   - Priority level correct
   - Update timeout configured

---

## Test Hooks

### `before()` - Setup Test Environment

```javascript
before('Setup test environment', function() {
  // Verify preconditions
  setupWorkflow.setupForUpdateTests()
  setupWorkflow.verifyNoUpdatesInProgress()

  // Create snapshot for restoration
  TestDataSetup.createSnapshot()

  // Setup test data (downgrade to previous version)
  TestDataSetup.setupNormalUpdate(componentId)
})
```

### `beforeEach()` - Verify Test Preconditions

```javascript
beforeEach('Verify test preconditions', function() {
  // Ensure no updates are running
  setupWorkflow.verifyNoUpdatesInProgress()

  // Navigate to manual update page
  manualUpdatePage.navigate()
})
```

### `afterEach()` - Test Cleanup

```javascript
afterEach('Test cleanup', function() {
  if (this.currentTest.state === 'failed') {
    // Capture screenshot on failure
    cy.screenshot(`failure-${componentId}-${testTitle}`)

    // Capture system state for debugging
    cleanupWorkflow.captureFailureState(testTitle)
  }
})
```

### `after()` - Cleanup Test Environment

```javascript
after('Cleanup test environment', function() {
  // Restore original state
  TestDataSetup.restoreSnapshot(testSnapshot)

  // Cleanup temporary files
  cleanupWorkflow.cleanupAfterSuccess()
})
```

---

## Examples

### Example 1: Pattern Component (PTN)

```javascript
/**
 * Normal Update Tests - PTN (Virus Pattern)
 */
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - PTN (Virus Pattern)',
  NormalUpdateTestGenerator.generateTestSuite('PTN', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
```

**Result**: 11 test cases, full verification suite

---

### Example 2: Engine Component (ENG)

```javascript
/**
 * Normal Update Tests - ENG (Virus Scan Engine)
 */
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - ENG (Virus Scan Engine)',
  NormalUpdateTestGenerator.generateTestSuite('ENG', {
    captureScreenshots: true
  })
)
```

**Result**: 13 test cases (11 standard + 2 engine-specific)

---

### Example 3: Simple Test (Quick Smoke)

```javascript
/**
 * Smoke Test - Quick PTN Update
 */
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Smoke Test - PTN Update',
  NormalUpdateTestGenerator.generateSimpleTestSuite('PTN', {
    captureScreenshots: false  // Faster execution
  })
)
```

**Result**: 3 test cases (Initialize, Trigger, Verify)

---

### Example 4: Debugging Mode

```javascript
/**
 * Debug Test - Verbose Logging
 */
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Debug - ENG Update',
  NormalUpdateTestGenerator.generateTestSuite('ENG', {
    captureScreenshots: true,
    verboseLogging: true,  // Extra logging
    skipCleanup: true      // Keep state for inspection
  })
)
```

---

## Creating a New Component Test

### Step-by-Step

1. **Create test file**: `cypress/e2e/01-normal-update/normal-update-newcomponent.cy.js`

2. **Add test code**:
```javascript
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - NEWCOMPONENT',
  NormalUpdateTestGenerator.generateTestSuite('NEWCOMPONENT')
)
```

3. **Update ComponentRegistry** (if needed):
   - Add component metadata to `cypress/fixtures/ComponentRegistry.js`

4. **Update test versions**:
   - Add version data to `cypress/fixtures/component-test-versions.json`

5. **Run test**:
```bash
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-newcomponent.cy.js"
```

**Total time**: ~30 seconds (vs 10 minutes manually)

---

## Customization

### Extending the Generator

If you need custom test cases not covered by the generator:

```javascript
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - PTN', function() {
  // Use generator for standard tests
  NormalUpdateTestGenerator.generateTestSuite('PTN').call(this)

  // Add custom test
  describe('Custom PTN Tests', function() {
    it('Should do something specific to PTN', function() {
      // Custom test logic
    })
  })
})
```

---

## Error Messages

The generator uses enhanced assertion messages via `AssertionHelpers`:

**Before**:
```
AssertionError: expected false to be true
```

**After**:
```
AssertionError: Virus Pattern update should succeed, but got error: timeout exceeded
```

**Context-aware**:
```
AssertionError: Virus Pattern version (INI file) should be 18.501.00, but was 18.500.00
```

---

## Performance

### Execution Time

**Full test suite** (`generateTestSuite`):
- Pattern: ~15-20 minutes (includes 10-minute update)
- Engine: ~20-25 minutes (includes 12-minute update)

**Simple test suite** (`generateSimpleTestSuite`):
- Pattern: ~12-15 minutes
- Engine: ~15-18 minutes

**Parallel execution** (8 components):
- Serial: ~2.5 hours
- Parallel (4 workers): ~40 minutes

---

## Troubleshooting

### Component ID not found

**Error**: `Invalid component ID: XYZ`

**Solution**: Ensure component exists in `ComponentRegistry.js`

---

### Test versions missing

**Error**: `Cannot read property 'previous' of undefined`

**Solution**: Add component to `component-test-versions.json`:
```json
{
  "NEWCOMPONENT": {
    "previous": "1.0.0",
    "current": "1.0.1"
  }
}
```

---

### Service status check fails

**Error**: `cy.task('checkServiceStatus') failed`

**Solution**: Ensure `checkServiceStatus` task is registered in `cypress.config.js`

---

## Best Practices

1. **Use full test suite for critical components** (P0: PTN, ENG)
2. **Use simple suite for quick smoke tests**
3. **Enable verbose logging only when debugging**
4. **Capture screenshots in CI/CD pipelines**
5. **Run tests in parallel when possible**
6. **Keep test data up-to-date** (component-test-versions.json)

---

## Related Files

- **Test Generator**: `cypress/support/test-generators/NormalUpdateTestGenerator.js`
- **Component Registry**: `cypress/fixtures/ComponentRegistry.js`
- **Assertion Helpers**: `cypress/support/verification/AssertionHelpers.js`
- **Test Versions**: `cypress/fixtures/component-test-versions.json`
- **Update Workflow**: `cypress/support/workflows/UpdateWorkflow.js`

---

## Migration from Old Tests

### Before (167 lines)
```javascript
describe('Normal Update - PTN', () => {
  const COMPONENT_ID = 'PTN'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  // ... 150+ more lines
})
```

### After (21 lines)
```javascript
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - PTN',
  NormalUpdateTestGenerator.generateTestSuite('PTN')
)
```

**Reduction**: 87%

---

**Last Updated**: 2026-01-24
**Generator Version**: 1.0.0
**Supports**: 9 components (6 patterns + 3 engines)
