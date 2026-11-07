# IWSVA Web Console - Cypress Test Guide

## 📚 Learning Guide for Cypress Testing

This guide explains the typical test cases created for IWSVA web console testing. Use this as a reference for understanding Cypress best practices.

---

## 🎯 Test File Overview

**File**: `cypress/e2e/iwsva_patch_management.cy.js`

This test suite demonstrates **6 essential test patterns** for web UI testing.

---

## 📝 Test Cases Breakdown

### Test Case 1: Login and CSRF Token Extraction
**Purpose**: Verify basic authentication flow

```javascript
it('should login successfully and extract CSRF token', () => {
  cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)
  cy.url().should('include', '/main.jsp')
  cy.get('@csrfToken').should('exist')
})
```

**What You Learn:**
- ✅ Using custom commands (`cy.loginWithCSRF`)
- ✅ URL assertions (`cy.url().should()`)
- ✅ Working with aliases (`cy.get('@csrfToken')`)
- ✅ Taking screenshots for documentation
- ✅ Chai assertions (`expect().to.be.a()`)

**Key Concepts:**
- **Custom Commands**: Reusable login logic
- **Aliases**: Store values for later use with `@` syntax
- **Assertions**: Verify expected outcomes

---

### Test Case 2: Page Navigation and Content Verification
**Purpose**: Verify page access and data extraction

```javascript
it('should access patch management page and verify kernel version', () => {
  cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)
  cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')
  cy.get('body').then(($body) => {
    const bodyText = $body.text()
    // Search for patterns in content
  })
})
```

**What You Learn:**
- ✅ Chaining commands (`cy.loginWithCSRF().visitWithCSRF()`)
- ✅ Using `.then()` for synchronous operations
- ✅ Extracting and analyzing page content
- ✅ Regular expressions for pattern matching
- ✅ Conditional logic in tests

**Key Concepts:**
- **jQuery-like API**: Cypress wraps elements like jQuery
- **Closures**: Using `.then()` to work with DOM elements
- **Text Extraction**: Getting page content for analysis

---

### Test Case 3: State Persistence Verification
**Purpose**: Verify CSRF token consistency across navigation

```javascript
it('should maintain CSRF token across multiple page navigations', () => {
  cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)
  cy.get('@csrfToken').then((token) => {
    initialToken = token
  })
  // Navigate and verify token remains same
})
```

**What You Learn:**
- ✅ Testing session state
- ✅ Multi-step navigation flows
- ✅ Variable scope in Cypress tests
- ✅ Comparative assertions

**Key Concepts:**
- **Session Management**: How web apps maintain state
- **Token Persistence**: Security token behavior
- **Variable Sharing**: Using closures to share data between steps

---

### Test Case 4: Dynamic Content Analysis
**Purpose**: Analyze and interact with page elements

```javascript
it('should search and verify patch information', () => {
  cy.get('body').then(($body) => {
    if ($body.find('table').length > 0) {
      cy.log('✅ Found table elements')
    }
  })
})
```

**What You Learn:**
- ✅ Conditional element checking
- ✅ Finding nested elements (`.find()`)
- ✅ Counting elements (`.length`)
- ✅ Iterating through arrays
- ✅ Logging for debugging

**Key Concepts:**
- **Conditional Testing**: Handle different page states
- **Element Discovery**: Finding elements without fixed selectors
- **Debugging**: Using `cy.log()` effectively

---

### Test Case 5: Logout Flow Testing
**Purpose**: Verify session termination

```javascript
it('should logout successfully and clear session', () => {
  cy.get('a, button').each(($el) => {
    const text = $el.text().toLowerCase()
    if (logoutTexts.some(logout => text.includes(logout))) {
      cy.wrap($el).click()
      return false // break loop
    }
  })
})
```

**What You Learn:**
- ✅ Using `.each()` to iterate
- ✅ Text-based element finding
- ✅ Using `cy.wrap()` for chaining
- ✅ Loop control (breaking loops)
- ✅ Case-insensitive string matching

**Key Concepts:**
- **Element Iteration**: Working with multiple similar elements
- **Text Matching**: Finding elements by content
- **Loop Breaking**: Stopping iteration early

---

### Test Case 6: Negative Testing
**Purpose**: Verify error handling

```javascript
it('should handle invalid credentials gracefully', () => {
  cy.get('input[type="text"]').first().clear().type('invalid_user')
  cy.get('input[type="password"]').first().clear().type('invalid_pass')
  cy.get('input[type="submit"]').first().click()
  // Verify error handling
})
```

**What You Learn:**
- ✅ Testing error conditions
- ✅ Input field manipulation (`.clear()`, `.type()`)
- ✅ Button clicking
- ✅ Error message detection
- ✅ Security testing basics

**Key Concepts:**
- **Negative Testing**: Test what happens when things go wrong
- **Security Validation**: Verify authentication failures
- **Error Detection**: Finding error messages

---

## 🏗️ Test Structure Best Practices

### 1. **Describe Block**
Groups related tests together:
```javascript
describe('IWSVA Patch Management Test', () => {
  // All related tests here
})
```

### 2. **Hooks**
Run code before/after tests:
```javascript
beforeEach(() => {
  cy.clearCookies()  // Clean state before each test
  cy.clearLocalStorage()
})
```

**Available Hooks:**
- `before()` - Runs once before all tests
- `beforeEach()` - Runs before each test
- `after()` - Runs once after all tests
- `afterEach()` - Runs after each test

### 3. **Test Cases (it blocks)**
Individual test scenarios:
```javascript
it('should do something specific', () => {
  // Test steps here
})
```

---

## 🎨 Cypress Commands Reference

### Navigation Commands
```javascript
cy.visit(url)                    // Navigate to URL
cy.url()                         // Get current URL
cy.go('back')                    // Browser back button
cy.reload()                      // Refresh page
```

### Query Commands
```javascript
cy.get(selector)                 // Get DOM element
cy.contains(text)                // Find element by text
cy.find(selector)                // Find child elements
cy.first()                       // Get first element
cy.last()                        // Get last element
cy.eq(index)                     // Get element at index
```

### Action Commands
```javascript
cy.click()                       // Click element
cy.type(text)                    // Type into input
cy.clear()                       // Clear input value
cy.check()                       // Check checkbox/radio
cy.select(value)                 // Select dropdown option
cy.focus()                       // Focus element
cy.blur()                        // Unfocus element
```

### Assertion Commands
```javascript
.should('exist')                 // Element exists
.should('be.visible')            // Element is visible
.should('have.text', 'Hello')    // Element has text
.should('have.value', 'test')    // Input has value
.should('include', 'text')       // Contains text
.should('not.exist')             // Element doesn't exist
```

### Utility Commands
```javascript
cy.wait(ms)                      // Wait for milliseconds
cy.log(message)                  // Console log
cy.screenshot(name)              // Take screenshot
cy.clearCookies()                // Clear cookies
cy.clearLocalStorage()           // Clear local storage
```

### Custom Commands (IWSVA specific)
```javascript
cy.loginWithCSRF(url, user, pwd) // Login with CSRF handling
cy.visitWithCSRF(url, path)      // Visit with CSRF token
cy.getCSRFToken()                // Extract CSRF token
cy.extractCSRFTokenFromUrl()     // Get token from URL
```

---

## 🚀 Running the Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx cypress run --spec "cypress/e2e/iwsva_patch_management.cy.js"
```

### Open Cypress UI
```bash
npm run cypress:open
```

### Run with Browser Visible
```bash
npx cypress run --spec "cypress/e2e/iwsva_patch_management.cy.js" --headed --browser chrome
```

### Run Single Test
```bash
# Add .only to the test:
it.only('should login successfully', () => {
  // This test will run alone
})
```

### Skip a Test
```bash
# Add .skip to the test:
it.skip('should logout successfully', () => {
  // This test will be skipped
})
```

---

## 🐛 Debugging Tips

### 1. Use `.debug()`
```javascript
cy.get('button').debug().click()
```
Opens Chrome DevTools at this point.

### 2. Use `.pause()`
```javascript
cy.get('button').pause().click()
```
Pauses test execution.

### 3. Use `cy.log()`
```javascript
cy.log('Current step: Login form')
```
Adds logs to Cypress command log.

### 4. Use `.then()` for debugging
```javascript
cy.get('input').then(($el) => {
  console.log($el)  // Browser console
  debugger          // Breakpoint
})
```

### 5. Take Screenshots
```javascript
cy.screenshot('debug-state')
```

### 6. Increase Wait Times
```javascript
cy.wait(5000)  // Wait longer to observe
```

---

## 📊 Common Patterns

### Pattern 1: Conditional Testing
```javascript
cy.get('body').then(($body) => {
  if ($body.find('.error').length > 0) {
    cy.log('Error found')
  } else {
    cy.log('No error')
  }
})
```

### Pattern 2: Retry Logic
```javascript
cy.get('.element', { timeout: 10000 })
  .should('be.visible')
```

### Pattern 3: Aliasing
```javascript
cy.get('.user').as('currentUser')
cy.get('@currentUser').should('have.text', 'Admin')
```

### Pattern 4: Custom Commands
```javascript
// In commands.js
Cypress.Commands.add('login', (username, password) => {
  cy.get('#username').type(username)
  cy.get('#password').type(password)
  cy.get('#submit').click()
})

// In test
cy.login('admin', '111111')
```

### Pattern 5: Page Object Model
```javascript
class LoginPage {
  visit() {
    cy.visit('/login')
  }

  fillUsername(username) {
    cy.get('#username').type(username)
  }

  fillPassword(password) {
    cy.get('#password').type(password)
  }

  submit() {
    cy.get('#submit').click()
  }
}

export default new LoginPage()
```

---

## ✅ Test Writing Checklist

Before writing a test, consider:

- [ ] What is the test's purpose?
- [ ] What is the expected behavior?
- [ ] Does it need setup (login, data)?
- [ ] What assertions validate success?
- [ ] How do I handle failures?
- [ ] Is cleanup needed?
- [ ] Is the test independent?
- [ ] Is the test reliable (not flaky)?
- [ ] Is the test readable?
- [ ] Are selectors stable?

---

## 🎓 Learning Path

### Beginner
1. ✅ Run existing tests and watch them
2. ✅ Modify simple assertions
3. ✅ Add new `cy.log()` statements
4. ✅ Change wait times
5. ✅ Add new screenshots

### Intermediate
1. ✅ Write new test cases
2. ✅ Create custom commands
3. ✅ Handle dynamic content
4. ✅ Work with forms and inputs
5. ✅ Debug failing tests

### Advanced
1. ✅ Implement Page Object Model
2. ✅ Create fixtures and mock data
3. ✅ Set up CI/CD integration
4. ✅ Write custom plugins
5. ✅ Optimize test performance

---

## 📚 Additional Resources

### Official Documentation
- [Cypress Docs](https://docs.cypress.io)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress API](https://docs.cypress.io/api/table-of-contents)

### Tutorials
- [Cypress Real World App](https://github.com/cypress-io/cypress-realworld-app)
- [Cypress Examples](https://example.cypress.io)

### Community
- [Cypress Discord](https://discord.com/invite/cypress)
- [Cypress GitHub](https://github.com/cypress-io/cypress)

---

## 🤔 Common Issues and Solutions

### Issue 1: Element not found
**Solution**: Add wait or increase timeout
```javascript
cy.get('.element', { timeout: 10000 })
```

### Issue 2: Element not visible
**Solution**: Scroll into view
```javascript
cy.get('.element').scrollIntoView().click()
```

### Issue 3: Flaky tests
**Solution**: Add explicit waits or assertions
```javascript
cy.get('.loading').should('not.exist')
cy.get('.content').should('be.visible')
```

### Issue 4: CSRF token not found
**Solution**: Verify URL and timing
```javascript
cy.wait(2000)  // Wait for redirect
cy.url().should('include', 'CSRFGuardToken')
```

### Issue 5: SSL certificate errors
**Solution**: Already configured in `cypress.config.js`
```javascript
{
  chromeWebSecurity: false
}
```

---

## 🎯 Next Steps

1. **Run the test suite**:
   ```bash
   npx cypress run --spec "cypress/e2e/iwsva_patch_management.cy.js" --headed
   ```

2. **Experiment**: Modify tests and see what happens

3. **Create new tests**: Add your own test cases

4. **Read screenshots**: Check the generated screenshots in `cypress/screenshots/`

5. **Watch videos**: Review test videos in `cypress/videos/`

---

Happy Testing! 🚀
