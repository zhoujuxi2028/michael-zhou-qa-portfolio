# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a QA portfolio project containing Cypress E2E test automation for Trend Micro IWSVA (InterScan Web Security Virtual Appliance). The project demonstrates comprehensive test automation architecture and professional QA documentation practices.

**Primary focus**: IWSVA Update Module testing with 77 automated test cases covering 9 patterns and 3 engines.

## Project Structure

```
michael-zhou-qa-portfolio/
└── cypress-tests/               # Main Cypress test project
    ├── cypress/
    │   ├── e2e/                # Test specifications
    │   │   ├── 01-normal-update/      # Normal update tests (Phase 4)
    │   │   └── verify_kernel_version.cy.js  # Original kernel verification test
    │   ├── support/            # Test framework
    │   │   ├── pages/          # Page Object Models
    │   │   ├── workflows/      # Test workflow orchestrators
    │   │   ├── verification/   # Verification helpers
    │   │   ├── factories/      # Factory pattern classes
    │   │   ├── setup/          # Test setup utilities
    │   │   └── commands.js     # Custom Cypress commands
    │   └── fixtures/           # Test data and configuration
    │       ├── ComponentRegistry.js       # Component metadata (9 components)
    │       ├── component-test-versions.json
    │       ├── test-scenarios.json
    │       ├── test-config.js
    │       └── test-constants.js
    ├── docs/
    │   ├── test-cases/         # Test case documentation
    │   ├── test-plans/         # Test plans and strategy
    │   └── project-planning/   # WBS and project docs
    ├── archive/                # Old test files
    └── cypress.config.js       # Cypress configuration
```

## Key Commands

### Running Tests

```bash
# Navigate to test directory
cd cypress-tests

# Install dependencies
npm install

# Run all tests (headless)
npm run cypress:run

# Run specific test file
npm test  # Runs verify_kernel_version.cy.js
npm run test:headed  # With visible browser (Firefox)

# Run with specific browser
npm run test:firefox

# Open Cypress Test Runner (interactive)
npm run cypress:open
```

### Development Workflow

```bash
# Run single test file during development
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-ptn.cy.js"

# Run with browser visible (headed mode)
npx cypress run --spec "cypress/e2e/01-normal-update/*.cy.js" --headed --browser firefox

# Run tests matching pattern
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-*.cy.js"
```

## Architecture Overview

### Test Framework Design

The project uses a **layered architecture** with clear separation of concerns:

1. **Test Layer** (`cypress/e2e/`)
   - Test specifications organized by test category
   - Each test follows a 3-step structure: Initialize → Trigger → Verify
   - Import and orchestrate workflows, not direct page interactions

2. **Workflow Layer** (`cypress/support/workflows/`)
   - `UpdateWorkflow.js` - Orchestrates complete update operations
   - `SetupWorkflow.js` - Test environment preparation
   - `VerificationWorkflow.js` - Multi-level verification orchestration
   - `CleanupWorkflow.js` - Test cleanup and state restoration

3. **Page Object Layer** (`cypress/support/pages/`)
   - `ManualUpdatePage.js` - Manual update page interactions
   - `UpdateProgressPage.js` - Progress monitoring
   - `SchedulePage.js` - Schedule configuration
   - `ProxyPage.js` - Proxy settings
   - `BasePage.js` - Common page functionality

4. **Data Layer** (`cypress/fixtures/`)
   - `ComponentRegistry.js` - Centralized component metadata (9 components)
   - `test-config.js` - Test execution configuration
   - `test-constants.js` - Reusable constants and selectors
   - `test-scenarios.json` - Data-driven test scenarios

### Component Registry System

The `ComponentRegistry.js` is the **single source of truth** for all component metadata:

```javascript
// Access component information
import ComponentRegistry from '../fixtures/ComponentRegistry'

const component = ComponentRegistry.getComponent('PTN')
// Returns: { id, name, category, iniSection, lockFile, updateTimeout, canRollback, ... }

const patterns = ComponentRegistry.getPatterns()  // Get all patterns
const engines = ComponentRegistry.getEngines()    // Get all engines
const p0 = ComponentRegistry.getByPriority('P0') // Get P0 components
```

**9 Components covered:**
- Patterns: PTN, SPYWARE, BOT, ITP, ITE, ICRCAGENT (6 total)
- Engines: ENG, ATSEENG, TMUFEENG (3 total)

**Key metadata per component:**
- Lock file paths for backend verification
- INI file keys for version checking
- Timeouts for update operations
- Rollback support flags (TMUFEENG cannot rollback)
- Service restart requirements

### Test Structure Pattern

All update tests follow this 3-step pattern:

```javascript
describe('Normal Update - PTN', () => {
  // Step 1: Initialize test environment
  it('Step 1: Initialize test environment', () => {
    setupWorkflow.setupForUpdateTests()
    TestDataSetup.createSnapshot()  // For restoration
    TestDataSetup.setupNormalUpdate(COMPONENT_ID)
  })

  // Step 2: Trigger update operation
  it('Step 2: Trigger update on page', () => {
    manualUpdatePage.navigate()
    manualUpdatePage.selectComponent(COMPONENT_ID)
    updateWorkflow.executeNormalUpdate(COMPONENT_ID, options)
  })

  // Step 3: Verify multi-level checks
  it('Step 3: Verify update completion (UI + Backend/Logs)', () => {
    // UI verification
    manualUpdatePage.verifyComponentVersion(COMPONENT_ID, version)

    // Backend verification
    BackendVerification.verifyINIVersion(COMPONENT_ID, version)
    BackendVerification.verifyComponentFiles(COMPONENT_ID)
    BackendVerification.verifyLockFile(COMPONENT_ID, false)

    // Log verification
    LogVerification.verifyLogEntryExists(COMPONENT_ID, 'update')
    LogVerification.verifyNoErrors(COMPONENT_ID)
  })
})
```

## IWSVA-Specific Considerations

### Frameset Architecture

IWSVA uses a **legacy frameset architecture**:

```
┌─────────────────────────────────────┐
│  tophead (navigation bar)           │
├──────────┬──────────────────────────┤
│  left    │  right                   │
│  (menu)  │  (content)               │
└──────────┴──────────────────────────┘
```

**Accessing frames:**
```javascript
// From BasePage.getFrameDoc()
const frameDoc = doc.querySelector('frame[name="left"]').contentDocument
```

### CSRF Token Handling

**Important**: The application **automatically handles CSRF tokens** via URL parameters after login.

- Login page requires NO explicit token
- After login, token appears in URL: `?CSRFGuardToken=XXXXX`
- All navigation links include the token automatically
- **Only need explicit token handling if:**
  - Making direct `cy.request()` API calls
  - Bypassing menu navigation with `cy.visit()`
  - Submitting forms programmatically

See `CSRF_TOKEN_EXPLAINED.md` for detailed explanation.

### SSL Certificate Handling

Self-signed certificates are handled in `cypress.config.js`:
- `chromeWebSecurity: false`
- `NODE_TLS_REJECT_UNAUTHORIZED = '0'`
- Chrome launch args include `--ignore-certificate-errors`

## Configuration Files

### cypress.env.json (gitignored)

Credentials and environment config (never committed):

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "111111",
  "targetKernelVersion": "5.14.0-427.24.1.el9_4.x86_64"
}
```

**Setup**: Copy `cypress.env.json.example` to `cypress.env.json`

### cypress.config.js

Key settings:
- `baseUrl`: Default IWSVA server URL
- `chromeWebSecurity: false` - For SSL certificates
- Custom tasks: `writeToFile`, `log`
- Browser launch options for certificate handling

## Development Project Phases

The project follows an **11-phase Work Breakdown Structure** (see `docs/project-planning/WBS.md`):

**Completed Phases:**
- ✅ **Phase 1**: Documentation Layer (12 files) - Test cases, plans, strategy
- ✅ **Phase 2**: Test Data Configuration (6 files) - ComponentRegistry, test scenarios
- ✅ **Phase 3**: Test Framework Core (16 files) - Pages, workflows, factories
- ✅ **Phase 4**: Normal Update Tests (8 files) - In progress

**Pending Phases (Phase 5-11):**
- Phase 5: Forced Update & Rollback Tests (15 files)
- Phase 6: Update All & UI Tests (15 files)
- Phase 7: Error Handling Tests (13 files)
- Phase 8: Schedule, Proxy, Performance Tests (3 files)
- Phase 9: Cypress Plugins & Tasks (4 files)
- Phase 10: Reporting & CI/CD Integration (4 files)
- Phase 11: Configuration & Documentation Updates (3 files)

**Total**: 89 files, 77 test cases across 11 categories.

## Documentation

### Key Documentation Files

**Root Level:**
- `README.md` - Original kernel verification test docs
- `UPDATE_MODULE_README.md` - Update module overview
- `TEST_CASES_README.md` - Quick test case guide
- `CSRF_TOKEN_EXPLAINED.md` - CSRF token details
- `IWSVA_TEST_GUIDE.md` - Comprehensive Cypress learning guide

**Test Cases (`docs/test-cases/`):**
- `UPDATE_TEST_CASES.md` - All 77 test cases documented
- `test-case-mapping.json` - Machine-readable test metadata
- `traceability-matrix.md` - Requirements to test case mapping
- `test-data-dictionary.md` - Test data definitions
- `verification-checklist.md` - Multi-level verification guide

**Test Plans (`docs/test-plans/`):**
- `IWSVA-Update-Test-Plan.md` - Complete test plan
- `Test-Strategy.md` - High-level test strategy

**Project Planning (`docs/project-planning/`):**
- `WBS.md` - Work Breakdown Structure with 11 phases

## Test Patterns & Best Practices

### Page Object Model Usage

Always import and use page objects, never interact with elements directly in tests:

```javascript
// ✅ GOOD - Use Page Object
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
const page = new ManualUpdatePage()
page.selectComponent('PTN')

// ❌ BAD - Direct element interaction
cy.get('input[name="component"]').click()
```

### Workflow Orchestration

Use workflows for multi-step operations:

```javascript
// ✅ GOOD - Use workflow
updateWorkflow.executeNormalUpdate(componentId, {
  verifyBefore: true,
  verifyAfter: true
})

// ❌ BAD - Manual orchestration in test
page.selectComponent(componentId)
page.clickUpdate()
progressPage.waitForComplete()
```

### Component Registry Access

Always use ComponentRegistry for component metadata:

```javascript
// ✅ GOOD - Use registry
const component = ComponentRegistry.getComponent('PTN')
if (component.canRollback) { /* ... */ }

// ❌ BAD - Hardcoded values
if (componentId === 'PTN' || componentId === 'ENG') { /* ... */ }
```

### Multi-Level Verification

Tests should verify across all levels:

1. **UI Level** - Page displays correct version
2. **Backend Level** - INI files, pattern files, lock files
3. **Log Level** - Update logs show success
4. **Business Level** - Functionality works after update

## Common Issues & Solutions

### Missing Credentials
Error: "Credentials not found!"
Solution: Copy `cypress.env.json.example` to `cypress.env.json` and configure

### Frame Access Issues
Issue: Cannot access frame content
Solution: Use `BasePage.getFrameDoc(frameName)` helper method

### CSRF Token Errors
Issue: 403 Forbidden errors
Solution: Let frame navigation handle tokens automatically; only extract manually for direct API calls

### SSL Certificate Errors
Issue: Certificate validation failures
Solution: Already handled in cypress.config.js; use Firefox browser for best results

### Test Timeouts
Issue: Update operations timing out
Solution: Component-specific timeouts defined in ComponentRegistry (e.g., ENG: 12 minutes)

## Git Workflow

### Commit Strategy

After completing each phase, create a commit:

```bash
git add .
git commit -m "feat: Complete Phase N - [Phase Name]

[Description]

Files created:
- file1
- file2

Phase N of 11 complete"
```

### Current Status

- Main branch: `main`
- Latest commit: Phase 4 work in progress
- Modified file: `cypress-tests/cypress/e2e/01-normal-update/normal-update-ptn.cy.js`

## Test Execution Notes

### Test Environment Requirements

- IWSVA server accessible at configured baseURL
- Admin credentials in cypress.env.json
- Components available for update (or test versions prepared)
- Network access to update server (for some tests)

### Test Data Setup

Some tests require component version manipulation:
- Downgrade to previous version (for update tests)
- Ensure current version available on update server
- Backup versions available (for rollback tests)

See `TestDataSetup` class in `cypress/support/setup/TestDataSetup.js`

### Parallel Execution Considerations

Tests that modify component state should run sequentially:
- Downgrade/upgrade operations
- Component-specific tests

Tests that can run in parallel:
- Different components
- Read-only verification tests
- UI interaction tests (different pages)

## Important Notes

- **Security**: Never commit `cypress.env.json` with actual credentials
- **Browsers**: Firefox recommended for IWSVA testing (better frame handling)
- **Timeouts**: Component updates can take 5-12 minutes; use appropriate timeouts
- **Rollback Restriction**: TMUFEENG (URL Filtering Engine) cannot rollback
- **Service Restarts**: Engine updates (ENG, ATSEENG, TMUFEENG) may require service restart
