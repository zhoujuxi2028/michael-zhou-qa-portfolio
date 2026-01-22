/**
 * Test Data Setup
 *
 * Utility for initializing and managing test data for IWSVA Update tests.
 * Handles scenario preparation, data generation, and test state management.
 *
 * @class TestDataSetup
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import ComponentVersions from '../../fixtures/component-test-versions.json'
import TestScenarios from '../../fixtures/test-scenarios.json'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'
import ComponentDowngrade from './ComponentDowngrade'

class TestDataSetup {
  /**
   * Setup test data for specific scenario
   * @param {object} scenario - Test scenario
   * @param {object} options - Setup options
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupScenario(scenario, options = {}) {
    const opts = {
      downgradeComponent: true,
      updateINI: true,
      createBackup: true,
      ...options
    }

    cy.log(`========================================`)
    cy.log(`=== Setting Up Scenario: ${scenario.id} ===`)
    cy.log(`========================================`)

    const result = {
      scenarioId: scenario.id,
      componentId: scenario.componentId,
      prepared: false
    }

    // Prepare component for scenario
    if (scenario.componentId) {
      // Normal, Forced, Rollback scenarios
      if (opts.downgradeComponent && scenario.currentVersion) {
        // Downgrade to current version specified in scenario
        ComponentDowngrade.downgradeToVersion(
          scenario.componentId,
          scenario.currentVersion,
          {
            createBackup: opts.createBackup,
            updateINI: opts.updateINI
          }
        ).then(downgradeResult => {
          if (downgradeResult.success) {
            cy.log(`✓ Component prepared: ${scenario.currentVersion}`)
            result.prepared = true
          } else {
            cy.log(`✗ Component preparation failed`)
          }
        })
      }

      // Setup mock update server response (if needed for error scenarios)
      if (scenario.errorType) {
        TestDataSetup.setupErrorCondition(scenario.componentId, scenario.errorType)
      }
    } else if (scenario.components) {
      // Update All scenario
      cy.log(`Preparing ${scenario.components.length} components for Update All`)

      scenario.components.forEach(componentId => {
        const versionData = ComponentVersions[componentId]

        if (versionData && versionData.previous) {
          ComponentDowngrade.downgradeToVersion(
            componentId,
            versionData.previous,
            { createBackup: false, updateINI: true }
          )
        }
      })

      result.prepared = true
    }

    cy.log(`✓ Scenario setup complete`)

    return cy.wrap(result)
  }

  /**
   * Setup error condition for testing
   * @param {string} componentId - Component ID
   * @param {string} errorType - Error type
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupErrorCondition(componentId, errorType) {
    cy.log(`=== Setting Up Error Condition: ${errorType} ===`)

    const result = {
      componentId,
      errorType,
      configured: false
    }

    switch (errorType) {
      case TestConstants.ERROR_TYPES.NETWORK:
        // Configure network failure simulation
        cy.task('configureNetworkError', { componentId }).then(() => {
          cy.log(`✓ Network error configured`)
          result.configured = true
        })
        break

      case TestConstants.ERROR_TYPES.RESOURCE:
        // Configure disk space error
        cy.task('configureDiskSpaceError', { componentId }).then(() => {
          cy.log(`✓ Disk space error configured`)
          result.configured = true
        })
        break

      case TestConstants.ERROR_TYPES.PERMISSION:
        // Configure permission error
        cy.task('configurePermissionError', { componentId }).then(() => {
          cy.log(`✓ Permission error configured`)
          result.configured = true
        })
        break

      case TestConstants.ERROR_TYPES.STATE:
        // Configure concurrent update error (create lock file)
        cy.task('createLockFile', { componentId }).then(() => {
          cy.log(`✓ Lock file created for concurrent update test`)
          result.configured = true
        })
        break

      case TestConstants.ERROR_TYPES.TIMEOUT:
        // Configure timeout error
        cy.task('configureTimeoutError', { componentId }).then(() => {
          cy.log(`✓ Timeout error configured`)
          result.configured = true
        })
        break

      default:
        cy.log(`! Unknown error type: ${errorType}`)
    }

    return cy.wrap(result)
  }

  /**
   * Clear error condition
   * @param {string} componentId - Component ID
   * @param {string} errorType - Error type
   * @returns {Cypress.Chainable<object>} Clear result
   */
  static clearErrorCondition(componentId, errorType) {
    cy.log(`=== Clearing Error Condition: ${errorType} ===`)

    switch (errorType) {
      case TestConstants.ERROR_TYPES.NETWORK:
        cy.task('clearNetworkError', { componentId })
        break

      case TestConstants.ERROR_TYPES.RESOURCE:
        cy.task('clearDiskSpaceError', { componentId })
        break

      case TestConstants.ERROR_TYPES.PERMISSION:
        cy.task('clearPermissionError', { componentId })
        break

      case TestConstants.ERROR_TYPES.STATE:
        cy.task('removeLockFile', { componentId })
        break

      case TestConstants.ERROR_TYPES.TIMEOUT:
        cy.task('clearTimeoutError', { componentId })
        break

      default:
        cy.log(`! Unknown error type: ${errorType}`)
    }

    cy.log(`✓ Error condition cleared`)

    return cy.wrap({ cleared: true })
  }

  /**
   * Setup test data for normal update scenario
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupNormalUpdate(componentId) {
    const versionData = ComponentVersions[componentId]

    cy.log(`=== Setup Normal Update: ${componentId} ===`)

    // Downgrade to previous version so update is available
    return ComponentDowngrade.downgradeToVersion(
      componentId,
      versionData.previous,
      {
        createBackup: true,
        updateINI: true,
        verifyAfter: true
      }
    ).then(result => {
      cy.log(`✓ Ready for normal update: ${versionData.previous} → ${versionData.current}`)

      return cy.wrap({
        componentId,
        fromVersion: versionData.previous,
        toVersion: versionData.current,
        ready: true
      })
    })
  }

  /**
   * Setup test data for forced update scenario
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupForcedUpdate(componentId) {
    const versionData = ComponentVersions[componentId]

    cy.log(`=== Setup Forced Update: ${componentId} ===`)

    // Ensure component is at current version (already up-to-date)
    return ComponentDowngrade.downgradeToVersion(
      componentId,
      versionData.current,
      {
        createBackup: false,
        updateINI: true,
        verifyAfter: true
      }
    ).then(result => {
      cy.log(`✓ Ready for forced update: ${versionData.current}`)

      return cy.wrap({
        componentId,
        version: versionData.current,
        ready: true
      })
    })
  }

  /**
   * Setup test data for rollback scenario
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupRollback(componentId) {
    const component = ComponentRegistry.getComponent(componentId)
    const versionData = ComponentVersions[componentId]

    if (!component.canRollback) {
      throw new Error(`Component ${componentId} does not support rollback`)
    }

    cy.log(`=== Setup Rollback: ${componentId} ===`)

    // Ensure component is at current version with backup available
    return ComponentDowngrade.downgradeToVersion(
      componentId,
      versionData.current,
      {
        createBackup: true,
        updateINI: true,
        verifyAfter: true
      }
    ).then(result => {
      // Create a "previous version" backup for rollback
      return ComponentDowngrade.backupComponent(componentId).then(backupPath => {
        cy.log(`✓ Ready for rollback: ${versionData.current} → ${versionData.previous}`)

        return cy.wrap({
          componentId,
          fromVersion: versionData.current,
          toVersion: versionData.previous,
          backupPath,
          ready: true
        })
      })
    })
  }

  /**
   * Setup test data for Update All scenario
   * @param {string[]} componentIds - Component IDs (optional)
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupUpdateAll(componentIds = null) {
    const components = componentIds || ComponentRegistry.getComponentIds()

    cy.log(`=== Setup Update All: ${components.length} components ===`)

    const versionMap = {}

    // Downgrade all components to previous versions
    components.forEach(componentId => {
      const versionData = ComponentVersions[componentId]

      if (versionData && versionData.previous) {
        versionMap[componentId] = versionData.previous
      }
    })

    return ComponentDowngrade.downgradeBatch(versionMap, {
      createBackup: false,
      updateINI: true,
      verifyAfter: false
    }).then(results => {
      cy.log(`✓ All components ready for Update All`)

      return cy.wrap({
        components: components,
        versionMap: versionMap,
        ready: true
      })
    })
  }

  /**
   * Setup batch scenarios
   * @param {object[]} scenarios - Array of test scenarios
   * @returns {Cypress.Chainable<object[]>} Setup results
   */
  static setupBatch(scenarios) {
    cy.log(`=== Setting Up Batch Scenarios: ${scenarios.length} ===`)

    const results = []

    scenarios.forEach(scenario => {
      TestDataSetup.setupScenario(scenario).then(result => {
        results.push(result)
      })
    })

    cy.log(`✓ Batch setup complete`)

    return cy.wrap(results)
  }

  /**
   * Create test state snapshot
   * @returns {Cypress.Chainable<object>} State snapshot
   */
  static createSnapshot() {
    cy.log(`=== Creating Test State Snapshot ===`)

    const snapshot = {
      timestamp: new Date().toISOString(),
      versions: {},
      iniData: {}
    }

    const componentIds = ComponentRegistry.getComponentIds()

    // Capture all component versions
    componentIds.forEach(componentId => {
      const component = ComponentRegistry.getComponent(componentId)

      cy.task('readINI', {
        componentId: componentId,
        key: component.iniKey
      }).then(version => {
        snapshot.versions[componentId] = version
      })

      cy.task('readINI', {
        componentId: componentId,
        key: component.iniTimeKey
      }).then(timestamp => {
        snapshot.iniData[componentId] = {
          version: snapshot.versions[componentId],
          timestamp: timestamp
        }
      })
    })

    cy.log(`✓ Snapshot created`)

    return cy.wrap(snapshot)
  }

  /**
   * Restore from test state snapshot
   * @param {object} snapshot - State snapshot
   * @returns {Cypress.Chainable<object>} Restore result
   */
  static restoreSnapshot(snapshot) {
    cy.log(`=== Restoring Test State Snapshot ===`)
    cy.log(`Snapshot from: ${snapshot.timestamp}`)

    const versionMap = snapshot.versions

    // Restore all versions
    return ComponentDowngrade.downgradeBatch(versionMap, {
      createBackup: false,
      updateINI: true,
      verifyAfter: false
    }).then(results => {
      // Restore INI timestamps
      Object.keys(snapshot.iniData).forEach(componentId => {
        const component = ComponentRegistry.getComponent(componentId)
        const iniData = snapshot.iniData[componentId]

        cy.task('writeINI', {
          componentId: componentId,
          key: component.iniTimeKey,
          value: iniData.timestamp
        })
      })

      cy.log(`✓ Snapshot restored`)

      return cy.wrap({
        restored: true,
        components: Object.keys(versionMap).length
      })
    })
  }

  /**
   * Verify test data is ready
   * @param {string} scenarioId - Scenario ID
   * @returns {Cypress.Chainable<boolean>} True if ready
   */
  static verifyReady(scenarioId) {
    cy.log(`=== Verifying Test Data Ready: ${scenarioId} ===`)

    const scenario = TestDataSetup.getScenario(scenarioId)

    if (!scenario) {
      cy.log(`✗ Scenario not found: ${scenarioId}`)
      return cy.wrap(false)
    }

    if (scenario.componentId) {
      // Verify single component
      const component = ComponentRegistry.getComponent(scenario.componentId)

      return cy.task('readINI', {
        componentId: scenario.componentId,
        key: component.iniKey
      }).then(actualVersion => {
        const expectedVersion = scenario.currentVersion

        if (actualVersion === expectedVersion) {
          cy.log(`✓ Test data ready: ${actualVersion}`)
          return cy.wrap(true)
        } else {
          cy.log(`✗ Version mismatch: expected ${expectedVersion}, got ${actualVersion}`)
          return cy.wrap(false)
        }
      })
    } else if (scenario.components) {
      // Verify multiple components for Update All
      cy.log(`✓ Update All scenario - verification skipped`)
      return cy.wrap(true)
    }

    return cy.wrap(false)
  }

  /**
   * Get scenario from test-scenarios.json
   * @param {string} scenarioId - Scenario ID
   * @returns {object} Test scenario
   */
  static getScenario(scenarioId) {
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

    return null
  }

  /**
   * Reset test data to clean state
   * @returns {Cypress.Chainable<object>} Reset result
   */
  static reset() {
    cy.log(`=== Resetting Test Data ===`)

    // Clear all error conditions
    const componentIds = ComponentRegistry.getComponentIds()

    componentIds.forEach(componentId => {
      cy.task('removeLockFile', { componentId })
      cy.task('clearNetworkError', { componentId })
      cy.task('clearDiskSpaceError', { componentId })
      cy.task('clearPermissionError', { componentId })
      cy.task('clearTimeoutError', { componentId })
    })

    // Clear temp directory
    cy.task('clearDirectory', TestConfig.paths.tempDir)

    cy.log(`✓ Test data reset complete`)

    return cy.wrap({ reset: true })
  }

  /**
   * Initialize test data for test suite
   * @param {string} suiteType - Suite type ('normal', 'forced', 'rollback', 'updateAll', 'error')
   * @returns {Cypress.Chainable<object>} Initialization result
   */
  static initializeForSuite(suiteType) {
    cy.log(`========================================`)
    cy.log(`=== Initializing Test Data: ${suiteType} Suite ===`)
    cy.log(`========================================`)

    // Create baseline environment
    return ComponentDowngrade.createBaseline({
      useOldestVersions: false,
      createBackups: true
    }).then(baseline => {
      cy.log(`✓ Baseline environment created`)

      // Suite-specific setup
      switch (suiteType) {
        case 'normal':
          cy.log(`✓ Ready for normal update tests`)
          break

        case 'forced':
          // Upgrade all to current for forced update tests
          cy.log(`Setting up for forced update tests...`)
          break

        case 'rollback':
          // Ensure backups exist for rollback tests
          cy.log(`Setting up for rollback tests...`)
          break

        case 'updateAll':
          cy.log(`✓ Ready for Update All tests`)
          break

        case 'error':
          cy.log(`✓ Ready for error handling tests`)
          break

        default:
          cy.log(`Unknown suite type: ${suiteType}`)
      }

      return cy.wrap({
        suiteType,
        baseline,
        initialized: true
      })
    })
  }
}

export default TestDataSetup
