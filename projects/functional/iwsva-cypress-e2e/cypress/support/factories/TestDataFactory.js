/**
 * Test Data Factory
 *
 * Factory class for generating test data dynamically.
 * Creates test scenarios, versions, users, and configurations.
 *
 * @class TestDataFactory
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestScenarios from '../../fixtures/test-scenarios.json'
import ComponentVersions from '../../fixtures/component-test-versions.json'
import TestUsers from '../../fixtures/test-users.json'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class TestDataFactory {
  /**
   * Generate normal update scenario for component
   * @param {string} componentId - Component ID
   * @param {object} overrides - Override default values
   * @returns {object} Normal update scenario
   */
  static createNormalUpdateScenario(componentId, overrides = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const versionData = ComponentVersions[componentId]

    return {
      id: `NORMAL-${componentId}`,
      componentId: componentId,
      componentName: component.name,
      mode: TestConstants.UPDATE_MODES.NORMAL,
      currentVersion: versionData.current,
      availableVersion: versionData.available,
      expectedResult: 'success',
      shouldUpdate: true,
      estimatedDuration: component.updateTimeout,
      priority: component.priority,
      requiresRestart: component.requiresRestart,
      ...overrides
    }
  }

  /**
   * Generate forced update scenario for component
   * @param {string} componentId - Component ID
   * @param {object} overrides - Override default values
   * @returns {object} Forced update scenario
   */
  static createForcedUpdateScenario(componentId, overrides = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const versionData = ComponentVersions[componentId]

    return {
      id: `FORCED-${componentId}`,
      componentId: componentId,
      componentName: component.name,
      mode: TestConstants.UPDATE_MODES.FORCED,
      currentVersion: versionData.current,
      availableVersion: versionData.current, // Same version for forced
      expectedResult: 'success',
      shouldUpdate: true,
      requiresConfirmation: true,
      confirmationMessage: TestConstants.MESSAGES.confirmations.forcedUpdate,
      estimatedDuration: component.updateTimeout,
      priority: component.priority,
      requiresRestart: component.requiresRestart,
      ...overrides
    }
  }

  /**
   * Generate rollback scenario for component
   * @param {string} componentId - Component ID
   * @param {object} overrides - Override default values
   * @returns {object} Rollback scenario
   */
  static createRollbackScenario(componentId, overrides = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const versionData = ComponentVersions[componentId]

    if (!component.canRollback) {
      throw new Error(`Component ${componentId} does not support rollback`)
    }

    return {
      id: `ROLLBACK-${componentId}`,
      componentId: componentId,
      componentName: component.name,
      mode: TestConstants.UPDATE_MODES.ROLLBACK,
      currentVersion: versionData.current,
      rollbackVersion: versionData.previous,
      expectedResult: 'success',
      shouldRollback: true,
      requiresConfirmation: true,
      requiresBackup: true,
      estimatedDuration: TestConfig.timeouts.rollback,
      priority: component.priority,
      ...overrides
    }
  }

  /**
   * Generate "already up-to-date" scenario
   * @param {string} componentId - Component ID
   * @param {object} overrides - Override default values
   * @returns {object} Already updated scenario
   */
  static createUpToDateScenario(componentId, overrides = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const versionData = ComponentVersions[componentId]

    return {
      id: `UPTODATE-${componentId}`,
      componentId: componentId,
      componentName: component.name,
      mode: TestConstants.UPDATE_MODES.NORMAL,
      currentVersion: versionData.current,
      availableVersion: versionData.current, // Same version
      expectedResult: 'no_update_needed',
      shouldUpdate: false,
      expectedMessage: TestConstants.MESSAGES.success.upToDate,
      priority: component.priority,
      ...overrides
    }
  }

  /**
   * Generate error scenario
   * @param {string} componentId - Component ID
   * @param {string} errorType - Error type ('network', 'resource', 'permission', etc.)
   * @param {object} overrides - Override default values
   * @returns {object} Error scenario
   */
  static createErrorScenario(componentId, errorType, overrides = {}) {
    const component = ComponentRegistry.getComponent(componentId)

    const errorMessages = {
      network: TestConstants.MESSAGES.errors.networkError,
      timeout: TestConstants.MESSAGES.errors.timeout,
      disk_space: TestConstants.MESSAGES.errors.diskSpace,
      permission: TestConstants.MESSAGES.errors.permission,
      concurrent: TestConstants.MESSAGES.errors.concurrent
    }

    const errorMessage = errorMessages[errorType] || 'Update failed'

    return {
      id: `ERROR-${errorType.toUpperCase()}-${componentId}`,
      componentId: componentId,
      componentName: component.name,
      mode: TestConstants.UPDATE_MODES.NORMAL,
      expectedResult: 'error',
      errorType: errorType,
      expectedError: errorMessage,
      versionUnchanged: true,
      priority: component.priority,
      ...overrides
    }
  }

  /**
   * Generate Update All scenario
   * @param {string[]} componentIds - Component IDs (defaults to all)
   * @param {object} overrides - Override default values
   * @returns {object} Update All scenario
   */
  static createUpdateAllScenario(componentIds = null, overrides = {}) {
    const components = componentIds || ComponentRegistry.getComponentIds()

    return {
      id: 'UPDATEALL-ALL',
      components: components,
      mode: TestConstants.UPDATE_MODES.UPDATE_ALL,
      expectedResult: 'success',
      shouldUpdate: true,
      estimatedDuration: TestConfig.timeouts.updateAll,
      priority: TestConstants.PRIORITIES.P0,
      ...overrides
    }
  }

  /**
   * Generate test version data
   * @param {string} componentId - Component ID
   * @param {object} overrides - Override default values
   * @returns {object} Version data
   */
  static createVersionData(componentId, overrides = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const defaultVersions = ComponentVersions[componentId] || {}

    return {
      componentId: componentId,
      current: defaultVersions.current || '1.0.0',
      available: defaultVersions.available || '1.0.1',
      previous: defaultVersions.previous || '0.9.9',
      timestamp: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * Generate test user
   * @param {string} role - User role ('admin', 'readonly', 'invalid')
   * @param {object} overrides - Override default values
   * @returns {object} User data
   */
  static createUser(role = 'admin', overrides = {}) {
    const defaultUsers = TestUsers[role] || TestUsers.admin

    return {
      role: role,
      username: defaultUsers.username,
      password: defaultUsers.password,
      permissions: defaultUsers.permissions || [],
      ...overrides
    }
  }

  /**
   * Generate proxy configuration
   * @param {boolean} authenticated - Include authentication
   * @param {object} overrides - Override default values
   * @returns {object} Proxy configuration
   */
  static createProxyConfig(authenticated = false, overrides = {}) {
    const config = {
      enabled: true,
      server: 'proxy.example.com',
      port: 8080,
      ...overrides
    }

    if (authenticated) {
      config.username = 'proxyuser'
      config.password = 'proxypass'
    }

    return config
  }

  /**
   * Generate schedule configuration
   * @param {string} frequency - Frequency ('hourly', 'daily', 'weekly')
   * @param {object} overrides - Override default values
   * @returns {object} Schedule configuration
   */
  static createScheduleConfig(frequency = 'daily', overrides = {}) {
    return {
      enabled: true,
      frequency: frequency,
      time: '02:00',
      ...overrides
    }
  }

  /**
   * Get scenario from test-scenarios.json by ID
   * @param {string} scenarioId - Scenario ID
   * @returns {object} Test scenario
   */
  static getScenario(scenarioId) {
    // Search all scenario categories
    const categories = [
      'normalUpdate',
      'alreadyUpdated',
      'forcedUpdate',
      'rollback',
      'updateAll',
      'errorScenarios'
    ]

    for (const category of categories) {
      const scenarios = TestScenarios[category]?.scenarios || []
      const scenario = scenarios.find(s => s.id === scenarioId)

      if (scenario) {
        return scenario
      }
    }

    throw new Error(`Scenario not found: ${scenarioId}`)
  }

  /**
   * Get all scenarios for a specific component
   * @param {string} componentId - Component ID
   * @returns {object[]} Array of scenarios for component
   */
  static getComponentScenarios(componentId) {
    const scenarios = []

    // Search all categories
    Object.keys(TestScenarios).forEach(category => {
      if (TestScenarios[category].scenarios) {
        TestScenarios[category].scenarios.forEach(scenario => {
          if (scenario.componentId === componentId) {
            scenarios.push(scenario)
          }
        })
      }
    })

    return scenarios
  }

  /**
   * Get scenarios by mode
   * @param {string} mode - Update mode ('normal', 'forced', 'rollback', 'updateAll')
   * @returns {object[]} Array of scenarios
   */
  static getScenariosByMode(mode) {
    const modeMap = {
      normal: 'normalUpdate',
      forced: 'forcedUpdate',
      rollback: 'rollback',
      updateAll: 'updateAll',
      error: 'errorScenarios'
    }

    const category = modeMap[mode]
    if (!category || !TestScenarios[category]) {
      return []
    }

    return TestScenarios[category].scenarios || []
  }

  /**
   * Get scenarios by priority
   * @param {string} priority - Priority ('P0', 'P1', 'P2')
   * @returns {object[]} Array of scenarios
   */
  static getScenariosByPriority(priority) {
    const scenarios = []

    Object.keys(TestScenarios).forEach(category => {
      if (TestScenarios[category].scenarios) {
        TestScenarios[category].scenarios.forEach(scenario => {
          if (scenario.priority === priority) {
            scenarios.push(scenario)
          }
        })
      }
    })

    return scenarios
  }

  /**
   * Generate random version string
   * @param {string} format - Version format ('major.minor.patch' or 'major.minor.build')
   * @returns {string} Random version
   */
  static generateRandomVersion(format = 'major.minor.patch') {
    const major = Math.floor(Math.random() * 20) + 1
    const minor = Math.floor(Math.random() * 100)
    const patch = Math.floor(Math.random() * 1000)

    return `${major}.${minor}.${patch}`
  }

  /**
   * Increment version
   * @param {string} version - Current version
   * @param {string} level - Increment level ('major', 'minor', 'patch')
   * @returns {string} Incremented version
   */
  static incrementVersion(version, level = 'patch') {
    const parts = version.split('.').map(Number)

    switch (level) {
      case 'major':
        parts[0]++
        parts[1] = 0
        parts[2] = 0
        break
      case 'minor':
        parts[1]++
        parts[2] = 0
        break
      case 'patch':
      default:
        parts[2]++
        break
    }

    return parts.join('.')
  }

  /**
   * Generate batch of test scenarios
   * @param {string[]} componentIds - Component IDs
   * @param {string} mode - Update mode
   * @returns {object[]} Array of scenarios
   */
  static generateBatchScenarios(componentIds, mode) {
    return componentIds.map(componentId => {
      switch (mode) {
        case 'normal':
          return TestDataFactory.createNormalUpdateScenario(componentId)
        case 'forced':
          return TestDataFactory.createForcedUpdateScenario(componentId)
        case 'rollback':
          return TestDataFactory.createRollbackScenario(componentId)
        case 'uptodate':
          return TestDataFactory.createUpToDateScenario(componentId)
        default:
          return TestDataFactory.createNormalUpdateScenario(componentId)
      }
    })
  }

  /**
   * Get all P0 scenarios (critical tests)
   * @returns {object[]} Array of P0 scenarios
   */
  static getCriticalScenarios() {
    return TestDataFactory.getScenariosByPriority(TestConstants.PRIORITIES.P0)
  }

  /**
   * Create expected state for verification
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version
   * @param {object} overrides - Override default values
   * @returns {object} Expected state configuration
   */
  static createExpectedState(componentId, expectedVersion, overrides = {}) {
    return {
      ui: {
        version: expectedVersion,
        timestampUpdated: true,
        updateButtonEnabled: true
      },
      backend: {
        iniVersion: expectedVersion,
        lockFileRemoved: true,
        filesExist: true
      },
      logs: {
        logEntryExists: true,
        operation: 'update',
        noErrors: true,
        successInLog: true,
        logTimestampRecent: true
      },
      business: {
        scanningWorks: true,
        restartRequired: false
      },
      ...overrides
    }
  }

  /**
   * Get version data for component
   * @param {string} componentId - Component ID
   * @returns {object} Version data from fixture
   */
  static getVersionData(componentId) {
    return ComponentVersions[componentId] || {}
  }

  /**
   * Get all test users
   * @returns {object} All test users
   */
  static getAllUsers() {
    return TestUsers
  }

  /**
   * Get admin user
   * @returns {object} Admin user data
   */
  static getAdminUser() {
    return TestDataFactory.createUser('admin')
  }

  /**
   * Get readonly user
   * @returns {object} Readonly user data
   */
  static getReadonlyUser() {
    return TestDataFactory.createUser('readonly')
  }
}

export default TestDataFactory
