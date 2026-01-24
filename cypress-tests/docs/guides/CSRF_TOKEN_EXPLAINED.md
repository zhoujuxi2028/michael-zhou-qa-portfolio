# CSRF Token Handling Explained

## The "Secret" - Why It Works Without Explicit Handling

### Key Insight
The CSRF token in IWSVA is **URL-based**, not form-based. This means we don't need to extract and manually pass it - the browser handles it automatically!

## How It Works

### 1. Login Page (NO CSRF Token Required)
```javascript
// Step 1: Visit login page
cy.visit('https://10.206.201.9:8443/')

// Step 2: Submit credentials - NO CSRF token needed here!
cy.get('input[type="text"]').type('admin')
cy.get('input[type="password"]').type('111111')
cy.get('input[type="submit"]').click()
```

**Result**: Login succeeds without CSRF token

### 2. After Login (CSRF Token Appears in URL)
```
Before login: https://10.206.201.9:8443/index.jsp
After login:  https://10.206.201.9:8443/index.jsp?CSRFGuardToken=KIRQWIYXLZGDFD8VHFCD2CFWSZI7OPMQ&summary_scan
                                                     ↑
                                            CSRF Token is here!
```

### 3. Navigation (Browser Handles It Automatically)
When you click links in the left frame:
```javascript
// All links in the left frame ALREADY contain the CSRF token
// Example link href:
"go.jsp?CSRFGuardToken=KIRQWIYXLZGDFD8VHFCD2CFWSZI7OPMQ&url=hardwarestatus"
         ↑
    Token is already embedded!
```

**When you click these links**, the browser automatically navigates with the token included.

## Why verify_kernel_version.cy.js Doesn't Need Explicit Token Handling

```javascript
// Login - no token needed
login()

// Click Administration in left frame
// The link already has: admin.jsp?CSRFGuardToken=XXX
leftFrame.querySelector('a[text="Administration"]').click()

// Click System Updates
// The link already has: admin_patch_mgmt.jsp?CSRFGuardToken=XXX
leftFrame.querySelector('a[text*="System Update"]').click()

// All navigation happens within the authenticated session
// Server embeds CSRF token in all links automatically
```

## When You WOULD Need Explicit Token Handling

### Scenario 1: Direct URL Navigation
If you want to visit a page directly without clicking:

```javascript
// Extract token from URL
cy.url().then((url) => {
  const csrfToken = new URL(url).searchParams.get('CSRFGuardToken')

  // Visit another page with token
  cy.visit(`${baseUrl}/admin_settings.jsp?CSRFGuardToken=${csrfToken}`)
})
```

### Scenario 2: API Calls
If you're making API calls with cy.request():

```javascript
cy.url().then((url) => {
  const csrfToken = new URL(url).searchParams.get('CSRFGuardToken')

  cy.request({
    method: 'POST',
    url: `${baseUrl}/api/update?CSRFGuardToken=${csrfToken}`,
    body: { /* data */ }
  })
})
```

### Scenario 3: Form Submissions (if needed)
If submitting forms programmatically:

```javascript
cy.url().then((url) => {
  const csrfToken = new URL(url).searchParams.get('CSRFGuardToken')

  cy.request({
    method: 'POST',
    url: `${baseUrl}/save.jsp?CSRFGuardToken=${csrfToken}`,
    form: true,
    body: {
      field1: 'value1',
      field2: 'value2'
    }
  })
})
```

## Custom Commands Available (But Not Used in verify_kernel_version.cy.js)

### In cypress/support/commands.js:

```javascript
// Command 1: Login with CSRF handling
Cypress.Commands.add('loginWithCSRF', (baseUrl, username, password) => {
  cy.visit(`${baseUrl}/index.jsp`, { failOnStatusCode: false })
  cy.wait(1000)

  // Login
  cy.get('input[name="username"], input[type="text"]').first().type(username)
  cy.get('input[name="password"], input[type="password"]').first().type(password)
  cy.get('button[type="submit"], input[type="submit"]').first().click()
  cy.wait(2000)
})

// Command 2: Get CSRF Token
Cypress.Commands.add('getCSRFToken', () => {
  return cy.url().then((url) => {
    const token = new URL(url).searchParams.get('CSRFGuardToken')
    return token
  })
})
```

## Example: Using Explicit CSRF Token Handling

If you wanted to rewrite verify_kernel_version.cy.js with explicit token handling:

```javascript
it('should find kernel version with explicit CSRF handling', () => {
  // Login
  cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
  cy.wait(2000)
  cy.get('input[type="text"]').first().type('admin')
  cy.get('input[type="password"]').first().type('111111')
  cy.get('input[type="submit"]').first().click()
  cy.wait(5000)

  // Extract CSRF token
  cy.url().then((url) => {
    const csrfToken = new URL(url).searchParams.get('CSRFGuardToken')
    cy.log(`CSRF Token: ${csrfToken}`)

    // Option 1: Direct navigation to System Updates page
    cy.visit(`${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${csrfToken}`, {
      failOnStatusCode: false
    })
    cy.wait(3000)

    // Now verify kernel version in the page
    cy.window().then((win) => {
      const rightFrame = win.document.querySelector('frame[name="right"]')
      const rightDoc = rightFrame.contentDocument
      const rightText = rightDoc.body.textContent

      expect(rightText).to.include('5.14.0-427.24.1.el9_4.x86_64')
    })
  })
})
```

## Comparison: Frame Navigation vs Direct Navigation

### Current Approach (Frame Navigation)
```javascript
✅ No explicit token handling needed
✅ Simulates real user interaction
✅ More reliable (follows app's intended flow)
✅ Easier to maintain

❌ Slightly slower (clicks through menus)
```

### Direct Navigation with Token
```javascript
✅ Faster (skips navigation)
✅ Good for testing specific pages directly

❌ Requires explicit token extraction
❌ May miss navigation-related bugs
❌ Less like real user behavior
```

## Testing CSRF Token Handling

If you want to verify token handling is working:

```javascript
it('should extract and use CSRF token', () => {
  // Login
  cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
  cy.wait(2000)
  cy.get('input[type="text"]').first().type('admin')
  cy.get('input[type="password"]').first().type('111111')
  cy.get('input[type="submit"]').first().click()
  cy.wait(5000)

  // Verify token exists in URL
  cy.url().should('include', 'CSRFGuardToken=')

  // Extract and log token
  cy.url().then((url) => {
    const token = new URL(url).searchParams.get('CSRFGuardToken')
    expect(token, 'CSRF token should exist').to.not.be.null
    expect(token.length, 'Token should be reasonable length').to.be.greaterThan(10)
    cy.log(`✓ CSRF Token extracted: ${token}`)
  })

  // Verify token works for navigation
  cy.url().then((url) => {
    const token = new URL(url).searchParams.get('CSRFGuardToken')

    // Try to access a protected page with token
    cy.visit(`${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${token}`, {
      failOnStatusCode: false
    })

    // Should NOT get error page
    cy.get('body').should('not.contain', 'Access Denied')
    cy.get('body').should('not.contain', 'Invalid Token')
    cy.log('✓ CSRF token is valid')
  })
})
```

## Summary

### Why Current Script Works:
1. ✅ Login page doesn't require CSRF token
2. ✅ After login, token is automatically in URL
3. ✅ All links in frames include the token
4. ✅ Clicking links automatically carries the token
5. ✅ Browser session maintains authentication

### When You Need Explicit Handling:
- Direct URL navigation (bypassing menu)
- API calls with cy.request()
- Programmatic form submissions
- Testing CSRF protection specifically

### Current Implementation Choice:
**Frame-based navigation** = No explicit token handling needed = Simpler & more maintainable ✅

---

**Key Takeaway**: The CSRF token IS being handled - just automatically by the browser and the application's URL structure, not explicitly in our test code!
