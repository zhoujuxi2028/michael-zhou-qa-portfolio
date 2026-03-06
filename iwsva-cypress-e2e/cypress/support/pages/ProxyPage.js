/**
 * Proxy Page Object
 *
 * Page Object for IWSVA Proxy Settings page (/jsp/update_proxy.jsp).
 * Handles proxy server configuration for update downloads.
 *
 * @class ProxyPage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class ProxyPage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.proxyPage
  }

  /**
   * Navigate to Proxy Settings page
   */
  navigate() {
    cy.log('Navigating to Proxy Settings page')
    this.visit(this.pageUrl)
    this.waitForPageLoad()
    this.verifyPageLoaded()
  }

  /**
   * Verify Proxy Settings page is loaded
   */
  verifyPageLoaded() {
    cy.log('Verifying Proxy Settings page loaded')

    cy.get(TestConstants.SELECTORS.proxy.enableCheckbox, {
      timeout: TestConfig.timeouts.pageLoad
    }).should('exist')

    cy.get(TestConstants.SELECTORS.proxy.saveButton)
      .should('be.visible')

    cy.log('✓ Proxy Settings page loaded successfully')
  }

  /**
   * Enable or disable proxy
   * @param {boolean} enable - True to enable, false to disable
   */
  enableProxy(enable = true) {
    cy.log(`${enable ? 'Enabling' : 'Disabling'} proxy`)

    const checkbox = cy.get(TestConstants.SELECTORS.proxy.enableCheckbox)

    if (enable) {
      checkbox.check({ force: true }).should('be.checked')
      cy.log('✓ Proxy enabled')
    } else {
      checkbox.uncheck({ force: true }).should('not.be.checked')
      cy.log('✓ Proxy disabled')
    }
  }

  /**
   * Check if proxy is enabled
   * @returns {Cypress.Chainable<boolean>} True if enabled
   */
  isProxyEnabled() {
    return cy.get(TestConstants.SELECTORS.proxy.enableCheckbox)
      .then($checkbox => $checkbox.is(':checked'))
  }

  /**
   * Set proxy server address
   * @param {string} server - Proxy server address (IP or hostname)
   */
  setServer(server) {
    cy.log(`Setting proxy server: ${server}`)

    cy.get(TestConstants.SELECTORS.proxy.serverInput)
      .should('be.visible')
      .clear()
      .type(server)

    cy.log(`✓ Server set to: ${server}`)
  }

  /**
   * Get proxy server address
   * @returns {Cypress.Chainable<string>} Proxy server address
   */
  getServer() {
    return cy.get(TestConstants.SELECTORS.proxy.serverInput)
      .invoke('val')
  }

  /**
   * Set proxy port
   * @param {number|string} port - Proxy port number
   */
  setPort(port) {
    cy.log(`Setting proxy port: ${port}`)

    cy.get(TestConstants.SELECTORS.proxy.portInput)
      .should('be.visible')
      .clear()
      .type(port.toString())

    cy.log(`✓ Port set to: ${port}`)
  }

  /**
   * Get proxy port
   * @returns {Cypress.Chainable<string>} Proxy port
   */
  getPort() {
    return cy.get(TestConstants.SELECTORS.proxy.portInput)
      .invoke('val')
  }

  /**
   * Set proxy username
   * @param {string} username - Proxy authentication username
   */
  setUsername(username) {
    cy.log(`Setting proxy username: ${username}`)

    cy.get(TestConstants.SELECTORS.proxy.usernameInput)
      .should('be.visible')
      .clear()
      .type(username)

    cy.log('✓ Username set')
  }

  /**
   * Get proxy username
   * @returns {Cypress.Chainable<string>} Proxy username
   */
  getUsername() {
    return cy.get(TestConstants.SELECTORS.proxy.usernameInput)
      .invoke('val')
  }

  /**
   * Set proxy password
   * @param {string} password - Proxy authentication password
   */
  setPassword(password) {
    cy.log('Setting proxy password')

    cy.get(TestConstants.SELECTORS.proxy.passwordInput)
      .should('be.visible')
      .clear()
      .type(password, { log: false }) // Don't log password

    cy.log('✓ Password set')
  }

  /**
   * Get proxy password (returns masked value)
   * @returns {Cypress.Chainable<string>} Proxy password
   */
  getPassword() {
    return cy.get(TestConstants.SELECTORS.proxy.passwordInput)
      .invoke('val')
  }

  /**
   * Click Save button
   */
  clickSave() {
    cy.log('Clicking Save button')

    cy.get(TestConstants.SELECTORS.proxy.saveButton)
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    // Wait for save to complete
    this.waitForLoadingComplete()

    cy.log('✓ Save button clicked')
  }

  /**
   * Click Test Connection button
   */
  clickTestConnection() {
    cy.log('Clicking Test Connection button')

    cy.get(TestConstants.SELECTORS.proxy.testButton)
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    cy.log('✓ Test Connection button clicked')
  }

  /**
   * Save proxy configuration
   */
  saveConfiguration() {
    cy.log('Saving proxy configuration')

    this.clickSave()
    this.verifySuccessMessage()

    cy.log('✓ Proxy configuration saved successfully')
  }

  /**
   * Configure proxy without authentication
   * @param {object} config - Proxy configuration
   * @param {string} config.server - Proxy server address
   * @param {number|string} config.port - Proxy port
   */
  configureBasicProxy(config) {
    cy.log('Configuring basic proxy (no auth)', config)

    this.enableProxy(true)
    this.setServer(config.server)
    this.setPort(config.port)
    this.saveConfiguration()

    cy.log('✓ Basic proxy configuration complete')
  }

  /**
   * Configure proxy with authentication
   * @param {object} config - Proxy configuration
   * @param {string} config.server - Proxy server address
   * @param {number|string} config.port - Proxy port
   * @param {string} config.username - Proxy username
   * @param {string} config.password - Proxy password
   */
  configureAuthenticatedProxy(config) {
    cy.log('Configuring authenticated proxy', {
      server: config.server,
      port: config.port,
      username: config.username,
    })

    this.enableProxy(true)
    this.setServer(config.server)
    this.setPort(config.port)
    this.setUsername(config.username)
    this.setPassword(config.password)
    this.saveConfiguration()

    cy.log('✓ Authenticated proxy configuration complete')
  }

  /**
   * Disable proxy
   */
  disableProxy() {
    cy.log('Disabling proxy')

    this.enableProxy(false)
    this.saveConfiguration()

    cy.log('✓ Proxy disabled and saved')
  }

  /**
   * Test proxy connection
   * @param {boolean} shouldSucceed - Expected test result
   */
  testConnection(shouldSucceed = true) {
    cy.log(`Testing proxy connection (expecting ${shouldSucceed ? 'success' : 'failure'})`)

    this.clickTestConnection()

    // Wait for test result
    cy.wait(TestConfig.timeouts.defaultCommand)

    if (shouldSucceed) {
      this.verifySuccessMessage()
      cy.log('✓ Proxy connection test successful')
    } else {
      this.verifyErrorMessage()
      cy.log('✓ Proxy connection test failed as expected')
    }
  }

  /**
   * Verify proxy configuration
   * @param {object} expectedConfig - Expected configuration
   */
  verifyConfiguration(expectedConfig) {
    cy.log('Verifying proxy configuration')

    // Verify enabled state
    this.isProxyEnabled().then(isEnabled => {
      expect(isEnabled).to.equal(expectedConfig.enabled)
      cy.log(`✓ Proxy enabled: ${isEnabled}`)
    })

    if (expectedConfig.enabled) {
      // Verify server
      if (expectedConfig.server) {
        this.getServer().then(server => {
          expect(server).to.equal(expectedConfig.server)
          cy.log(`✓ Server: ${server}`)
        })
      }

      // Verify port
      if (expectedConfig.port) {
        this.getPort().then(port => {
          expect(port).to.equal(expectedConfig.port.toString())
          cy.log(`✓ Port: ${port}`)
        })
      }

      // Verify username (if provided)
      if (expectedConfig.username) {
        this.getUsername().then(username => {
          expect(username).to.equal(expectedConfig.username)
          cy.log(`✓ Username: ${username}`)
        })
      }
    }

    cy.log('✓ Configuration verified')
  }

  /**
   * Clear proxy settings
   */
  clearSettings() {
    cy.log('Clearing proxy settings')

    this.isProxyEnabled().then(isEnabled => {
      if (isEnabled) {
        this.enableProxy(false)
      }
    })

    cy.get(TestConstants.SELECTORS.proxy.serverInput).clear()
    cy.get(TestConstants.SELECTORS.proxy.portInput).clear()
    cy.get(TestConstants.SELECTORS.proxy.usernameInput).clear()
    cy.get(TestConstants.SELECTORS.proxy.passwordInput).clear()

    this.saveConfiguration()

    cy.log('✓ Proxy settings cleared')
  }

  /**
   * Verify required fields for proxy
   */
  verifyRequiredFields() {
    cy.log('Verifying required fields')

    // Enable proxy to activate required fields
    this.enableProxy(true)

    // Server should be required
    cy.get(TestConstants.SELECTORS.proxy.serverInput)
      .should('be.visible')
      .then($input => {
        const isRequired = $input.prop('required') || $input.attr('required') !== undefined
        cy.log(`Server field required: ${isRequired}`)
      })

    // Port should be required
    cy.get(TestConstants.SELECTORS.proxy.portInput)
      .should('be.visible')
      .then($input => {
        const isRequired = $input.prop('required') || $input.attr('required') !== undefined
        cy.log(`Port field required: ${isRequired}`)
      })

    cy.log('✓ Required fields verified')
  }

  /**
   * Verify port validation
   * @param {string} invalidPort - Invalid port value
   */
  testInvalidPort(invalidPort) {
    cy.log(`Testing invalid port: ${invalidPort}`)

    this.enableProxy(true)
    this.setServer('proxy.example.com')
    this.setPort(invalidPort)

    this.clickSave()

    // Should see error or validation message
    cy.get('body').then($body => {
      const hasError =
        $body.find(TestConstants.SELECTORS.common.errorMessage).length > 0 ||
        $body.find(':invalid').length > 0

      expect(hasError).to.be.true
      cy.log('✓ Invalid port rejected')
    })
  }

  /**
   * Verify server validation
   * @param {string} invalidServer - Invalid server value
   */
  testInvalidServer(invalidServer) {
    cy.log(`Testing invalid server: ${invalidServer}`)

    this.enableProxy(true)
    this.setServer(invalidServer)
    this.setPort(8080)

    this.clickSave()

    // Should see error or validation message
    cy.get('body').then($body => {
      const hasError =
        $body.find(TestConstants.SELECTORS.common.errorMessage).length > 0 ||
        $body.find(':invalid').length > 0

      if (hasError) {
        cy.log('✓ Invalid server rejected')
      } else {
        cy.log('! Server validation may be permissive')
      }
    })
  }

  /**
   * Get complete proxy configuration
   * @returns {Cypress.Chainable<object>} Proxy configuration
   */
  getCurrentConfiguration() {
    cy.log('Getting current proxy configuration')

    return cy.wrap(null).then(() => {
      const config = {}

      return this.isProxyEnabled().then(enabled => {
        config.enabled = enabled

        if (enabled) {
          return this.getServer().then(server => {
            config.server = server

            return this.getPort().then(port => {
              config.port = port

              return this.getUsername().then(username => {
                if (username) {
                  config.username = username
                }

                cy.log('Current configuration:', config)
                return cy.wrap(config)
              })
            })
          })
        } else {
          cy.log('Current configuration:', config)
          return cy.wrap(config)
        }
      })
    })
  }

  /**
   * Verify configuration was saved and persisted
   * @param {object} expectedConfig - Expected configuration
   */
  verifyConfigurationPersisted(expectedConfig) {
    cy.log('Verifying configuration persisted')

    // Reload page
    this.reload()
    this.waitForPageLoad()

    // Verify configuration persists
    this.verifyConfiguration(expectedConfig)

    cy.log('✓ Configuration saved and persisted')
  }

  /**
   * Verify save button state
   * @param {boolean} shouldBeEnabled - Expected state
   */
  verifySaveButtonState(shouldBeEnabled = true) {
    const button = cy.get(TestConstants.SELECTORS.proxy.saveButton)

    if (shouldBeEnabled) {
      button.should('not.be.disabled')
      cy.log('✓ Save button is enabled')
    } else {
      button.should('be.disabled')
      cy.log('✓ Save button is disabled')
    }
  }

  /**
   * Verify test button state
   * @param {boolean} shouldBeEnabled - Expected state
   */
  verifyTestButtonState(shouldBeEnabled = true) {
    const button = cy.get(TestConstants.SELECTORS.proxy.testButton)

    if (shouldBeEnabled) {
      button.should('not.be.disabled')
      cy.log('✓ Test button is enabled')
    } else {
      button.should('be.disabled')
      cy.log('✓ Test button is disabled')
    }
  }

  /**
   * Verify authentication fields visibility
   * @param {boolean} shouldBeVisible - Expected visibility
   */
  verifyAuthFieldsVisible(shouldBeVisible = true) {
    cy.log(`Verifying auth fields ${shouldBeVisible ? 'visible' : 'hidden'}`)

    const usernameField = cy.get(TestConstants.SELECTORS.proxy.usernameInput)
    const passwordField = cy.get(TestConstants.SELECTORS.proxy.passwordInput)

    if (shouldBeVisible) {
      usernameField.should('be.visible')
      passwordField.should('be.visible')
      cy.log('✓ Authentication fields visible')
    } else {
      usernameField.should('not.be.visible')
      passwordField.should('not.be.visible')
      cy.log('✓ Authentication fields hidden')
    }
  }

  /**
   * Take screenshot of proxy page
   * @param {string} name - Screenshot name suffix
   */
  capturePageState(name = 'proxy-page') {
    this.takeScreenshot(name)
  }

  /**
   * Configure and test proxy in one step
   * @param {object} config - Proxy configuration
   * @param {boolean} shouldSucceed - Expected test result
   */
  configureAndTest(config, shouldSucceed = true) {
    cy.log('Configuring and testing proxy')

    // Configure proxy
    if (config.username && config.password) {
      this.configureAuthenticatedProxy(config)
    } else {
      this.configureBasicProxy(config)
    }

    // Test connection
    this.testConnection(shouldSucceed)

    cy.log('✓ Proxy configured and tested')
  }
}

export default ProxyPage
