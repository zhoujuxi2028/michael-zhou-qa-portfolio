# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a QA portfolio project containing Cypress E2E test automation for Trend Micro IWSVA (InterScan Web Security Virtual Appliance). The project demonstrates comprehensive test automation architecture and professional QA documentation practices.

**Primary focus**: IWSVA Update Module testing with 77 automated test cases covering 9 components (6 patterns + 3 engines).

## Key Commands

### Essential Setup

```bash
# Navigate to test directory
cd cypress-tests

# Install dependencies
npm install

# Configure environment (first time only)
cp cypress.env.json.example cypress.env.json
# Edit cypress.env.json with actual credentials
```

### Running Tests

```bash
# Run all tests (headless)
npm run cypress:run

# Run specific test file
npm test  # Runs verify_kernel_version.cy.js
npm run test:headed  # With visible browser (Firefox)

# Run with specific browser
npm run test:firefox

# Open Cypress Test Runner (interactive)
npm run cypress:open

# Run single test file during development
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-ptn.cy.js"

# Run with browser visible (headed mode)
npx cypress run --spec "cypress/e2e/01-normal-update/*.cy.js" --headed --browser firefox

# Run tests matching pattern
npx cypress run --spec "cypress/e2e/01-normal-update/normal-update-*.cy.js"
```

## Architecture Overview

### Layered Architecture

The project uses a **layered architecture** with clear separation of concerns:

```
Test Layer (cypress/e2e/)
    ↓ imports
Workflow Layer (cypress/support/workflows/)
    ↓ orchestrates
Page Object Layer (cypress/support/pages/)
    ↓ uses
Data Layer (cypress/fixtures/)
```

#### 1. Test Layer (`cypress/e2e/`)
- Test specifications organized by category (01-normal-update/, etc.)
- Each test follows **3-step structure**: Initialize → Trigger → Verify
- Tests import and orchestrate workflows, NOT direct page interactions

#### 2. Workflow Layer (`cypress/support/workflows/`)
- `UpdateWorkflow.js` - Orchestrates complete update operations
- `SetupWorkflow.js` - Test environment preparation
- `VerificationWorkflow.js` - Multi-level verification orchestration
- `CleanupWorkflow.js` - Test cleanup and state restoration

#### 3. Page Object Layer (`cypress/support/pages/`)
- `BasePage.js` - Common page functionality (login, frame handling, navigation)
- `ManualUpdatePage.js` - Manual update page interactions
- `UpdateProgressPage.js` - Progress monitoring
- `SchedulePage.js` - Schedule configuration
- `ProxyPage.js` - Proxy settings
- `SystemUpdatePage.js` - System Updates page (kernel version, frameset verification)

#### 4. Data Layer (`cypress/fixtures/`)
- `ComponentRegistry.js` - **Single source of truth** for component metadata
- `test-config.js` - Test execution configuration
- `test-constants.js` - Reusable constants and selectors
- `test-scenarios.json` - Data-driven test scenarios

### Component Registry System

**CRITICAL**: `ComponentRegistry.js` is the single source of truth for all component metadata.

```javascript
// Access component information
import ComponentRegistry from '../fixtures/ComponentRegistry'

const component = ComponentRegistry.getComponent('PTN')
// Returns: { id, name, category, iniSection, lockFile, updateTimeout, canRollback, ... }

const patterns = ComponentRegistry.getPatterns()  // Get all 6 patterns
const engines = ComponentRegistry.getEngines()    // Get all 3 engines
const p0 = ComponentRegistry.getByPriority('P0') // Get P0 components
```

**9 Components covered:**
- **Patterns (6)**: PTN, SPYWARE, BOT, ITP, ITE, ICRCAGENT
- **Engines (3)**: ENG, ATSEENG, TMUFEENG

**Key metadata per component:**
- Lock file paths for backend verification
- INI file keys for version checking
- Timeouts for update operations (5-12 minutes)
- Rollback support flags (TMUFEENG cannot rollback)
- Service restart requirements

### Test Structure Pattern

**IMPORTANT**: All update tests follow this consistent 3-step pattern:

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

IWSVA uses a **legacy frameset architecture** (not iframes):

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

See `docs/guides/CSRF_TOKEN_EXPLAINED.md` for detailed explanation.

### SSH Backend Operations

The project includes SSH-based backend operations for component downgrade and verification:

```javascript
// Downgrade a component to specific version
cy.task('downgradePattern', {
  componentId: 'PTN',
  targetVersion: '6.593.00',
  updateServerUrl: 'http://10.204.151.56/au/IWSVA5.0/old/',
  options: { restoreINI: true }
})

// Execute SSH command
cy.task('sshExec', {
  command: '/usr/iwss/bin/getupdate INFO'
})

// Read INI file
cy.task('readINIFile', {
  iniPath: '/etc/iscan/intscan.ini'
})
```

**SSH Configuration**: Add to `cypress.env.json`:
```json
{
  "ssh": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root",
    "password": "your-password"
  }
}
```

## Configuration Files

### cypress.env.json (gitignored)

Credentials and environment config (never committed):

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "111111",
  "ssh": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root",
    "password": "your-ssh-password"
  },
  "targetKernelVersion": "5.14.0-427.24.1.el9_4.x86_64"
}
```

**Setup**: Copy `cypress.env.json.example` to `cypress.env.json` and edit with actual credentials.

### cypress.config.js

Key settings:
- `baseUrl`: Default IWSVA server URL
- `chromeWebSecurity: false` - For self-signed SSL certificates
- Custom tasks registered via `registerTasks(on, config)`
- Browser launch options for certificate handling

## Development Project Phases

The project follows an **11-phase Work Breakdown Structure** (see `docs/project-planning/WBS.md`):

**Completed Phases:**
- ✅ **Phase 1**: Documentation Layer (12 files) - Test cases, plans, strategy
- ✅ **Phase 2**: Test Data Configuration (6 files) - ComponentRegistry, test scenarios
- ✅ **Phase 3**: Test Framework Core (16 files) - Pages, workflows, factories
- ✅ **Phase 4**: Normal Update Tests (8 files) - Currently in progress

**Pending Phases (Phase 5-11):**
- Phase 5: Forced Update & Rollback Tests (15 files)
- Phase 6: Update All & UI Tests (15 files)
- Phase 7: Error Handling Tests (13 files)
- Phase 8: Schedule, Proxy, Performance Tests (3 files)
- Phase 9: Cypress Plugins & Tasks (4 files)
- Phase 10: Reporting & CI/CD Integration (4 files)
- Phase 11: Configuration & Documentation Updates (3 files)

**Total**: 89 files, 77 test cases across 11 categories.

## Best Practices

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
**Error**: "Credentials not found!"
**Solution**: Copy `cypress.env.json.example` to `cypress.env.json` and configure

### Frame Access Issues
**Issue**: Cannot access frame content
**Solution**: Use `BasePage.getFrameDoc(frameName)` helper method

### CSRF Token Errors
**Issue**: 403 Forbidden errors
**Solution**: Let frame navigation handle tokens automatically; only extract manually for direct API calls

### SSL Certificate Errors
**Issue**: Certificate validation failures
**Solution**: Already handled in `cypress.config.js`; use Firefox browser for best results

### Test Timeouts
**Issue**: Update operations timing out
**Solution**: Component-specific timeouts defined in ComponentRegistry (e.g., ENG: 12 minutes)

### SSH Connection Failures
**Issue**: Cannot connect to IWSVA server
**Solution**: Verify SSH credentials in `cypress.env.json`, check network connectivity, ensure root access

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
- Latest commits: Phase 2, 3, 4 completed
- Current work: Phase 4 in progress (normal update tests)

## Documentation

**Complete Documentation Index**: See `docs/README.md` for navigation guide and file placement rules.

### Documentation Structure

The project uses an organized documentation structure to keep the root directory clean:

**Root Level (Core Only):**
- `README.md` - Main project README
- `CLAUDE.md` - This file (Claude Code instructions)

**Quick Start Guides (`docs/quickstart/`):**
- `DOWNGRADE_QUICKSTART.md` - Quick component downgrade guide
- `CONSOLIDATED_TESTS_QUICKSTART.md` - Running consolidated tests
- `MIGRATION_GUIDE.md` - Test migration guide

**Developer Guides (`docs/guides/`):**
- `IWSVA_TEST_GUIDE.md` - Comprehensive Cypress testing guide
- `TEST_GENERATOR_GUIDE.md` - Test generator usage
- `SYSTEM_UPDATE_PAGE_GUIDE.md` - SystemUpdatePage API reference
- `CSRF_TOKEN_EXPLAINED.md` - CSRF token handling details
- `TEST_CASES_README.md` - Quick test case reference
- `UPDATE_MODULE_README.md` - Update module overview
- `DOWNGRADE_GUIDE.md` - Complete downgrade documentation

**Reports & Summaries (`docs/reports/`):**
- `TEST_REPORT.md` - Test execution results
- `TEST_EXECUTION_REPORT.md` - Detailed execution report
- `CONSOLIDATION_SUMMARY.md` - Test consolidation summary
- `REFACTORING_SUMMARY.md` - Code refactoring summary
- `REFACTORING_COMPLETE.md` - Refactoring completion report
- `PHASE4_OPTIMIZATION_SUMMARY.md` - Phase 4 optimization details

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

**Chinese Documentation (`docs/zh-CN/`):**
- `会话恢复指南.md` - Session recovery guide

### Where to Place New Documentation

When creating new documentation files, follow these placement rules:

1. **Guides** (`docs/guides/`) - Technical how-to, API references, configuration docs
2. **Quick Start** (`docs/quickstart/`) - Getting started, setup tutorials, migration guides
3. **Reports** (`docs/reports/`) - Test reports, summaries, retrospectives, phase completions
4. **Test Cases** (`docs/test-cases/`) - Test specifications, scenarios, verification checklists
5. **Test Plans** (`docs/test-plans/`) - Test plans, strategies, QA approach
6. **Project Planning** (`docs/project-planning/`) - Roadmaps, WBS, architecture decisions
7. **Chinese Docs** (`docs/zh-CN/`) - All Chinese language documentation

See `docs/README.md` for detailed placement guidelines.

## Important Notes

- **Security**: Never commit `cypress.env.json` with actual credentials
- **Browsers**: Firefox recommended for IWSVA testing (better frame handling)
- **Timeouts**: Component updates can take 5-12 minutes; use appropriate timeouts from ComponentRegistry
- **Rollback Restriction**: TMUFEENG (URL Filtering Engine) cannot rollback
- **Service Restarts**: Engine updates (ENG, ATSEENG, TMUFEENG) may require service restart
- **SSH Access**: Backend verification and downgrade operations require SSH access with root privileges
