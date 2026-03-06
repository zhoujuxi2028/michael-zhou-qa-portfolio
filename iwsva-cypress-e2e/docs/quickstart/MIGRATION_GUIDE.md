# Legacy Test Migration Guide

**Purpose**: Guide for migrating legacy Cypress tests to the IWSVA enterprise framework

**Based on**: verify_kernel_version.cy.js refactoring (successful template)

**Framework**: IWSVA Cypress Test Framework v1.0

---

## Table of Contents

1. [Overview](#overview)
2. [When to Migrate](#when-to-migrate)
3. [Migration Checklist](#migration-checklist)
4. [Step-by-Step Process](#step-by-step-process)
5. [Common Patterns](#common-patterns)
6. [Before & After Examples](#before--after-examples)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

This guide provides a **proven process** for migrating legacy Cypress tests to follow the IWSVA enterprise framework standards.

### What is a "Legacy Test"?

A legacy test typically has:
- ❌ Inline helper functions
- ❌ Hardcoded values (URLs, timeouts, selectors)
- ❌ Direct Cypress commands in test files
- ❌ No Page Object Model
- ❌ Mixed concerns (navigation + assertion in same place)
- ❌ Limited documentation

### What is an "Enterprise Framework Test"?

An enterprise test has:
- ✅ Page Object Model pattern
- ✅ 3-step test structure (Initialize → Trigger → Verify)
- ✅ Workflow integration
- ✅ Centralized configuration
- ✅ No hardcoded values
- ✅ Comprehensive documentation

---

## When to Migrate

### Migrate When:

✅ Test has inline helper functions
✅ Test uses hardcoded waits (`cy.wait(2000)`)
✅ Test has direct element interactions (`cy.get('input').type(...)`)
✅ Test duplicates code from other tests
✅ Test is difficult to maintain
✅ You're adding new features to the test
✅ Test fails frequently due to selector changes

### Don't Migrate If:

⏸️ Test is already framework-compliant
⏸️ Test is temporary/experimental
⏸️ Test will be deleted soon
⏸️ You don't have time to do it properly

**Rule of Thumb**: If you're touching a legacy test for any reason, migrate it to the framework.

---

## Migration Checklist

Use this checklist for each test migration:

### Phase 1: Analysis (30 minutes)

- [ ] Read the legacy test completely
- [ ] Identify what pages are being tested
- [ ] List all selectors used
- [ ] Note any hardcoded values
- [ ] Identify inline helper functions
- [ ] Understand test scenarios covered

### Phase 2: Planning (30 minutes)

- [ ] Decide if Page Object exists or needs creation
- [ ] Identify which workflows to use
- [ ] Plan test case breakdown (how many test cases needed)
- [ ] Identify configuration values to add
- [ ] Plan selector organization

### Phase 3: Implementation (2-4 hours)

- [ ] Create/update Page Object (if needed)
- [ ] Add selectors to test-constants.js
- [ ] Add URLs to test-config.js
- [ ] Refactor test file using Page Objects
- [ ] Apply 3-step test structure
- [ ] Remove all inline functions
- [ ] Add comprehensive JSDoc comments

### Phase 4: Verification (30 minutes)

- [ ] Run tests locally
- [ ] Verify all test cases pass
- [ ] Check code quality (ESLint)
- [ ] Review JSDoc completeness
- [ ] Create documentation
- [ ] Git commit with descriptive message

**Total Time**: ~4-5 hours for typical test

---

## Step-by-Step Process

### Step 1: Identify Page Interactions

**Goal**: Find all page interactions in the legacy test

**Actions**:
```javascript
// In legacy test, look for:
cy.get(...)           // Element access
cy.click()            // Interactions
cy.type()             // Input
cy.contains()         // Text finding
cy.visit()            // Navigation
```

**Output**: List of all page interactions

**Example**:
```
Legacy test has:
- Navigate to login page
- Fill username field
- Fill password field
- Click login button
- Navigate to settings
- Click update button
```

---

### Step 2: Create or Update Page Object

**Goal**: Encapsulate page interactions in Page Object

**Decision Tree**:
```
Does Page Object exist for this page?
├─ YES → Update existing Page Object
└─ NO  → Create new Page Object
```

**Creating New Page Object**:

```javascript
/**
 * [PageName] Page Object
 *
 * Brief description of the page and its purpose.
 *
 * @class PageNamePage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class PageNamePage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.pageNamePage
  }

  /**
   * Navigate to page
   */
  navigate() {
    cy.log('Navigating to [PageName] page')
    this.visit(this.pageUrl)
    this.waitForPageLoad()
    cy.log('✓ [PageName] page loaded')
  }

  /**
   * Verify page is loaded
   */
  verifyPageLoaded() {
    // Add verification logic
    cy.get(TestConstants.SELECTORS.pageName.mainElement)
      .should('be.visible')
  }

  // Add specific methods for this page
}

export default PageNamePage
```

**File Location**: `cypress/support/pages/PageNamePage.js`

---

### Step 3: Extract Selectors to Constants

**Goal**: Move all selectors to centralized location

**Process**:

1. Find all selectors in legacy test:
```javascript
// Legacy test
cy.get('input[name="username"]')
cy.get('#submit-button')
cy.get('.error-message')
```

2. Add to `test-constants.js`:
```javascript
// cypress/fixtures/test-constants.js

SELECTORS: {
  // ... existing selectors ...

  pageName: {
    usernameInput: 'input[name="username"]',
    submitButton: '#submit-button',
    errorMessage: '.error-message',
  },
}
```

3. Use in Page Object:
```javascript
// Page Object
cy.get(TestConstants.SELECTORS.pageName.usernameInput)
```

---

### Step 4: Extract Configuration Values

**Goal**: Move hardcoded values to configuration

**Find Hardcoded Values**:
```javascript
// Legacy test - BAD
cy.wait(2000)
cy.visit('https://10.206.201.9:8443/page.jsp')
const timeout = 30000
```

**Add to Configuration**:
```javascript
// cypress/fixtures/test-config.js

timeouts: {
  // ... existing timeouts ...
  customOperation: 30000,
},

urls: {
  // ... existing URLs ...
  pageNamePage: '/jsp/page.jsp',
}
```

**Use in Code**:
```javascript
// Page Object - GOOD
cy.wait(TestConfig.timeouts.elementInteraction)
this.visit(TestConfig.urls.pageNamePage)
```

---

### Step 5: Refactor Test Structure

**Goal**: Apply 3-step test structure

**Pattern**:
```javascript
describe('Test Category', () => {
  let pageObject
  let setupWorkflow

  beforeEach(() => {
    pageObject = new PageNamePage()
    setupWorkflow = new SetupWorkflow()
  })

  describe('TC-XXX-001: Test Case Name', () => {
    // Step 1: Initialize
    it('Step 1: Initialize test environment', () => {
      setupWorkflow.login()
      // Additional setup if needed
    })

    // Step 2: Trigger action
    it('Step 2: Trigger [operation]', () => {
      pageObject.navigate()
      pageObject.performAction()
    })

    // Step 3: Verify results
    it('Step 3: Verify [expected outcome]', () => {
      pageObject.verifyExpectedState()
      // Additional verification
    })
  })
})
```

---

### Step 6: Remove Inline Functions

**Goal**: Replace all inline helpers with Page Object methods

**Before**:
```javascript
// Legacy test - BAD
const login = () => {
  cy.visit('/login')
  cy.get('input[name="user"]').type('admin')
  cy.get('input[name="pass"]').type('password')
  cy.get('button').click()
}

it('should login', () => {
  login()
})
```

**After**:
```javascript
// Refactored test - GOOD
import SetupWorkflow from '../support/workflows/SetupWorkflow'

const setupWorkflow = new SetupWorkflow()

it('should login', () => {
  setupWorkflow.login()
})
```

---

### Step 7: Add Documentation

**Goal**: Add comprehensive JSDoc comments

**File-level Documentation**:
```javascript
/**
 * [Test Suite Name]
 *
 * Description of what this test suite covers.
 *
 * Test Coverage:
 * - Feature A
 * - Feature B
 * - Feature C
 *
 * Dependencies:
 * - PageObject1
 * - PageObject2
 * - Workflow1
 *
 * @category CategoryName
 * @priority P0|P1|P2|P3
 * @requires IWSVA 5.0+
 */
```

**Test Case Documentation**:
```javascript
/**
 * Test Case: TC-XXX-001
 * Brief description of test case
 *
 * Test Steps:
 * 1. Step one description
 * 2. Step two description
 * 3. Step three description
 */
describe('TC-XXX-001: Test Case Name', () => {
  // ... test implementation
})
```

---

## Common Patterns

### Pattern 1: Login Migration

**Before** (Inline function):
```javascript
const login = (username, password) => {
  cy.visit('/login.jsp')
  cy.wait(2000)
  cy.get('input[type="text"]').first().type(username)
  cy.get('input[type="password"]').first().type(password)
  cy.get('input[type="submit"]').click()
  cy.wait(3000)
}
```

**After** (Workflow):
```javascript
import SetupWorkflow from '../support/workflows/SetupWorkflow'

const setupWorkflow = new SetupWorkflow()
setupWorkflow.login()  // Uses framework-standard login
```

**Benefits**:
- ✅ No hardcoded waits
- ✅ Centralized login logic
- ✅ Consistent across all tests

---

### Pattern 2: Navigation Migration

**Before** (Direct navigation):
```javascript
const navigateToSettings = () => {
  cy.get('a').contains('Settings').click()
  cy.wait(2000)
  cy.url().should('include', '/settings')
}
```

**After** (Page Object):
```javascript
// In SettingsPage.js
navigate() {
  cy.log('Navigating to Settings page')
  this.visit(TestConfig.urls.settingsPage)
  this.waitForPageLoad()
  this.verifyPageLoaded()
}

// In test
const settingsPage = new SettingsPage()
settingsPage.navigate()
```

**Benefits**:
- ✅ Reusable across tests
- ✅ Built-in verification
- ✅ Framework-managed timeouts

---

### Pattern 3: Element Interaction Migration

**Before** (Direct interaction):
```javascript
cy.get('#username-field').clear().type('admin')
cy.get('#password-field').clear().type('pass123')
cy.get('button.submit').click()
```

**After** (Page Object method):
```javascript
// In Page Object
fillLoginForm(username, password) {
  cy.log(`Filling login form for: ${username}`)

  cy.get(TestConstants.SELECTORS.login.usernameInput)
    .should('be.visible')
    .clear()
    .type(username)

  cy.get(TestConstants.SELECTORS.login.passwordInput)
    .should('be.visible')
    .clear()
    .type(password, { log: false })  // Don't log password

  cy.log('✓ Login form filled')
}

// In test
loginPage.fillLoginForm('admin', 'pass123')
```

**Benefits**:
- ✅ Password security (not logged)
- ✅ Visibility verification
- ✅ Clear logging

---

### Pattern 4: Verification Migration

**Before** (Inline assertion):
```javascript
cy.get('.version-display').then($el => {
  expect($el.text()).to.include('5.14.0')
})
```

**After** (Page Object method):
```javascript
// In Page Object
verifyVersion(expectedVersion) {
  cy.log(`Verifying version: ${expectedVersion}`)

  cy.get(TestConstants.SELECTORS.version.display)
    .should('be.visible')
    .invoke('text')
    .then(text => {
      expect(text.trim()).to.include(expectedVersion)
      cy.log(`✓ Version verified: ${expectedVersion}`)
    })
}

// In test
page.verifyVersion('5.14.0')
```

**Benefits**:
- ✅ Reusable verification
- ✅ Clear logging
- ✅ Consistent pattern

---

### Pattern 5: Frame Handling Migration

**Before** (Manual frame access):
```javascript
const getFrameDoc = (frameName) => {
  return cy.window().then(win => {
    const frame = win.document.querySelector(`frame[name="${frameName}"]`)
    return frame.contentDocument
  })
}

getFrameDoc('right').then(doc => {
  const text = doc.body.textContent
  expect(text).to.include('something')
})
```

**After** (Page Object method):
```javascript
// In Page Object (if dealing with frames)
getFrameDoc(frameName) {
  return cy.window().then(win => {
    const frame = win.document.querySelector(`frame[name="${frameName}"]`)

    if (!frame) {
      throw new Error(`Frame '${frameName}' not found`)
    }

    const frameDoc = frame.contentDocument || frame.contentWindow.document

    if (!frameDoc) {
      throw new Error(`Cannot access content of frame '${frameName}'`)
    }

    return cy.wrap(frameDoc)
  })
}

// In test
systemUpdatePage.getFrameDoc('right').then(doc => {
  expect(doc.body.textContent).to.include('something')
})
```

**Benefits**:
- ✅ Error handling
- ✅ Reusable
- ✅ Clear error messages

---

## Before & After Examples

### Example 1: Simple Test Migration

**Before** (Legacy):
```javascript
describe('Login Test', () => {
  it('should login successfully', () => {
    cy.visit('https://10.206.201.9:8443/login.jsp')
    cy.wait(2000)

    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').click()

    cy.wait(3000)
    cy.url().should('include', 'index.jsp')
  })
})
```

**After** (Enterprise):
```javascript
/**
 * Login Tests
 *
 * Verifies user authentication functionality
 *
 * @category Authentication
 * @priority P0
 */

import SetupWorkflow from '../support/workflows/SetupWorkflow'
import TestConfig from '../fixtures/test-config'

describe('Login Tests', () => {
  let setupWorkflow

  beforeEach(() => {
    setupWorkflow = new SetupWorkflow()
  })

  describe('TC-AUTH-001: Successful Login', () => {
    it('Step 1: Navigate to login page', () => {
      cy.visit(TestConfig.urls.loginPage, {
        timeout: TestConfig.timeouts.pageLoad
      })
    })

    it('Step 2: Perform login', () => {
      setupWorkflow.login()
    })

    it('Step 3: Verify successful login', () => {
      cy.url({ timeout: TestConfig.timeouts.pageLoad })
        .should('not.include', '/login.jsp')
        .and('include', 'index.jsp')

      cy.log('✓ Login successful')
    })
  })
})
```

**Improvements**:
- ✅ No hardcoded URLs or timeouts
- ✅ Uses SetupWorkflow for login
- ✅ 3-step structure
- ✅ Documentation added
- ✅ Clear logging

---

### Example 2: Complex Test Migration

**Before** (Legacy - 50 lines):
```javascript
describe('Update Test', () => {
  const getFrame = (name) => {
    return cy.window().then(win => {
      return win.document.querySelector(`frame[name="${name}"]`).contentDocument
    })
  }

  const login = () => {
    cy.visit('https://10.206.201.9:8443/')
    cy.wait(2000)
    cy.get('input[type="text"]').type('admin')
    cy.get('input[type="password"]').type('111111')
    cy.get('input[type="submit"]').click()
    cy.wait(5000)
  }

  const navigateToUpdate = () => {
    getFrame('left').then(doc => {
      const links = doc.querySelectorAll('a')
      for (let link of links) {
        if (link.textContent.includes('Update')) {
          link.click()
          break
        }
      }
    })
    cy.wait(3000)
  }

  it('should update component', () => {
    login()
    navigateToUpdate()

    getFrame('right').then(doc => {
      const radio = doc.querySelector('input[value="PTN"]')
      radio.click()
    })

    cy.wait(1000)

    getFrame('right').then(doc => {
      doc.querySelector('input[name="update"]').click()
    })

    cy.wait(60000)

    getFrame('right').then(doc => {
      expect(doc.body.textContent).to.include('Success')
    })
  })
})
```

**After** (Enterprise - cleaner, more maintainable):
```javascript
/**
 * Component Update Tests
 *
 * Verifies component update functionality
 *
 * @category Update
 * @priority P0
 */

import ManualUpdatePage from '../support/pages/ManualUpdatePage'
import UpdateProgressPage from '../support/pages/UpdateProgressPage'
import SetupWorkflow from '../support/workflows/SetupWorkflow'
import UpdateWorkflow from '../support/workflows/UpdateWorkflow'

describe('Component Update Tests', () => {
  let manualUpdatePage
  let updateProgressPage
  let setupWorkflow
  let updateWorkflow

  beforeEach(() => {
    manualUpdatePage = new ManualUpdatePage()
    updateProgressPage = new UpdateProgressPage()
    setupWorkflow = new SetupWorkflow()
    updateWorkflow = new UpdateWorkflow()
  })

  describe('TC-UPD-001: Normal Component Update', () => {
    const COMPONENT_ID = 'PTN'

    it('Step 1: Initialize test environment', () => {
      setupWorkflow.login()
      manualUpdatePage.navigate()
      manualUpdatePage.verifyAllComponentsDisplayed()
    })

    it('Step 2: Trigger component update', () => {
      manualUpdatePage.selectComponent(COMPONENT_ID)
      manualUpdatePage.clickUpdate()
      manualUpdatePage.waitForUpdateRedirect()
    })

    it('Step 3: Verify update completion', () => {
      updateProgressPage.waitForUpdateComplete(COMPONENT_ID)
      updateProgressPage.verifyUpdateSuccess()
    })
  })
})
```

**Improvements**:
- ✅ Reduced from 50+ to 30 lines
- ✅ No inline functions
- ✅ No hardcoded waits
- ✅ Uses Page Objects and Workflows
- ✅ Much more readable
- ✅ Fully reusable
- ✅ Easier to maintain

---

## Troubleshooting

### Issue: "Can't find Page Object"

**Symptom**: Import error for Page Object

**Solution**:
```javascript
// Check import path
import PageName from '../support/pages/PageName'  // ✅ Correct
import PageName from './pages/PageName'           // ❌ Wrong path

// Ensure file exists
ls cypress/support/pages/PageName.js

// Check export in Page Object
export default PageName  // ✅ Required at end of file
```

---

### Issue: "Selector not found"

**Symptom**: `Expected to find element: ...`

**Solution**:
```javascript
// 1. Verify selector in test-constants.js
console.log(TestConstants.SELECTORS.pageName.element)

// 2. Inspect actual page to get correct selector
// Use browser DevTools (F12) → Elements

// 3. Update test-constants.js with correct selector
pageName: {
  element: 'correct-selector-here',
}
```

---

### Issue: "Timeout waiting for page"

**Symptom**: `Timed out retrying after 60000ms`

**Solution**:
```javascript
// 1. Use appropriate timeout from TestConfig
TestConfig.timeouts.pageLoad      // For page loads
TestConfig.timeouts.defaultCommand // For commands

// 2. Increase timeout if operation is legitimately slow
cy.get(selector, { timeout: TestConfig.timeouts.longTimeout })

// 3. Add wait for specific condition
page.waitForLoadingComplete()
```

---

### Issue: "Test fails after migration"

**Symptom**: Test passed before migration, fails after

**Solution**:
```javascript
// 1. Run original test to confirm it still works
git stash  // Temporarily revert changes
npm test   // Run original test

// 2. Compare selector differences
// Original: cy.get('input').first()
// Migrated: cy.get(TestConstants.SELECTORS.login.usernameInput)

// 3. Ensure selectors match reality
// Use browser DevTools to inspect actual page

// 4. Check timeout values
// Original might have had longer implicit waits

// 5. Add debugging
cy.log('Current URL:', window.location.href)
cy.screenshot('debug-state')
```

---

## Best Practices

### ✅ DO

1. **Read the original test completely** before starting
2. **Test incrementally** - migrate one feature at a time
3. **Run tests frequently** during migration
4. **Keep original test** until migration is verified
5. **Document as you go** - add JSDoc comments
6. **Use existing Page Objects** when possible
7. **Follow naming conventions** consistently
8. **Add verification** at each step
9. **Take screenshots** for documentation
10. **Commit frequently** with descriptive messages

### ❌ DON'T

1. **Don't rush** - take time to understand the test
2. **Don't skip documentation** - future you will thank you
3. **Don't hardcode values** - use TestConfig and TestConstants
4. **Don't duplicate code** - create reusable methods
5. **Don't ignore failing tests** - fix issues immediately
6. **Don't mix patterns** - stay consistent with framework
7. **Don't commit broken tests** - ensure all pass first
8. **Don't forget error handling** - add proper error messages
9. **Don't skip verification** - test the migrated code
10. **Don't leave TODOs** - finish what you start

---

## Migration Templates

### Template 1: Basic Test Migration

```javascript
/**
 * [Test Suite Name]
 *
 * [Description]
 *
 * @category [Category]
 * @priority P[0-3]
 */

import PageObject from '../support/pages/PageObject'
import SetupWorkflow from '../support/workflows/SetupWorkflow'

describe('[Test Suite Name]', () => {
  let pageObject
  let setupWorkflow

  beforeEach(() => {
    pageObject = new PageObject()
    setupWorkflow = new SetupWorkflow()
  })

  describe('TC-XXX-001: [Test Case Name]', () => {
    it('Step 1: Initialize test environment', () => {
      // Setup
    })

    it('Step 2: [Action]', () => {
      // Trigger
    })

    it('Step 3: Verify [outcome]', () => {
      // Verify
    })
  })
})
```

### Template 2: Page Object Creation

```javascript
/**
 * [Page Name] Page Object
 *
 * [Description]
 *
 * @class PageNamePage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class PageNamePage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.pageNamePage
  }

  navigate() {
    cy.log('Navigating to [Page Name]')
    this.visit(this.pageUrl)
    this.waitForPageLoad()
  }

  verifyPageLoaded() {
    cy.get(TestConstants.SELECTORS.pageName.mainElement)
      .should('be.visible')
  }

  // Add page-specific methods here
}

export default PageNamePage
```

---

## Success Metrics

Track these metrics to measure migration success:

### Code Quality Metrics
- ✅ Lines of code (should decrease or stay same)
- ✅ Code duplication (should be 0%)
- ✅ Hardcoded values (should be 0)
- ✅ Test execution time (should not increase significantly)

### Framework Compliance
- ✅ Page Object Model used: Yes/No
- ✅ 3-step structure followed: Yes/No
- ✅ Workflows integrated: Yes/No
- ✅ Configuration centralized: Yes/No
- ✅ Documentation complete: Yes/No

### Test Quality
- ✅ All original test cases covered: Yes/No
- ✅ Tests pass consistently: Yes/No
- ✅ Error messages are clear: Yes/No
- ✅ Tests are maintainable: Yes/No

**Goal**: 100% on all metrics

---

## Summary

### Migration Process (Quick Reference)

1. **Analyze** - Understand legacy test (30 min)
2. **Plan** - Design migration approach (30 min)
3. **Create Page Object** - If needed (1-2 hours)
4. **Extract Selectors** - Add to test-constants.js (30 min)
5. **Extract Config** - Add to test-config.js (15 min)
6. **Refactor Test** - Apply 3-step structure (1-2 hours)
7. **Document** - Add JSDoc comments (30 min)
8. **Verify** - Run and validate tests (30 min)
9. **Commit** - Save changes to Git (15 min)

**Total**: ~4-5 hours per test

### Success Criteria

- ✅ Zero inline functions
- ✅ Zero hardcoded values
- ✅ Page Object Model applied
- ✅ 3-step structure followed
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Code committed

---

## Resources

- **Example Migration**: `verify_kernel_version.cy.js` (REFACTORING_SUMMARY.md)
- **Page Object Template**: `SystemUpdatePage.js`
- **Framework Guide**: `CLAUDE.md`
- **API Reference**: `SYSTEM_UPDATE_PAGE_GUIDE.md`

---

**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Based On**: verify_kernel_version.cy.js refactoring
**Framework**: IWSVA Cypress Test Framework
