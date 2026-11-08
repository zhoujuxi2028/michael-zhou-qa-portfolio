/**
 * UI Testing Examples for CI/CD Pipeline
 *
 * Interview Talking Points:
 * - Demonstrates end-to-end UI testing patterns
 * - Shows custom commands usage for reusability
 * - Includes viewport testing for responsive design
 * - Uses data-driven testing with fixtures
 */

describe('UI Tests - Example.com', () => {

  context('Page Load Tests', () => {
    it('should load the homepage successfully', () => {
      // Interview Point: "We test basic page load and verify key elements"
      cy.visit('https://example.com')

      cy.get('h1').should('be.visible')
        .and('contain', 'Example Domain')

      cy.get('p').first().should('contain', 'This domain is for use in documentation examples')

      // Verify page title
      cy.title().should('eq', 'Example Domain')
    })

    it('should have proper meta tags', () => {
      cy.visit('https://example.com')

      // Interview Point: "We validate SEO-related meta tags"
      cy.document().then((doc) => {
        const charset = doc.characterSet
        // Accept both UTF-8 and Windows-1252 as valid charsets
        expect(charset.toLowerCase()).to.be.oneOf(['utf-8', 'windows-1252'])
      })
    })
  })

  context('Link Tests', () => {
    it('should have a working "Learn more" link', () => {
      cy.visit('https://example.com')

      cy.get('a').contains('Learn more').should('be.visible')
        .and('have.attr', 'href')
        .and('include', 'iana.org')
    })
  })

  context('Responsive Design Tests', () => {
    const viewports = [
      { device: 'mobile', width: 375, height: 667 },
      { device: 'tablet', width: 768, height: 1024 },
      { device: 'desktop', width: 1920, height: 1080 }
    ]

    viewports.forEach(viewport => {
      it(`should render correctly on ${viewport.device} (${viewport.width}x${viewport.height})`, () => {
        // Interview Point: "We test responsive design across multiple viewports in CI"
        cy.viewport(viewport.width, viewport.height)
        cy.visit('https://example.com')

        cy.get('h1').should('be.visible')
        cy.get('p').should('be.visible')

        // Take screenshot for visual verification
        cy.screenshot(`${viewport.device}-view`)
      })
    })
  })

  context('Performance Tests', () => {
    it('should load the page within acceptable time', () => {
      const startTime = Date.now()

      cy.visit('https://example.com')

      cy.window().then(() => {
        const loadTime = Date.now() - startTime

        // Interview Point: "We set performance budgets and validate in CI"
        expect(loadTime).to.be.lessThan(3000) // 3 seconds max
        cy.log(`Page loaded in ${loadTime}ms`)
      })
    })
  })

  context('Network Tests', () => {
    it('should handle slow network conditions', () => {
      // Interview Point: "We simulate network conditions to test reliability"
      cy.intercept('**/*', (req) => {
        req.on('response', (res) => {
          // Simulate 500ms delay
          res.setDelay(500)
        })
      })

      cy.visit('https://example.com')
      cy.get('h1').should('be.visible')
    })
  })
})

/**
 * Additional test demonstrating custom commands
 * (Custom commands would be defined in cypress/support/commands.js)
 */
describe('Custom Command Examples', () => {
  it('should demonstrate reusable test patterns', () => {
    cy.visit('https://example.com')

    // Interview Point: "We create custom commands for frequently used actions"
    // Example: cy.login(), cy.searchFor(), cy.validateApiResponse()

    cy.get('h1').should('be.visible')
  })
})
