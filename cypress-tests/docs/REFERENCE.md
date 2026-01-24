# Quick Reference Guide

Fast reference for IWSVA Cypress testing commands, patterns, and research findings.

---

## 🚀 Quick Commands

### Run Tests

```bash
npm test                  # Run main kernel verification test
npm run cypress:open      # Open Cypress interactive UI
npm run test:firefox      # Run tests with Firefox
npm run test:headed       # Run with visible browser
npm run test:all          # Run all test files
```

---

## 🔐 Login Patterns

### Custom Command (Recommended)

```javascript
cy.loginWithCSRF('https://10.206.201.9:8443', 'admin', '111111')
```

### Manual Login Flow

```javascript
cy.visit('https://10.206.201.9:8443/')
cy.get('input[type="text"]').first().type('admin')
cy.get('input[type="password"]').first().type('111111')
cy.get('input[type="submit"]').first().click()
cy.wait(2000)

// Extract CSRF token from URL after login
cy.url().then((url) => {
  const token = new URL(url).searchParams.get('CSRFGuardToken')
  // Use token for subsequent requests
})
```

---

## 🌐 Navigation Commands

### Visit Page with CSRF Token

```javascript
cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')
```

### Get CSRF Token

```javascript
cy.extractCSRFTokenFromUrl().then((token) => {
  cy.log(`Token: ${token}`)
  // Use token as needed
})
```

---

## 📝 Test Template

### Basic Test Structure

```javascript
describe('My Test Suite', () => {
  const baseUrl = 'https://10.206.201.9:8443'

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  before(() => {
    cy.loginWithCSRF(baseUrl, 'admin', '111111')
  })

  it('should test something', () => {
    cy.visitWithCSRF(baseUrl, '/page.jsp')
    cy.contains('Expected Text').should('be.visible')
    cy.screenshot('test-screenshot')
  })
})
```

### Frame Access Pattern

```javascript
cy.window().then((win) => {
  const doc = win.document
  const leftFrame = doc.querySelector('frame[name="left"]')
  const leftDoc = leftFrame.contentDocument

  // Now work with frame content
  const links = leftDoc.querySelectorAll('a')
  // ... interact with frame elements
})
```

---

## 🔑 Key Points to Remember

### Login Flow

- ✅ Visit `/` not `/index.jsp`
- ✅ Login page has NO CSRF token required
- ✅ Token appears in URL after successful login
- ✅ Use `input[type="text"]` selector for username
- ✅ Use `input[type="password"]` selector for password
- ✅ Use `input[type="submit"]` for login button

### CSRF Token Handling

- ✅ Token format: `?CSRFGuardToken=XXXXX` (32 chars)
- ✅ Appears in URL after login
- ✅ Embedded in all navigation links
- ✅ Frame navigation handles tokens automatically
- ❌ No explicit extraction needed for frame clicks

### Frame Structure

- **tophead**: Top navigation bar
- **left**: Left sidebar menu
- **right**: Main content area

---

## 🧪 Common Selectors

### Input Fields

```javascript
cy.get('input[type="text"]').first()      // Username field
cy.get('input[type="password"]').first()  // Password field
cy.get('input[type="submit"]').first()    // Submit button
```

### Frame Access

```javascript
cy.window().then((win) => {
  const frame = win.document.querySelector('frame[name="frameName"]')
  const frameDoc = frame.contentDocument
})
```

### Text Search

```javascript
cy.contains('System Updates')             // Find by text
cy.get('body').should('contain', 'text')  // Assert text exists
```

---

## 📚 Research Findings

### Problem Solved

**Initial Challenge**: Tests failed because we assumed login page would have CSRF token field (common pattern).

```javascript
❌ cy.get('input[name="CSRFGuardToken"]') // Not found!
```

### Solution Discovered

Found working pattern by analyzing existing test code that showed correct flow.

### How IWSVA Login Actually Works

#### 1. Login Page (NO token required)

```javascript
// Visit root path, not /index.jsp
cy.visit('https://10.206.201.9:8443/')

// Fill credentials - no token needed
cy.get('input[type="text"]').first().type('admin')
cy.get('input[type="password"]').first().type('111111')
cy.get('input[type="submit"]').first().click()
```

#### 2. After Login (Token appears in URL)

```
Before login: https://10.206.201.9:8443/
After login:  https://10.206.201.9:8443/index.jsp?CSRFGuardToken=ABC123XYZ...
                                                   ↑
                                           Token appears here automatically
```

#### 3. Subsequent Pages (Token required)

```javascript
const token = 'ABC123XYZ...'  // Extracted from step 2
cy.visit(`https://10.206.201.9:8443/admin_patch_mgmt.jsp?CSRFGuardToken=${token}`)
```

### Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│ Login Page  │         │ Login Success│         │  Other Pages    │
├─────────────┤   →     ├──────────────┤   →     ├─────────────────┤
│     /       │         │ /index.jsp?  │         │ /page.jsp?      │
│             │         │ token=XXXXX  │         │ token=XXXXX     │
│ No token    │         │ Token appears│         │ Token required  │
│ required    │         │              │         │                 │
└─────────────┘         └──────────────┘         └─────────────────┘
```

### Comparison with Common Patterns

| Common Pattern | IWSVA System |
|----------------|--------------|
| Token in login page | ❌ No token needed |
| Token in hidden field | ❌ Token in URL instead |
| Token in cookie | ❌ Token in URL parameter |
| POST requires token | ✅ POST without token |
| GET requires token | ✅ GET needs token in URL |

### Custom Commands Created

To handle this unique pattern:

```javascript
// 1. Login and auto-extract token
cy.loginWithCSRF(baseUrl, 'admin', '111111')

// 2. Visit page with token
cy.visitWithCSRF(baseUrl, '/page.jsp')

// 3. Extract token from current URL
cy.extractCSRFTokenFromUrl()

// 4. Generic token getter (checks multiple sources)
cy.getCSRFToken()
```

---

## 🎯 Common Tasks

### Task: Verify Text Exists

```javascript
cy.get('body').then(($body) => {
  const text = $body.text()
  expect(text).to.include('Expected Text')
})
```

### Task: Find Element by Partial Text

```javascript
cy.contains('System Update').click()
```

### Task: Take Screenshot

```javascript
cy.screenshot('descriptive-name')
```

### Task: Wait for Element

```javascript
cy.get('.element', { timeout: 10000 })
  .should('be.visible')
```

### Task: Access Nested Frame Content

```javascript
cy.window().then((win) => {
  const doc = win.document
  const frame = doc.querySelector('frame[name="right"]')
  const frameDoc = frame.contentDocument
  const content = frameDoc.body.textContent

  expect(content).to.include('Expected Content')
})
```

---

## 🐛 Debugging Tips

### Enable Debug Logging

```javascript
Cypress.config('defaultCommandTimeout', 10000)

cy.get('element').debug()  // Opens DevTools
cy.get('element').pause()  // Pauses execution
```

### Log Current State

```javascript
cy.url().then((url) => {
  cy.log(`Current URL: ${url}`)
})

cy.window().then((win) => {
  console.log('Window object:', win)
})
```

### Screenshot on Failure

```javascript
afterEach(() => {
  cy.screenshot('failure-state', {
    capture: 'fullPage',
    onAfterScreenshot: () => {
      cy.log('Screenshot captured')
    }
  })
})
```

---

## ⚙️ Configuration Tips

### Environment Variables

**File**: `cypress.env.json`

```json
{
  "baseUrl": "https://your-server:8443",
  "username": "your-username",
  "password": "your-password",
  "targetKernelVersion": "5.14.0-427.24.1.el9_4.x86_64"
}
```

### Access in Tests

```javascript
const baseUrl = Cypress.env('baseUrl')
const username = Cypress.env('username')
const password = Cypress.env('password')
```

### Cypress Config

**File**: `cypress.config.js`

```javascript
{
  e2e: {
    baseUrl: 'https://10.206.201.9:8443',
    chromeWebSecurity: false,  // For self-signed certs
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    viewportWidth: 1280,
    viewportHeight: 720
  }
}
```

---

## 📦 Project Files Modified During Research

### Files Created/Modified

1. **cypress/support/commands.js**
   - Added 4 custom commands for CSRF handling
   - `loginWithCSRF()`
   - `visitWithCSRF()`
   - `getCSRFToken()`
   - `extractCSRFTokenFromUrl()`

2. **cypress.config.js**
   - SSL certificate handling
   - Custom tasks (log, writeToFile)
   - Frame support configuration

3. **Test files**
   - `verify_kernel_version.cy.js` - Main test (simplified)
   - Various archived tests in `archive/old_tests/`

---

## 🔍 Troubleshooting Quick Reference

### Issue: Login Fails

**Solution**:
- Visit `/` not `/index.jsp`
- Wait 2 seconds after clicking submit
- Check credentials in `cypress.env.json`

### Issue: CSRF Token Not Found

**Solution**:
- Wait for redirect after login
- Check URL contains `?CSRFGuardToken=`
- Use `cy.url().should('include', 'CSRFGuardToken')`

### Issue: Frame Not Found

**Solution**:
- Ensure page fully loaded
- Check frame name: `tophead`, `left`, `right`
- Use `contentDocument` to access frame

### Issue: Element Not Found

**Solution**:
- Increase timeout: `{ timeout: 10000 }`
- Wait for page load
- Check selector is correct
- Use `.first()` if multiple matches

### Issue: SSL Certificate Error

**Solution**:
- Already configured in `cypress.config.js`
- Set `chromeWebSecurity: false`
- Use Firefox if Chrome has issues

---

## 📖 Additional Resources

### Documentation

- **README.md** - Comprehensive project documentation
- **CSRF_TOKEN_EXPLAINED.md** - Detailed CSRF token handling explanation
- **IWSVA_TEST_GUIDE.md** - Complete learning guide for Cypress testing
- **TEST_REPORT.md** - Current test execution results and metrics

### External Links

- [Cypress Documentation](https://docs.cypress.io)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress API Reference](https://docs.cypress.io/api/table-of-contents)
- [Cypress Examples](https://example.cypress.io)

---

**Last Updated**: 2026-01-22
**Status**: Current and tested with Cypress 15.9.0
