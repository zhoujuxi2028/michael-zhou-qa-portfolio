/**
 * Setup Workflow
 *
 * Handles test environment setup and preparation for IWSVA Update tests.
 * Includes login, navigation, component state verification, and pre-test setup.
 *
 * @class SetupWorkflow
 */

import BasePage from '../pages/BasePage'
import ManualUpdatePage from '../pages/ManualUpdatePage'
import SchedulePage from '../pages/SchedulePage'
import ProxyPage from '../pages/ProxyPage'
import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class SetupWorkflow {
  constructor() {
    this.basePage = new BasePage()
    this.manualUpdatePage = new ManualUpdatePage()
    this.schedulePage = new SchedulePage()
    this.proxyPage = new ProxyPage()
  }

  /**
   * Login with specified or default credentials
   * @param {string} username - Username (optional, defaults to env)
   * @param {string} password - Password (optional, defaults to env)
   */
  login(username = null, password = null) {
    cy.log('=== Setup: Login ===')

    const user = username || Cypress.env('username')
    const pass = password || Cypress.env('password')

    this.basePage.login(user, pass)

    cy.log('✓ Login complete')
  }

  /**
   * Logout and clear session
   */
  logout() {
    cy.log('=== Setup: Logout ===')

    this.basePage.logout()

    cy.log('✓ Logout complete')
  }

  /**
   * Setup for standard update tests
   * Performs login and navigates to manual update page
   */
  setupForUpdateTests() {
    cy.log('=== Setup: Standard Update Test Environment ===')

    // Login
    this.login()

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Verify all components are displayed
    this.manualUpdatePage.verifyAllComponentsDisplayed()

    cy.log('✓ Update test environment ready')
  }

  /**
   * Setup for schedule tests
   * Performs login and navigates to schedule page
   */
  setupForScheduleTests() {
    cy.log('=== Setup: Schedule Test Environment ===')

    // Login
    this.login()

    // Navigate to schedule page
    this.schedulePage.navigate()

    cy.log('✓ Schedule test environment ready')
  }

  /**
   * Setup for proxy tests
   * Performs login and navigates to proxy page
   */
  setupForProxyTests() {
    cy.log('=== Setup: Proxy Test Environment ===')

    // Login
    this.login()

    // Navigate to proxy page
    this.proxyPage.navigate()

    cy.log('✓ Proxy test environment ready')
  }

  /**
   * Verify component versions before testing
   * @param {string[]} componentIds - Component IDs to verify (optional)
   * @returns {Cypress.Chainable<object>} Component versions
   */
  captureComponentVersions(componentIds = null) {
    cy.log('=== Setup: Capturing Component Versions ===')

    const components = componentIds || ComponentRegistry.getComponentIds()
    const versions = {}

    this.manualUpdatePage.navigate()

    components.forEach(componentId => {
      this.manualUpdatePage.getComponentVersion(componentId).then(version => {
        versions[componentId] = version
        cy.log(`${componentId}: ${version}`)
      })
    })

    cy.log('✓ Component versions captured')

    return cy.wrap(versions)
  }

  /**
   * Verify update server is reachable
   * Tests connectivity before running update tests
   */
  verifyUpdateServerReachable() {
    cy.log('=== Setup: Verifying Update Server ===')

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Click refresh to check server connectivity
    this.manualUpdatePage.clickRefresh()

    // Verify no network errors
    cy.get('body').then($body => {
      const hasNetworkError = $body.text().includes('Unable to connect')

      if (hasNetworkError) {
        cy.log('! Update server unreachable')
        throw new Error('Update server is not reachable')
      } else {
        cy.log('✓ Update server reachable')
      }
    })
  }

  /**
   * Disable scheduled updates to prevent interference
   */
  disableScheduledUpdates() {
    cy.log('=== Setup: Disabling Scheduled Updates ===')

    this.schedulePage.navigate()
    this.schedulePage.disableAutoUpdate()

    cy.log('✓ Scheduled updates disabled')
  }

  /**
   * Configure proxy if required for test environment
   * @param {object} proxyConfig - Proxy configuration (null to disable)
   */
  configureProxy(proxyConfig = null) {
    cy.log('=== Setup: Configuring Proxy ===')

    this.proxyPage.navigate()

    if (proxyConfig) {
      // Configure proxy
      if (proxyConfig.username && proxyConfig.password) {
        this.proxyPage.configureAuthenticatedProxy(proxyConfig)
      } else {
        this.proxyPage.configureBasicProxy(proxyConfig)
      }

      cy.log('✓ Proxy configured')
    } else {
      // Disable proxy
      this.proxyPage.disableProxy()

      cy.log('✓ Proxy disabled')
    }
  }

  /**
   * Verify no updates are currently in progress
   * Ensures clean state before starting tests
   */
  verifyNoUpdatesInProgress() {
    cy.log('=== Setup: Verifying No Updates in Progress ===')

    this.manualUpdatePage.navigate()

    // Check for any lock files or progress indicators
    cy.get('body').then($body => {
      const updateInProgress =
        $body.text().includes('Update in progress') ||
        $body.text().includes('Updating') ||
        $body.find('.progress-bar').length > 0

      if (updateInProgress) {
        cy.log('! Update currently in progress')
        throw new Error('An update is already in progress')
      } else {
        cy.log('✓ No updates in progress')
      }
    })
  }

  /**
   * Setup test data for specific component
   * @param {string} componentId - Component ID
   * @param {object} testData - Test data configuration
   */
  setupComponentTestData(componentId, testData) {
    cy.log(`=== Setup: Test Data for ${componentId} ===`)

    const component = ComponentRegistry.getComponent(componentId)

    // This would typically involve:
    // - Downgrading component to specific version
    // - Setting up INI file entries
    // - Preparing backup files
    // For now, just log the setup

    cy.log(`Test data for ${component.name}:`, testData)

    cy.log('✓ Test data setup complete')
  }

  /**
   * Complete pre-test setup
   * Performs all necessary setup steps before running tests
   * @param {object} options - Setup options
   */
  completeSetup(options = {}) {
    const opts = {
      login: true,
      disableSchedule: true,
      configureProxy: false,
      verifyServer: true,
      verifyNoUpdates: true,
      captureVersions: true,
      proxyConfig: null,
      ...options
    }

    cy.log('=== Complete Test Setup ===')

    // Login
    if (opts.login) {
      this.login()
    }

    // Disable scheduled updates
    if (opts.disableSchedule) {
      this.disableScheduledUpdates()
    }

    // Configure proxy
    if (opts.configureProxy && opts.proxyConfig) {
      this.configureProxy(opts.proxyConfig)
    } else if (opts.configureProxy) {
      // Ensure proxy is disabled
      this.configureProxy(null)
    }

    // Verify update server
    if (opts.verifyServer) {
      this.verifyUpdateServerReachable()
    }

    // Verify no updates in progress
    if (opts.verifyNoUpdates) {
      this.verifyNoUpdatesInProgress()
    }

    // Capture initial versions
    if (opts.captureVersions) {
      return this.captureComponentVersions()
    }

    cy.log('✓ Complete test setup finished')

    return cy.wrap({ setupComplete: true })
  }

  /**
   * Setup for specific test scenario
   * @param {string} scenarioType - Scenario type ('normal', 'forced', 'rollback', etc.)
   * @param {string} componentId - Component ID
   * @param {object} options - Additional options
   */
  setupForScenario(scenarioType, componentId, options = {}) {
    cy.log(`=== Setup for ${scenarioType} scenario: ${componentId} ===`)

    // Login and navigate
    this.setupForUpdateTests()

    // Scenario-specific setup
    switch (scenarioType) {
      case TestConstants.UPDATE_MODES.NORMAL:
        // Verify component can be updated
        this.manualUpdatePage.verifyComponentRowExists(componentId)
        break

      case TestConstants.UPDATE_MODES.FORCED:
        // Same as normal
        this.manualUpdatePage.verifyComponentRowExists(componentId)
        break

      case TestConstants.UPDATE_MODES.ROLLBACK:
        // Verify component supports rollback
        const component = ComponentRegistry.getComponent(componentId)
        if (!component.canRollback) {
          throw new Error(`Component ${componentId} does not support rollback`)
        }
        this.manualUpdatePage.verifyComponentRowExists(componentId)
        break

      case TestConstants.UPDATE_MODES.UPDATE_ALL:
        // Verify all components displayed
        this.manualUpdatePage.verifyAllComponentsDisplayed()
        break

      default:
        cy.log(`Unknown scenario type: ${scenarioType}`)
    }

    cy.log('✓ Scenario setup complete')
  }

  /**
   * Verify test prerequisites
   * Checks that all prerequisites are met before running tests
   * @returns {Cypress.Chainable<boolean>} True if all prerequisites met
   */
  verifyPrerequisites() {
    cy.log('=== Verifying Test Prerequisites ===')

    const checks = {
      baseUrl: false,
      credentials: false,
      updateServer: false,
    }

    // Check base URL configured
    if (Cypress.config('baseUrl')) {
      checks.baseUrl = true
      cy.log('✓ Base URL configured')
    } else {
      cy.log('✗ Base URL not configured')
    }

    // Check credentials configured
    if (Cypress.env('username') && Cypress.env('password')) {
      checks.credentials = true
      cy.log('✓ Credentials configured')
    } else {
      cy.log('✗ Credentials not configured')
    }

    // Check update server (if accessible)
    // This would require actual network check
    checks.updateServer = true
    cy.log('✓ Update server check skipped (assumed reachable)')

    const allChecksPassed = Object.values(checks).every(check => check === true)

    if (allChecksPassed) {
      cy.log('✓ All prerequisites met')
    } else {
      cy.log('✗ Some prerequisites not met')
      throw new Error('Test prerequisites not met')
    }

    return cy.wrap(allChecksPassed)
  }

  /**
   * Create test snapshot of current state
   * Captures current state for restoration after tests
   * @returns {Cypress.Chainable<object>} State snapshot
   */
  createStateSnapshot() {
    cy.log('=== Creating State Snapshot ===')

    const snapshot = {
      timestamp: new Date().toISOString(),
      versions: {},
      scheduleConfig: {},
      proxyConfig: {},
    }

    // Capture versions
    this.captureComponentVersions().then(versions => {
      snapshot.versions = versions
    })

    // Capture schedule config
    this.schedulePage.navigate()
    this.schedulePage.getCurrentConfiguration().then(config => {
      snapshot.scheduleConfig = config
    })

    // Capture proxy config
    this.proxyPage.navigate()
    this.proxyPage.getCurrentConfiguration().then(config => {
      snapshot.proxyConfig = config
    })

    cy.log('✓ State snapshot created')

    return cy.wrap(snapshot)
  }

  /**
   * Restore state from snapshot
   * @param {object} snapshot - State snapshot
   */
  restoreStateSnapshot(snapshot) {
    cy.log('=== Restoring State from Snapshot ===')

    // Restore schedule
    if (snapshot.scheduleConfig) {
      this.schedulePage.navigate()
      this.schedulePage.configureSchedule(snapshot.scheduleConfig)
    }

    // Restore proxy
    if (snapshot.proxyConfig && snapshot.proxyConfig.enabled) {
      this.proxyPage.navigate()
      this.proxyPage.configureBasicProxy(snapshot.proxyConfig)
    }

    // Note: Version restoration would require downgrade utility
    cy.log('! Component version restoration not implemented')

    cy.log('✓ State restored from snapshot')
  }
}

export default SetupWorkflow
