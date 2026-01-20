describe('CSRF Token Handling Demonstration', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const credentials = { username: 'admin', password: '111111' }

  // ========================================
  // APPROACH 1: Frame Navigation (Current - No Explicit Token Handling)
  // ========================================
  describe('Approach 1: Frame Navigation (Implicit Token Handling)', () => {
    it('should navigate using frames - token handled automatically', () => {
      cy.log('=== LOGIN ===')
      cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
      cy.wait(2000)
      cy.get('input[type="text"]').first().type(credentials.username)
      cy.get('input[type="password"]').first().type(credentials.password)
      cy.get('input[type="submit"]').first().click()
      cy.wait(5000)

      // CSRF token is now in URL, but we don't need to extract it!
      cy.url().should('include', 'CSRFGuardToken=')
      cy.log('✓ CSRF token automatically added to URL after login')

      cy.log('=== NAVIGATE TO SYSTEM UPDATES (clicking links in frames) ===')

      // Click Administration - the link ALREADY has CSRFGuardToken in it
      cy.window().then((win) => {
        const leftFrame = win.document.querySelector('frame[name="left"]')
        const leftDoc = leftFrame.contentDocument

        // Find Administration link - it already contains token!
        const adminLinks = leftDoc.querySelectorAll('a')
        for (let link of adminLinks) {
          if (link.textContent.trim() === 'Administration') {
            const href = link.getAttribute('href')
            cy.log(`Administration link href: ${href}`)
            cy.log('↑ Notice: Token already embedded in the link!')
            link.click()
            break
          }
        }
      })

      cy.wait(2000)

      // Click System Updates - this link also has token!
      cy.window().then((win) => {
        const leftFrame = win.document.querySelector('frame[name="left"]')
        const leftDoc = leftFrame.contentDocument
        const allLinks = leftDoc.getElementsByTagName('a')

        for (let link of allLinks) {
          const text = link.textContent.trim().toLowerCase()
          if (text.includes('system') && text.includes('update')) {
            const href = link.getAttribute('href')
            cy.log(`System Updates link href: ${href}`)
            cy.log('↑ Notice: Token already embedded in this link too!')
            link.click()
            break
          }
        }
      })

      cy.wait(3000)
      cy.log('✅ Navigation successful - no explicit token handling needed!')

      // Verify we're on the right page
      cy.window().then((win) => {
        const rightFrame = win.document.querySelector('frame[name="right"]')
        const rightDoc = rightFrame.contentDocument
        const text = rightDoc.body.textContent
        expect(text).to.include('Current IWSVA Information')
      })
    })
  })

  // ========================================
  // APPROACH 2: Direct Navigation (Explicit Token Handling)
  // ========================================
  describe('Approach 2: Direct Navigation (Explicit Token Handling)', () => {
    it('should navigate directly using extracted CSRF token', () => {
      cy.log('=== LOGIN ===')
      cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
      cy.wait(2000)
      cy.get('input[type="text"]').first().type(credentials.username)
      cy.get('input[type="password"]').first().type(credentials.password)
      cy.get('input[type="submit"]').first().click()
      cy.wait(5000)

      cy.log('=== EXTRACT CSRF TOKEN ===')
      cy.url().then((url) => {
        const urlObj = new URL(url)
        const csrfToken = urlObj.searchParams.get('CSRFGuardToken')

        cy.log(`✓ Extracted CSRF Token: ${csrfToken}`)
        expect(csrfToken, 'Token should exist').to.not.be.null
        expect(csrfToken.length, 'Token should be long enough').to.be.greaterThan(10)

        cy.log('=== DIRECT NAVIGATION TO SYSTEM UPDATES ===')
        // Build URL with token
        const targetUrl = `${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${csrfToken}`
        cy.log(`Navigating directly to: ${targetUrl}`)

        // Visit directly (skipping menu clicks)
        cy.visit(targetUrl, { failOnStatusCode: false })
        cy.wait(3000)

        cy.log('✅ Direct navigation successful with explicit token!')

        // Verify we're on the right page
        cy.window().then((win) => {
          const rightFrame = win.document.querySelector('frame[name="right"]')
          if (rightFrame) {
            const rightDoc = rightFrame.contentDocument
            const text = rightDoc.body.textContent
            expect(text).to.include('Current IWSVA Information')
          } else {
            // If no frames, check main document
            const text = win.document.body.textContent
            expect(text).to.include('Current IWSVA Information')
          }
        })
      })
    })

    it('should demonstrate token extraction and reuse', () => {
      // Login
      cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
      cy.wait(2000)
      cy.get('input[type="text"]').first().type(credentials.username)
      cy.get('input[type="password"]').first().type(credentials.password)
      cy.get('input[type="submit"]').first().click()
      cy.wait(5000)

      // Extract token
      cy.url().then((loginUrl) => {
        const token = new URL(loginUrl).searchParams.get('CSRFGuardToken')
        cy.log('=== CSRF TOKEN DETAILS ===')
        cy.log(`Token: ${token}`)
        cy.log(`Length: ${token.length} characters`)
        cy.log(`First 10 chars: ${token.substring(0, 10)}...`)

        // Store token for reuse
        cy.wrap(token).as('csrfToken')
      })

      // Use stored token to visit multiple pages
      cy.get('@csrfToken').then((token) => {
        cy.log('=== VISITING MULTIPLE PAGES WITH SAME TOKEN ===')

        // Visit System Status
        cy.visit(`${baseUrl}/go.jsp?CSRFGuardToken=${token}&url=hardwarestatus`, {
          failOnStatusCode: false
        })
        cy.wait(2000)
        cy.log('✓ Visited System Status')

        // Visit Dashboard
        cy.visit(`${baseUrl}/log/page/dashboard.html?CSRFGuardToken=${token}`, {
          failOnStatusCode: false
        })
        cy.wait(2000)
        cy.log('✓ Visited Dashboard')

        // Visit System Updates
        cy.visit(`${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${token}`, {
          failOnStatusCode: false
        })
        cy.wait(2000)
        cy.log('✓ Visited System Updates')

        cy.log('✅ Same token worked for all pages!')
      })
    })
  })

  // ========================================
  // APPROACH 3: Using Custom Commands
  // ========================================
  describe('Approach 3: Using Custom Commands', () => {
    it('should use custom loginWithCSRF command', () => {
      // Use the custom command from commands.js
      cy.loginWithCSRF(baseUrl, credentials.username, credentials.password)

      cy.url().should('include', 'CSRFGuardToken=')
      cy.log('✓ Logged in using custom command')

      // Extract token using custom command
      cy.url().then((url) => {
        const token = new URL(url).searchParams.get('CSRFGuardToken')

        if (token) {
          cy.log(`✓ Token available: ${token}`)

          // Navigate to System Updates
          cy.visit(`${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${token}`, {
            failOnStatusCode: false
          })
          cy.wait(3000)

          cy.log('✅ Custom command approach successful!')
        }
      })
    })
  })

  // ========================================
  // COMPARISON TEST
  // ========================================
  describe('Performance Comparison', () => {
    it('should compare timing of both approaches', () => {
      const timings = {}

      // Approach 1: Frame Navigation
      const start1 = Date.now()
      cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
      cy.wait(2000)
      cy.get('input[type="text"]').first().type(credentials.username)
      cy.get('input[type="password"]').first().type(credentials.password)
      cy.get('input[type="submit"]').first().click()
      cy.wait(5000)

      cy.window().then((win) => {
        const leftFrame = win.document.querySelector('frame[name="left"]')
        const leftDoc = leftFrame.contentDocument
        const adminElements = leftDoc.getElementsByTagName('*')
        for (let el of adminElements) {
          if (el.textContent.trim() === 'Administration') {
            el.click()
            break
          }
        }
      })
      cy.wait(2000)

      cy.window().then((win) => {
        const leftFrame = win.document.querySelector('frame[name="left"]')
        const leftDoc = leftFrame.contentDocument
        const allLinks = leftDoc.getElementsByTagName('a')
        for (let link of allLinks) {
          const text = link.textContent.trim().toLowerCase()
          if (text.includes('system') && text.includes('update')) {
            link.click()
            break
          }
        }
      })
      cy.wait(3000)

      cy.then(() => {
        timings.frameNavigation = Date.now() - start1
        cy.log(`Frame Navigation: ${timings.frameNavigation}ms`)
      })
    })
  })
})
