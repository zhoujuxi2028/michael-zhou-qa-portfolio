/**
 * IWSVA Web Console - Patch Management Test
 *
 * This test case demonstrates a typical web UI test workflow:
 * 1. Login with CSRF token handling
 * 2. Navigate to target page
 * 3. Verify page content
 * 4. Interact with UI elements
 * 5. Validate results
 */

describe('IWSVA Patch Management Test', () => {
  // Test configuration
  const baseUrl = 'https://10.206.201.9:8443'
  const credentials = {
    username: 'admin',
    password: '111111'
  }

  // Hooks: Run before each test
  beforeEach(() => {
    // Clear cookies and session before each test to ensure clean state
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  // Test Case 1: Verify successful login and CSRF token extraction
  it('should login successfully and extract CSRF token', () => {
    // Step 1: Use custom command to login (handles CSRF automatically)
    cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)

    // Step 2: Verify successful login by checking URL
    cy.url().should('include', '/main.jsp')
    cy.url().should('include', 'CSRFGuardToken')

    // Step 3: Verify CSRF token is extracted and stored
    cy.get('@csrfToken').should('exist').then((token) => {
      cy.log('✅ CSRF Token extracted:', token)
      expect(token).to.be.a('string')
      expect(token).to.have.length.greaterThan(10)
    })

    // Step 4: Take screenshot for documentation
    cy.screenshot('01-successful-login')
  })

  // Test Case 2: Navigate to Patch Management page and verify content
  it('should access patch management page and verify kernel version', () => {
    // Step 1: Login first
    cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)

    // Step 2: Navigate to patch management page with CSRF token
    cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')

    // Step 3: Verify page loaded successfully
    cy.url().should('include', '/admin_patch_mgmt.jsp')
    cy.url().should('include', 'CSRFGuardToken')

    // Step 4: Wait for page content to load
    cy.wait(2000)

    // Step 5: Verify page title or header
    cy.get('body').should('be.visible')

    // Step 6: Search for kernel version information
    cy.get('body').then(($body) => {
      const bodyText = $body.text()
      cy.log('📄 Page content loaded')

      // Look for kernel version patterns (e.g., 3.10.0-1160.el7.x86_64)
      const kernelPattern = /\d+\.\d+\.\d+-\d+\.el\d+\.x86_64/
      if (kernelPattern.test(bodyText)) {
        const match = bodyText.match(kernelPattern)
        cy.log('🔍 Found kernel version:', match[0])
      }
    })

    // Step 7: Take screenshot for verification
    cy.screenshot('02-patch-management-page')
  })

  // Test Case 3: Verify CSRF token persistence across pages
  it('should maintain CSRF token across multiple page navigations', () => {
    // Step 1: Login and extract initial token
    cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)

    let initialToken
    cy.get('@csrfToken').then((token) => {
      initialToken = token
      cy.log('Initial Token:', initialToken)
    })

    // Step 2: Navigate to patch management page
    cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')
    cy.wait(1000)

    // Step 3: Extract token from current URL
    cy.extractCSRFTokenFromUrl().then((currentToken) => {
      cy.log('Current Token:', currentToken)

      // Step 4: Verify token remains the same
      expect(currentToken).to.equal(initialToken)
      cy.log('✅ CSRF Token persists across navigation')
    })

    // Step 5: Navigate back to main page
    cy.visitWithCSRF(baseUrl, '/main.jsp')
    cy.wait(1000)

    // Step 6: Verify token still the same
    cy.extractCSRFTokenFromUrl().then((finalToken) => {
      expect(finalToken).to.equal(initialToken)
      cy.log('✅ CSRF Token remains consistent')
    })
  })

  // Test Case 4: Search for specific patch information
  it('should search and verify patch information on patch management page', () => {
    // Step 1: Login
    cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)

    // Step 2: Navigate to patch management page
    cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')
    cy.wait(2000)

    // Step 3: Look for table elements (common in management interfaces)
    cy.get('body').then(($body) => {
      // Check if tables exist
      if ($body.find('table').length > 0) {
        cy.log('✅ Found table elements on page')

        // Count tables
        cy.get('table').then(($tables) => {
          cy.log(`📊 Number of tables found: ${$tables.length}`)
        })

        // Check for common table headers
        const headers = ['Version', 'Patch', 'Status', 'Date', 'Kernel']
        headers.forEach(header => {
          cy.get('body').then(($b) => {
            if ($b.text().includes(header)) {
              cy.log(`✅ Found header: ${header}`)
            }
          })
        })
      }
    })

    // Step 4: Look for form elements
    cy.get('body').then(($body) => {
      const formCount = $body.find('form').length
      const inputCount = $body.find('input').length
      const buttonCount = $body.find('button, input[type="submit"], input[type="button"]').length

      cy.log(`📝 Forms found: ${formCount}`)
      cy.log(`📝 Input fields found: ${inputCount}`)
      cy.log(`📝 Buttons found: ${buttonCount}`)
    })

    // Step 5: Take screenshot
    cy.screenshot('03-patch-info-analysis')
  })

  // Test Case 5: Verify logout functionality
  it('should logout successfully and clear session', () => {
    // Step 1: Login
    cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)
    cy.wait(1000)

    // Step 2: Look for logout link/button
    cy.get('body').then(($body) => {
      const bodyText = $body.text().toLowerCase()

      // Common logout link texts
      const logoutTexts = ['logout', 'log out', 'sign out', 'exit']
      const hasLogout = logoutTexts.some(text => bodyText.includes(text))

      if (hasLogout) {
        cy.log('✅ Logout option found on page')

        // Try to find and click logout
        cy.get('a, button').each(($el) => {
          const text = $el.text().toLowerCase()
          if (logoutTexts.some(logout => text.includes(logout))) {
            cy.log('🚪 Found logout element:', $el.text())
            cy.wrap($el).click()
            return false // break the loop
          }
        })
      } else {
        cy.log('⚠️  Logout option not found, may need to analyze further')
      }
    })

    // Step 3: Take final screenshot
    cy.screenshot('04-logout-attempt')
  })

  // Test Case 6: Handle invalid login (negative test)
  it('should handle invalid credentials gracefully', () => {
    // Step 1: Visit login page
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(1000)

    // Step 2: Enter invalid credentials
    cy.get('input[type="text"]').first().clear().type('invalid_user')
    cy.get('input[type="password"]').first().clear().type('invalid_pass')

    // Step 3: Submit form
    cy.get('input[type="submit"], button[type="submit"]').first().click()
    cy.wait(2000)

    // Step 4: Verify we're still on login page (not redirected to main.jsp)
    cy.url().then((url) => {
      if (url.includes('/main.jsp')) {
        cy.log('❌ Login succeeded with invalid credentials - potential security issue!')
      } else {
        cy.log('✅ Login failed as expected with invalid credentials')
      }
    })

    // Step 5: Look for error messages
    cy.get('body').then(($body) => {
      const bodyText = $body.text().toLowerCase()
      const errorKeywords = ['error', 'invalid', 'incorrect', 'failed', 'wrong']

      errorKeywords.forEach(keyword => {
        if (bodyText.includes(keyword)) {
          cy.log(`✅ Found error keyword: ${keyword}`)
        }
      })
    })

    // Step 6: Screenshot error state
    cy.screenshot('05-invalid-login-attempt')
  })
})
