/**
 * Base Page Object
 *
 * Base class for all Page Objects with common functionality.
 * Handles frame navigation, login, and common operations.
 *
 * @class BasePage
 */

import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class BasePage {
  constructor() {
    this.baseUrl = Cypress.config('baseUrl')
    this.timeout = TestConfig.timeouts.pageLoad
  }

  /**
   * Navigate to a URL
   * @param {string} url - URL to navigate to (relative or absolute)
   * @param {object} options - Cypress visit options
   */
  visit(url, options = {}) {
    const defaultOptions = {
      timeout: this.timeout,
      failOnStatusCode: false, // Don't fail on redirect
    }
    cy.visit(url, { ...defaultOptions, ...options })
  }

  /**
   * Login to IWSVA admin interface
   * @param {string} username - Username (defaults to env variable)
   * @param {string} password - Password (defaults to env variable)
   */
  login(username = null, password = null) {
    const user = username || Cypress.env('username')
    const pass = password || Cypress.env('password')

    if (!user || !pass) {
      throw new Error('Username and password must be provided or set in cypress.env.json')
    }

    cy.log(`Logging in as: ${user}`)

    // Navigate to login page
    this.visit(TestConfig.urls.loginPage)

    // Enter credentials
    cy.get(TestConstants.SELECTORS.login.usernameInput, { timeout: TestConfig.timeouts.elementVisible })
      .first()  // Handle multiple matches
      .should('be.visible')
      .clear()
      .type(user)

    cy.get(TestConstants.SELECTORS.login.passwordInput)
      .first()  // Handle multiple matches
      .should('be.visible')
      .clear()
      .type(pass, { log: false }) // Don't log password

    // Submit login
    cy.get(TestConstants.SELECTORS.login.loginButton)
      .should('be.visible')
      .click()

    // Wait for successful login (check for logged-in state)
    cy.url().should('not.include', '/login.jsp', { timeout: TestConfig.timeouts.pageLoad })

    cy.log('Login successful')
  }

  /**
   * Logout from IWSVA admin interface
   */
  logout() {
    cy.log('Logging out')
    // Implementation depends on IWSVA logout mechanism
    // Usually a logout link or session clear
    cy.clearCookies()
    cy.clearLocalStorage()
  }

  /**
   * Handle frame navigation (IWSVA uses frames)
   * @param {string} frameName - Frame name to switch to
   * @returns {Cypress.Chainable} Frame contents
   */
  switchToFrame(frameName) {
    cy.log(`Switching to frame: ${frameName}`)

    return cy.frameLoaded(frameName)
      .then(() => {
        return cy.iframe(frameName)
      })
  }

  /**
   * Get element within frame
   * @param {string} frameName - Frame name
   * @param {string} selector - Element selector
   * @returns {Cypress.Chainable} Element within frame
   */
  getInFrame(frameName, selector) {
    return this.switchToFrame(frameName).find(selector)
  }

  /**
   * Wait for element to be visible
   * @param {string} selector - Element selector
   * @param {number} timeout - Custom timeout
   * @returns {Cypress.Chainable} Element
   */
  waitForElement(selector, timeout = TestConfig.timeouts.elementVisible) {
    return cy.get(selector, { timeout }).should('be.visible')
  }

  /**
   * Wait for element to disappear
   * @param {string} selector - Element selector
   * @param {number} timeout - Custom timeout
   */
  waitForElementToDisappear(selector, timeout = TestConfig.timeouts.elementVisible) {
    cy.get(selector, { timeout }).should('not.exist')
  }

  /**
   * Check if element exists
   * @param {string} selector - Element selector
   * @returns {Cypress.Chainable<boolean>} True if exists
   */
  elementExists(selector) {
    return cy.get('body').then($body => {
      return $body.find(selector).length > 0
    })
  }

  /**
   * Get element text
   * @param {string} selector - Element selector
   * @returns {Cypress.Chainable<string>} Element text
   */
  getElementText(selector) {
    return cy.get(selector).invoke('text').then(text => text.trim())
  }

  /**
   * Click element with retry
   * @param {string} selector - Element selector
   * @param {number} retries - Number of retries
   */
  clickWithRetry(selector, retries = 3) {
    let attempts = 0

    const attemptClick = () => {
      attempts++
      cy.log(`Click attempt ${attempts}/${retries}`)

      return cy.get(selector)
        .should('be.visible')
        .should('not.be.disabled')
        .click({ force: true })
        .then(() => {
          cy.log('Click successful')
        })
        .catch(err => {
          if (attempts < retries) {
            cy.log(`Click failed, retrying...`)
            cy.wait(1000)
            return attemptClick()
          } else {
            throw err
          }
        })
    }

    return attemptClick()
  }

  /**
   * Wait for loading spinner to disappear
   * @param {number} timeout - Custom timeout
   */
  waitForLoadingComplete(timeout = TestConfig.timeouts.defaultCommand) {
    const spinner = TestConstants.SELECTORS.common.loadingSpinner

    cy.get('body').then($body => {
      if ($body.find(spinner).length > 0) {
        cy.log('Waiting for loading spinner to disappear...')
        cy.get(spinner, { timeout }).should('not.exist')
      }
    })
  }

  /**
   * Verify success message displayed
   * @param {string} expectedMessage - Expected message text (optional)
   */
  verifySuccessMessage(expectedMessage = null) {
    cy.get(TestConstants.SELECTORS.common.successMessage, {
      timeout: TestConfig.timeouts.elementVisible
    })
      .should('be.visible')
      .then($msg => {
        if (expectedMessage) {
          expect($msg.text()).to.include(expectedMessage)
        }
        cy.log(`Success message displayed: ${$msg.text()}`)
      })
  }

  /**
   * Verify error message displayed
   * @param {string} expectedMessage - Expected error message (optional)
   */
  verifyErrorMessage(expectedMessage = null) {
    cy.get(TestConstants.SELECTORS.common.errorMessage, {
      timeout: TestConfig.timeouts.elementVisible
    })
      .should('be.visible')
      .then($msg => {
        if (expectedMessage) {
          expect($msg.text()).to.include(expectedMessage)
        }
        cy.log(`Error message displayed: ${$msg.text()}`)
      })
  }

  /**
   * Take screenshot with name
   * @param {string} name - Screenshot name
   */
  takeScreenshot(name) {
    cy.screenshot(name, {
      capture: 'fullPage',
      overwrite: true,
    })
  }

  /**
   * Reload page
   */
  reload() {
    cy.log('Reloading page')
    cy.reload()
  }

  /**
   * Go back
   */
  goBack() {
    cy.log('Going back')
    cy.go('back')
  }

  /**
   * Get current URL
   * @returns {Cypress.Chainable<string>} Current URL
   */
  getCurrentUrl() {
    return cy.url()
  }

  /**
   * Verify page URL
   * @param {string} expectedUrl - Expected URL or path
   */
  verifyUrl(expectedUrl) {
    cy.url().should('include', expectedUrl)
  }

  /**
   * Wait for page to load
   * @param {number} timeout - Custom timeout
   */
  waitForPageLoad(timeout = TestConfig.timeouts.pageLoad) {
    cy.log('Waiting for page to load...')

    // Wait for document ready state
    cy.document().should('have.property', 'readyState').and('eq', 'complete')

    // Wait for any loading indicators to disappear
    this.waitForLoadingComplete(timeout)

    cy.log('Page loaded')
  }

  /**
   * Execute custom command with logging
   * @param {string} commandName - Name of command
   * @param {Function} command - Command function
   */
  executeCommand(commandName, command) {
    cy.log(`Executing: ${commandName}`)
    return command()
  }

  /**
   * Verify page title
   * @param {string} expectedTitle - Expected page title
   */
  verifyPageTitle(expectedTitle) {
    cy.title().should('include', expectedTitle)
  }

  /**
   * Handle confirmation dialog
   * @param {boolean} accept - True to accept, false to cancel
   */
  handleConfirmation(accept = true) {
    if (accept) {
      cy.log('Accepting confirmation dialog')
      cy.get(TestConstants.SELECTORS.dialog.confirmButton)
        .should('be.visible')
        .click()
    } else {
      cy.log('Cancelling confirmation dialog')
      cy.get(TestConstants.SELECTORS.dialog.cancelButton)
        .should('be.visible')
        .click()
    }
  }

  /**
   * Verify confirmation dialog message
   * @param {string} expectedMessage - Expected dialog message
   */
  verifyConfirmationMessage(expectedMessage) {
    cy.get(TestConstants.SELECTORS.dialog.dialogMessage)
      .should('be.visible')
      .and('contain', expectedMessage)
  }
}

export default BasePage
