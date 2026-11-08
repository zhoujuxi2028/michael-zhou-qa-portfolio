# SystemUpdatePage - Usage Guide

## Overview

`SystemUpdatePage` is a Page Object class for interacting with IWSVA's System Updates page, which displays kernel version and system information. This page uses IWSVA's legacy frameset architecture with three frames: tophead (navigation), left (menu), and right (content).

**File**: `cypress/support/pages/SystemUpdatePage.js`
**Extends**: `BasePage`
**Framework**: IWSVA Cypress Test Framework

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [API Reference](#api-reference)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

---

## Quick Start

### Basic Usage

```javascript
import SystemUpdatePage from '../support/pages/SystemUpdatePage'

const systemUpdatePage = new SystemUpdatePage()

describe('System Updates Test', () => {
  it('should verify kernel version', () => {
    // Navigate to page
    systemUpdatePage.navigateToSystemUpdates()

    // Verify kernel version
    systemUpdatePage.verifyKernelVersion('5.14.0-427.24.1.el9_4.x86_64')

    // Verify frameset structure
    systemUpdatePage.verifyFrameStructure()
  })
})
```

### Complete Workflow

```javascript
import SystemUpdatePage from '../support/pages/SystemUpdatePage'
import SetupWorkflow from '../support/workflows/SetupWorkflow'

const systemUpdatePage = new SystemUpdatePage()
const setupWorkflow = new SetupWorkflow()

describe('Complete System Updates Workflow', () => {
  it('should execute full workflow', () => {
    // Step 1: Login
    setupWorkflow.login()

    // Step 2: Navigate and verify page
    systemUpdatePage.navigateAndVerify()

    // Step 3: Verify kernel version
    const targetVersion = Cypress.env('targetKernelVersion')
    systemUpdatePage.verifyKernelVersion(targetVersion)
  })
})
```

---

## Core Concepts

### IWSVA Frameset Architecture

IWSVA uses a **legacy frameset structure** (not iframes):

```
┌─────────────────────────────────────┐
│  tophead (navigation bar)           │
├──────────┬──────────────────────────┤
│  left    │  right                   │
│  (menu)  │  (content)               │
└──────────┴──────────────────────────┘
```

**Frame Names**:
- `tophead` - Top navigation bar
- `left` - Left sidebar menu
- `right` - Main content area

**Important**: Use `getFrameDoc()` method to access frame content, not Cypress's standard `iframe()` commands.

### Page Navigation Flow

```
Login → Main Page (with frames) → Click "Administration" → Click "System Updates" → Content loads in right frame
```

### Key Responsibilities

1. **Frame Handling** - Access and interact with framesets
2. **Navigation** - Menu-based navigation to System Updates
3. **Verification** - Kernel version and page structure validation
4. **Data Extraction** - Extract kernel version from page content

---

## API Reference

### Navigation Methods

#### `navigateToSystemUpdates()`

Navigate to System Updates page via menu.

**Signature**: `navigateToSystemUpdates(): void`

**Process**:
1. Waits for frames to load
2. Clicks "Administration" in left frame
3. Clicks "System Updates" link in left frame
4. Waits for content to load in right frame

**Example**:
```javascript
systemUpdatePage.navigateToSystemUpdates()
```

**Logs**:
- "=== Navigating to System Updates ==="
- "✓ Navigated to System Updates page"

---

#### `navigateAndVerify()`

Complete navigation workflow with verification.

**Signature**: `navigateAndVerify(): void`

**Process**:
1. Performs navigation
2. Verifies content loaded
3. Verifies frame structure

**Example**:
```javascript
// One-step navigation with built-in verification
systemUpdatePage.navigateAndVerify()
```

**Logs**:
- "=== Navigate and Verify System Updates Page ==="
- "✓ Navigation and verification complete"

---

### Frame Handling Methods

#### `getFrameDoc(frameName)`

Get frame document by frame name. Core method for accessing frame content.

**Signature**: `getFrameDoc(frameName: string): Cypress.Chainable<Document>`

**Parameters**:
- `frameName` - Frame name ('tophead', 'left', or 'right')

**Returns**: Cypress chainable containing frame document

**Throws**: Error if frame not found or inaccessible

**Example**:
```javascript
systemUpdatePage.getFrameDoc('right').then((frameDoc) => {
  const content = frameDoc.body.textContent
  expect(content).to.include('Kernel')
})
```

**Logs**:
- "Accessing frame: {frameName}"
- "✓ Frame '{frameName}' accessed"

---

#### `clickInFrameByText(frameName, textContent, tagName?)`

Click element in frame by exact text match.

**Signature**: `clickInFrameByText(frameName: string, textContent: string, tagName: string = '*'): void`

**Parameters**:
- `frameName` - Frame name
- `textContent` - Exact text to search for
- `tagName` - HTML tag name (optional, default: '*' for all tags)

**Example**:
```javascript
// Click "Administration" menu item
systemUpdatePage.clickInFrameByText('left', 'Administration')

// Click specific button
systemUpdatePage.clickInFrameByText('right', 'Apply', 'button')
```

**Logs**:
- "Clicking element with text \"{textContent}\" in {frameName} frame"
- "✓ Clicked: {textContent}"

**Throws**: Error if element with text not found

---

#### `clickLinkInFrame(frameName, searchText)`

Click link in frame by partial text match (case-insensitive).

**Signature**: `clickLinkInFrame(frameName: string, searchText: string): void`

**Parameters**:
- `frameName` - Frame name
- `searchText` - Text to search for (case-insensitive, partial match)

**Example**:
```javascript
// Click link containing "system update"
systemUpdatePage.clickLinkInFrame('left', 'system update')

// Case-insensitive search
systemUpdatePage.clickLinkInFrame('left', 'SYSTEM UPDATE')
```

**Logs**:
- "Clicking link containing \"{searchText}\" in {frameName} frame"
- "✓ Clicked link: {actual link text}"

**Throws**: Error if no matching link found

---

### Verification Methods

#### `verifyKernelVersion(expectedVersion)`

Verify kernel version is displayed on page.

**Signature**: `verifyKernelVersion(expectedVersion: string): void`

**Parameters**:
- `expectedVersion` - Expected kernel version string (e.g., '5.14.0-427.24.1.el9_4.x86_64')

**Example**:
```javascript
const targetVersion = '5.14.0-427.24.1.el9_4.x86_64'
systemUpdatePage.verifyKernelVersion(targetVersion)
```

**Logs**:
- "Verifying kernel version: {expectedVersion}"
- "✓ Kernel version verified: {expectedVersion}"

**Asserts**: Page content includes expected kernel version

---

#### `verifyFrameStructure()`

Verify IWSVA frameset structure (3 frames).

**Signature**: `verifyFrameStructure(): void`

**Validates**:
- Exactly 3 frames exist
- Required frames present: tophead, left, right

**Example**:
```javascript
systemUpdatePage.verifyFrameStructure()
```

**Logs**:
- "=== Verifying Frame Structure ==="
- "✓ Frame count: 3"
- "✓ All required frames present"

**Asserts**:
- Frame count === 3
- Frame names include 'tophead', 'left', 'right'

---

#### `verifyContentLoaded()`

Verify right frame has content loaded.

**Signature**: `verifyContentLoaded(): void`

**Example**:
```javascript
systemUpdatePage.verifyContentLoaded()
```

**Logs**:
- "Verifying content loaded in right frame"
- "✓ Content loaded in right frame"

**Asserts**:
- Right frame body exists
- Right frame body has content (length > 0)

---

#### `verifyKernelInfoDisplayed()`

Verify kernel/system information section is displayed.

**Signature**: `verifyKernelInfoDisplayed(): void`

**Example**:
```javascript
systemUpdatePage.verifyKernelInfoDisplayed()
```

**Logs**:
- "Verifying kernel information is displayed"
- "✓ Kernel information section found"

**Asserts**: Page content includes "kernel" or "system" text

---

#### `verifyPageTitle(expectedText?)`

Verify page title/heading contains expected text.

**Signature**: `verifyPageTitle(expectedText: string = 'System Update'): void`

**Parameters**:
- `expectedText` - Expected title text (default: 'System Update')

**Example**:
```javascript
systemUpdatePage.verifyPageTitle('System Update')
systemUpdatePage.verifyPageTitle('Kernel Information')
```

**Logs**:
- "Verifying page title contains: \"{expectedText}\""
- "✓ Page title verified"

---

### Data Extraction Methods

#### `getKernelVersion()`

Extract kernel version from page content.

**Signature**: `getKernelVersion(): Cypress.Chainable<string | null>`

**Returns**: Kernel version string or null if not found

**Example**:
```javascript
systemUpdatePage.getKernelVersion().then((version) => {
  if (version) {
    cy.log(`Found kernel version: ${version}`)
    expect(version).to.match(/\d+\.\d+\.\d+-\d+/)
  } else {
    cy.log('No kernel version found')
  }
})
```

**Logs**:
- "Getting kernel version from page"
- "✓ Kernel version found: {version}" (if found)
- "! Kernel version not found in page content" (if not found)

**Pattern**: Matches format like `5.14.0-427.24.1.el9_4.x86_64`

---

#### `getRightFrameContent()`

Get all text content from right frame.

**Signature**: `getRightFrameContent(): Cypress.Chainable<string>`

**Returns**: Frame body text content

**Example**:
```javascript
systemUpdatePage.getRightFrameContent().then((content) => {
  cy.log(`Content length: ${content.length} chars`)
  expect(content).to.include('Kernel')
})
```

---

#### `getFrameText(frameName)`

Get all text from specific frame.

**Signature**: `getFrameText(frameName: string): Cypress.Chainable<string>`

**Parameters**:
- `frameName` - Frame name

**Example**:
```javascript
systemUpdatePage.getFrameText('left').then((menuText) => {
  cy.log('Menu contains:', menuText)
})
```

**Logs**:
- "{frameName} frame content length: {length} chars"

---

### Utility Methods

#### `waitForFrame(frameName, timeout?)`

Wait for frame to load completely.

**Signature**: `waitForFrame(frameName: string, timeout: number = TestConfig.timeouts.pageLoad): void`

**Parameters**:
- `frameName` - Frame name
- `timeout` - Custom timeout in ms (default: 60000)

**Example**:
```javascript
systemUpdatePage.waitForFrame('right', 30000)
```

**Logs**:
- "Waiting for {frameName} frame to load..."
- "✓ {frameName} frame loaded"

**Asserts**: Frame document readyState === 'complete'

---

#### `capturePageState(name?)`

Take screenshot of current page state.

**Signature**: `capturePageState(name: string = 'system-updates-page'): void`

**Parameters**:
- `name` - Screenshot filename suffix

**Example**:
```javascript
systemUpdatePage.capturePageState('kernel-verification')
// Saves: cypress/screenshots/kernel-verification.png
```

**Logs**:
- "Taking screenshot: {name}"

---

#### `verifyElementInFrame(frameName, selector)`

Verify element exists in frame.

**Signature**: `verifyElementInFrame(frameName: string, selector: string): void`

**Parameters**:
- `frameName` - Frame name
- `selector` - CSS selector

**Example**:
```javascript
systemUpdatePage.verifyElementInFrame('right', '.kernel-info')
```

**Logs**:
- "Verifying element \"{selector}\" in {frameName} frame"
- "✓ Element found in {frameName}"

---

## Usage Examples

### Example 1: Basic Kernel Version Check

```javascript
import SystemUpdatePage from '../support/pages/SystemUpdatePage'
import SetupWorkflow from '../support/workflows/SetupWorkflow'

describe('Kernel Version Check', () => {
  const systemUpdatePage = new SystemUpdatePage()
  const setupWorkflow = new SetupWorkflow()

  it('should display correct kernel version', () => {
    // Setup
    setupWorkflow.login()

    // Navigate
    systemUpdatePage.navigateToSystemUpdates()

    // Verify
    const expectedVersion = Cypress.env('targetKernelVersion')
    systemUpdatePage.verifyKernelVersion(expectedVersion)
  })
})
```

### Example 2: Extract and Validate Version

```javascript
it('should extract valid kernel version format', () => {
  setupWorkflow.login()
  systemUpdatePage.navigateToSystemUpdates()

  systemUpdatePage.getKernelVersion().then((version) => {
    // Verify version exists
    expect(version).to.not.be.null

    // Verify format: X.X.X-X.X.X.elX_X.arch
    expect(version).to.match(
      /\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64/
    )

    cy.log(`✓ Valid kernel version: ${version}`)
  })
})
```

### Example 3: Frame Structure Validation

```javascript
it('should have correct 3-frame structure', () => {
  setupWorkflow.login()

  // Verify frameset
  systemUpdatePage.verifyFrameStructure()

  // Verify each frame is accessible
  const frames = ['tophead', 'left', 'right']

  frames.forEach(frameName => {
    systemUpdatePage.getFrameDoc(frameName).then(frameDoc => {
      expect(frameDoc).to.exist
      cy.log(`✓ ${frameName} frame accessible`)
    })
  })
})
```

### Example 4: Complete Workflow with Screenshots

```javascript
it('should execute complete workflow with documentation', () => {
  // Step 1: Login
  setupWorkflow.login()
  systemUpdatePage.capturePageState('01-after-login')

  // Step 2: Navigate
  systemUpdatePage.navigateToSystemUpdates()
  systemUpdatePage.capturePageState('02-system-updates-page')

  // Step 3: Verify kernel version
  const targetVersion = '5.14.0-427.24.1.el9_4.x86_64'
  systemUpdatePage.verifyKernelVersion(targetVersion)
  systemUpdatePage.capturePageState('03-kernel-verified')

  // Step 4: Verify frame structure
  systemUpdatePage.verifyFrameStructure()
  systemUpdatePage.capturePageState('04-frame-structure-verified')
})
```

### Example 5: Custom Frame Interaction

```javascript
it('should interact with custom elements in frames', () => {
  setupWorkflow.login()
  systemUpdatePage.navigateToSystemUpdates()

  // Access right frame directly for custom operations
  systemUpdatePage.getFrameDoc('right').then((frameDoc) => {
    // Custom jQuery-like operations
    const headings = frameDoc.querySelectorAll('h1, h2, h3')
    cy.log(`Found ${headings.length} headings`)

    // Extract custom data
    const tables = frameDoc.querySelectorAll('table')
    cy.log(`Found ${tables.length} tables`)
  })
})
```

### Example 6: Error Handling

```javascript
it('should handle missing kernel version gracefully', () => {
  setupWorkflow.login()
  systemUpdatePage.navigateToSystemUpdates()

  systemUpdatePage.getKernelVersion().then((version) => {
    if (version === null) {
      cy.log('⚠️ Kernel version not found on page')
      // Handle gracefully - maybe this is expected in some environments
      cy.log('Continuing test with other validations...')
    } else {
      cy.log(`✓ Kernel version found: ${version}`)
      expect(version).to.match(/\d+\.\d+\.\d+/)
    }
  })
})
```

---

## Best Practices

### 1. Use Workflow for Setup

✅ **Good**:
```javascript
import SetupWorkflow from '../support/workflows/SetupWorkflow'
const setupWorkflow = new SetupWorkflow()

setupWorkflow.login()  // Framework-standard login
```

❌ **Bad**:
```javascript
// Don't bypass framework
cy.visit('/login.jsp')
cy.get('input').type('username')
```

### 2. Use navigateAndVerify() for Reliability

✅ **Good**:
```javascript
// Includes built-in verification
systemUpdatePage.navigateAndVerify()
```

❌ **Bad**:
```javascript
// Manual navigation without verification
systemUpdatePage.navigateToSystemUpdates()
// What if navigation failed?
```

### 3. Extract Before Verify for Flexibility

✅ **Good**:
```javascript
systemUpdatePage.getKernelVersion().then((version) => {
  // Can log, store, or perform custom validation
  cy.log(`Extracted version: ${version}`)
  expect(version).to.equal(expectedVersion)
})
```

❌ **Bad**:
```javascript
// Direct verification - less flexible
systemUpdatePage.verifyKernelVersion(expectedVersion)
```

### 4. Use Descriptive Screenshots

✅ **Good**:
```javascript
systemUpdatePage.capturePageState('kernel-verification-step-3')
```

❌ **Bad**:
```javascript
cy.screenshot()  // Generic name
```

### 5. Handle Frame Not Found Errors

✅ **Good**:
```javascript
try {
  systemUpdatePage.getFrameDoc('left')
} catch (error) {
  cy.log('⚠️ Frame not found - page may not have loaded')
  throw error
}
```

### 6. Use Configuration for Versions

✅ **Good**:
```javascript
const targetVersion = Cypress.env('targetKernelVersion')
systemUpdatePage.verifyKernelVersion(targetVersion)
```

❌ **Bad**:
```javascript
// Hardcoded version
systemUpdatePage.verifyKernelVersion('5.14.0-427.24.1.el9_4.x86_64')
```

---

## Troubleshooting

### Issue: Frame Not Found

**Error**: `Frame 'left' not found`

**Causes**:
- Frames haven't loaded yet
- Not on a page with frameset
- Login failed (no frameset after login)

**Solutions**:
```javascript
// Wait for frames to load
cy.wait(2000)  // Or better: use waitForFrame()
systemUpdatePage.waitForFrame('left')

// Verify you're on correct page
cy.url().should('include', '/index.jsp')
```

### Issue: Element Not Found in Frame

**Error**: `Element with text "Administration" not found`

**Causes**:
- Text mismatch (case-sensitive)
- Element doesn't exist
- Frame content not loaded

**Solutions**:
```javascript
// Check frame content
systemUpdatePage.getFrameText('left').then(text => {
  cy.log('Left frame content:', text)
})

// Use partial match
systemUpdatePage.clickLinkInFrame('left', 'admin')  // Case-insensitive
```

### Issue: Kernel Version Not Extracted

**Error**: Returns `null` from `getKernelVersion()`

**Causes**:
- Version format changed
- Content not loaded
- Version not present on page

**Solutions**:
```javascript
// Check page content
systemUpdatePage.getRightFrameContent().then(content => {
  cy.log('Page content:', content)
  // Look for version pattern manually
})

// Adjust regex pattern in SystemUpdatePage.js if format changed
```

### Issue: Login Selector Mismatch

**Error**: `Expected to find element: input[name="username"]`

**Causes**:
- Test constants don't match actual page
- Login page structure changed

**Solutions**:
```javascript
// Update test-constants.js with correct selectors
// Inspect actual login page to find correct selectors
login: {
  usernameInput: 'input[type="text"]',  // More generic
  passwordInput: 'input[type="password"]',
}
```

---

## Advanced Usage

### Custom Frame Interactions

```javascript
// Access frame and perform jQuery-like operations
systemUpdatePage.getFrameDoc('right').then((frameDoc) => {
  const $ = (sel) => frameDoc.querySelector(sel)
  const $$ = (sel) => frameDoc.querySelectorAll(sel)

  // Custom queries
  const kernelDiv = $('.kernel-version')
  const allLinks = $$('a')

  // Custom assertions
  expect(kernelDiv).to.exist
  expect(allLinks.length).to.be.greaterThan(0)
})
```

### Extend SystemUpdatePage

```javascript
// Create custom subclass
class ExtendedSystemUpdatePage extends SystemUpdatePage {
  getDetailedSystemInfo() {
    return this.getRightFrameContent().then(content => {
      // Custom parsing logic
      const info = {
        kernel: content.match(/Kernel: (.*)/)?.[1],
        arch: content.match(/Architecture: (.*)/)?.[1],
        uptime: content.match(/Uptime: (.*)/)?.[1]
      }
      return cy.wrap(info)
    })
  }
}
```

### Chain Multiple Operations

```javascript
systemUpdatePage
  .navigateToSystemUpdates()
systemUpdatePage
  .verifyContentLoaded()
systemUpdatePage
  .verifyKernelVersion('5.14.0-427.24.1.el9_4.x86_64')
systemUpdatePage
  .verifyFrameStructure()
systemUpdatePage
  .capturePageState('complete-verification')
```

---

## Related Documentation

- **BasePage.js** - Parent class with common functionality
- **SetupWorkflow.js** - Test environment setup
- **test-constants.js** - Selector definitions
- **test-config.js** - Configuration values
- **REFACTORING_SUMMARY.md** - Architecture details

---

## Support

For issues or questions:
1. Check **Troubleshooting** section above
2. Review **TEST_EXECUTION_REPORT.md** for common failures
3. Inspect actual IWSVA page HTML structure
4. Update selectors in **test-constants.js** as needed

---

**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Framework**: IWSVA Cypress Test Framework
