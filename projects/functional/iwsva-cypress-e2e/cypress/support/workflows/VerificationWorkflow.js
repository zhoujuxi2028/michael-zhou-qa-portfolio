/**
 * Verification Workflow
 *
 * Handles multi-level verification for IWSVA Update tests.
 * Implements 4-level verification: UI, Backend, Logs, Business Logic
 *
 * @class VerificationWorkflow
 */

import ManualUpdatePage from '../pages/ManualUpdatePage'
import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class VerificationWorkflow {
  constructor() {
    this.manualUpdatePage = new ManualUpdatePage()
  }

  /**
   * Level 1: UI Verification
   * Verifies update status through UI elements
   * @param {string} componentId - Component ID
   * @param {object} expectedState - Expected UI state
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyUILevel(componentId, expectedState) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Level 1 Verification: UI (${component.name}) ===`)

    const result = {
      level: 'UI',
      componentId,
      passed: true,
      checks: []
    }

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Verify component row exists
    this.manualUpdatePage.verifyComponentRowExists(componentId)
    result.checks.push({ check: 'componentRowExists', passed: true })

    // Verify version displayed
    if (expectedState.version) {
      this.manualUpdatePage.verifyComponentVersion(componentId, expectedState.version)
      result.checks.push({ check: 'versionMatch', passed: true, value: expectedState.version })
    }

    // Verify timestamp updated (if applicable)
    if (expectedState.timestampUpdated) {
      this.manualUpdatePage.getComponentTimestamp(componentId).then(timestamp => {
        // Verify timestamp is recent (within last 5 minutes)
        const timestampDate = new Date(timestamp)
        const now = new Date()
        const diffMinutes = (now - timestampDate) / (1000 * 60)

        if (diffMinutes <= 5) {
          cy.log(`✓ Timestamp is recent: ${timestamp}`)
          result.checks.push({ check: 'timestampRecent', passed: true, value: timestamp })
        } else {
          cy.log(`! Timestamp is old: ${timestamp}`)
          result.checks.push({ check: 'timestampRecent', passed: false, value: timestamp })
          result.passed = false
        }
      })
    }

    // Verify button states
    if (expectedState.updateButtonEnabled !== undefined) {
      this.manualUpdatePage.verifyUpdateButtonState(expectedState.updateButtonEnabled)
      result.checks.push({ check: 'updateButtonState', passed: true })
    }

    cy.log(`✓ Level 1 (UI) Verification: ${result.passed ? 'PASSED' : 'FAILED'}`)

    return cy.wrap(result)
  }

  /**
   * Level 2: Backend Verification
   * Verifies update through backend state (INI files, file system)
   * @param {string} componentId - Component ID
   * @param {object} expectedState - Expected backend state
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyBackendLevel(componentId, expectedState) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Level 2 Verification: Backend (${component.name}) ===`)

    const result = {
      level: 'Backend',
      componentId,
      passed: true,
      checks: []
    }

    // Verify INI file version entry
    if (expectedState.iniVersion) {
      cy.task('readINI', {
        componentId,
        key: component.iniKey
      }).then(iniVersion => {
        if (iniVersion === expectedState.iniVersion) {
          cy.log(`✓ INI version matches: ${iniVersion}`)
          result.checks.push({ check: 'iniVersionMatch', passed: true, value: iniVersion })
        } else {
          cy.log(`✗ INI version mismatch: expected ${expectedState.iniVersion}, got ${iniVersion}`)
          result.checks.push({ check: 'iniVersionMatch', passed: false, expected: expectedState.iniVersion, actual: iniVersion })
          result.passed = false
        }
      })
    }

    // Verify lock file removed (no concurrent updates)
    if (expectedState.lockFileRemoved) {
      cy.task('checkLockFile', { componentId }).then(lockExists => {
        if (!lockExists) {
          cy.log('✓ Lock file removed')
          result.checks.push({ check: 'lockFileRemoved', passed: true })
        } else {
          cy.log('✗ Lock file still exists')
          result.checks.push({ check: 'lockFileRemoved', passed: false })
          result.passed = false
        }
      })
    }

    // Verify pattern/engine files exist
    if (expectedState.filesExist) {
      cy.task('verifyComponentFiles', { componentId }).then(filesExist => {
        if (filesExist) {
          cy.log('✓ Component files exist')
          result.checks.push({ check: 'filesExist', passed: true })
        } else {
          cy.log('✗ Component files missing')
          result.checks.push({ check: 'filesExist', passed: false })
          result.passed = false
        }
      })
    }

    // Verify backup created (for rollback scenarios)
    if (expectedState.backupExists) {
      cy.task('verifyBackup', { componentId }).then(backupExists => {
        if (backupExists) {
          cy.log('✓ Backup exists')
          result.checks.push({ check: 'backupExists', passed: true })
        } else {
          cy.log('✗ Backup missing')
          result.checks.push({ check: 'backupExists', passed: false })
          result.passed = false
        }
      })
    }

    cy.log(`✓ Level 2 (Backend) Verification: ${result.passed ? 'PASSED' : 'FAILED'}`)

    return cy.wrap(result)
  }

  /**
   * Level 3: Log Verification
   * Verifies update through log files
   * @param {string} componentId - Component ID
   * @param {object} expectedState - Expected log entries
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyLogLevel(componentId, expectedState) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Level 3 Verification: Logs (${component.name}) ===`)

    const result = {
      level: 'Logs',
      componentId,
      passed: true,
      checks: []
    }

    // Verify update log entry created
    if (expectedState.logEntryExists) {
      cy.task('searchUpdateLog', {
        componentId,
        operation: expectedState.operation || 'update'
      }).then(logEntry => {
        if (logEntry) {
          cy.log(`✓ Log entry found: ${logEntry}`)
          result.checks.push({ check: 'logEntryExists', passed: true, value: logEntry })
        } else {
          cy.log('✗ Log entry not found')
          result.checks.push({ check: 'logEntryExists', passed: false })
          result.passed = false
        }
      })
    }

    // Verify no error entries
    if (expectedState.noErrors) {
      cy.task('searchUpdateLog', {
        componentId,
        pattern: TestConstants.REGEX.logError
      }).then(errorEntries => {
        if (!errorEntries || errorEntries.length === 0) {
          cy.log('✓ No errors in log')
          result.checks.push({ check: 'noErrors', passed: true })
        } else {
          cy.log(`✗ Errors found in log: ${errorEntries.length}`)
          result.checks.push({ check: 'noErrors', passed: false, errors: errorEntries })
          result.passed = false
        }
      })
    }

    // Verify success message in log
    if (expectedState.successInLog) {
      cy.task('searchUpdateLog', {
        componentId,
        pattern: TestConstants.REGEX.logSuccess
      }).then(successEntry => {
        if (successEntry) {
          cy.log(`✓ Success message in log: ${successEntry}`)
          result.checks.push({ check: 'successInLog', passed: true, value: successEntry })
        } else {
          cy.log('✗ Success message not found in log')
          result.checks.push({ check: 'successInLog', passed: false })
          result.passed = false
        }
      })
    }

    // Verify log timestamp is recent
    if (expectedState.logTimestampRecent) {
      cy.task('getLatestLogEntry', { componentId }).then(latestEntry => {
        if (latestEntry && latestEntry.timestamp) {
          const logTime = new Date(latestEntry.timestamp)
          const now = new Date()
          const diffMinutes = (now - logTime) / (1000 * 60)

          if (diffMinutes <= 5) {
            cy.log(`✓ Log timestamp is recent: ${latestEntry.timestamp}`)
            result.checks.push({ check: 'logTimestampRecent', passed: true, value: latestEntry.timestamp })
          } else {
            cy.log(`! Log timestamp is old: ${latestEntry.timestamp}`)
            result.checks.push({ check: 'logTimestampRecent', passed: false, value: latestEntry.timestamp })
            result.passed = false
          }
        } else {
          cy.log('✗ No log timestamp found')
          result.checks.push({ check: 'logTimestampRecent', passed: false })
          result.passed = false
        }
      })
    }

    cy.log(`✓ Level 3 (Logs) Verification: ${result.passed ? 'PASSED' : 'FAILED'}`)

    return cy.wrap(result)
  }

  /**
   * Level 4: Business Logic Verification
   * Verifies functional correctness (service status, scanning works, etc.)
   * @param {string} componentId - Component ID
   * @param {object} expectedState - Expected business state
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyBusinessLevel(componentId, expectedState) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Level 4 Verification: Business Logic (${component.name}) ===`)

    const result = {
      level: 'Business',
      componentId,
      passed: true,
      checks: []
    }

    // Verify service is running (for engines)
    if (component.category === TestConstants.CATEGORIES.ENGINE) {
      cy.task('checkServiceStatus', { componentId }).then(isRunning => {
        if (isRunning) {
          cy.log('✓ Service is running')
          result.checks.push({ check: 'serviceRunning', passed: true })
        } else {
          cy.log('✗ Service is not running')
          result.checks.push({ check: 'serviceRunning', passed: false })
          result.passed = false
        }
      })
    }

    // Verify scanning functionality works (if required)
    if (expectedState.scanningWorks) {
      cy.task('testScanning', { componentId }).then(scanResult => {
        if (scanResult.success) {
          cy.log('✓ Scanning functionality works')
          result.checks.push({ check: 'scanningWorks', passed: true })
        } else {
          cy.log(`✗ Scanning failed: ${scanResult.error}`)
          result.checks.push({ check: 'scanningWorks', passed: false, error: scanResult.error })
          result.passed = false
        }
      })
    }

    // Verify component can be rolled back (if applicable)
    if (expectedState.canRollback !== undefined) {
      const actualCanRollback = component.canRollback

      if (actualCanRollback === expectedState.canRollback) {
        cy.log(`✓ Rollback capability: ${actualCanRollback}`)
        result.checks.push({ check: 'rollbackCapability', passed: true, value: actualCanRollback })
      } else {
        cy.log(`✗ Rollback capability mismatch: expected ${expectedState.canRollback}, got ${actualCanRollback}`)
        result.checks.push({ check: 'rollbackCapability', passed: false, expected: expectedState.canRollback, actual: actualCanRollback })
        result.passed = false
      }
    }

    // Verify restart requirement met (if applicable)
    if (expectedState.restartRequired && component.requiresRestart) {
      cy.task('verifyServiceRestarted', { componentId }).then(wasRestarted => {
        if (wasRestarted) {
          cy.log('✓ Service was restarted')
          result.checks.push({ check: 'serviceRestarted', passed: true })
        } else {
          cy.log('! Service may not have been restarted')
          result.checks.push({ check: 'serviceRestarted', passed: false })
          // Don't fail - this is informational
        }
      })
    }

    cy.log(`✓ Level 4 (Business) Verification: ${result.passed ? 'PASSED' : 'FAILED'}`)

    return cy.wrap(result)
  }

  /**
   * Execute complete 4-level verification
   * @param {string} componentId - Component ID
   * @param {object} expectedState - Expected state across all levels
   * @returns {Cypress.Chainable<object>} Complete verification result
   */
  executeCompleteVerification(componentId, expectedState) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`========================================`)
    cy.log(`=== Complete Verification: ${component.name} ===`)
    cy.log(`========================================`)

    const results = {
      componentId,
      componentName: component.name,
      levels: [],
      overallPassed: true
    }

    // Level 1: UI
    this.verifyUILevel(componentId, expectedState.ui || {}).then(uiResult => {
      results.levels.push(uiResult)
      if (!uiResult.passed) results.overallPassed = false
    })

    // Level 2: Backend (if enabled)
    if (expectedState.backend) {
      this.verifyBackendLevel(componentId, expectedState.backend).then(backendResult => {
        results.levels.push(backendResult)
        if (!backendResult.passed) results.overallPassed = false
      })
    }

    // Level 3: Logs (if enabled)
    if (expectedState.logs) {
      this.verifyLogLevel(componentId, expectedState.logs).then(logResult => {
        results.levels.push(logResult)
        if (!logResult.passed) results.overallPassed = false
      })
    }

    // Level 4: Business (if enabled)
    if (expectedState.business) {
      this.verifyBusinessLevel(componentId, expectedState.business).then(businessResult => {
        results.levels.push(businessResult)
        if (!businessResult.passed) results.overallPassed = false
      })
    }

    cy.log(`========================================`)
    cy.log(`=== Verification Result: ${results.overallPassed ? 'PASSED' : 'FAILED'} ===`)
    cy.log(`========================================`)

    return cy.wrap(results)
  }

  /**
   * Verify update completion with all levels
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version after update
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyUpdateCompletion(componentId, expectedVersion) {
    cy.log(`=== Verifying Update Completion: ${componentId} ===`)

    const expectedState = {
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
      }
    }

    return this.executeCompleteVerification(componentId, expectedState)
  }

  /**
   * Verify rollback completion with all levels
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version after rollback
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyRollbackCompletion(componentId, expectedVersion) {
    cy.log(`=== Verifying Rollback Completion: ${componentId} ===`)

    const expectedState = {
      ui: {
        version: expectedVersion,
        timestampUpdated: true
      },
      backend: {
        iniVersion: expectedVersion,
        lockFileRemoved: true,
        filesExist: true,
        backupExists: true
      },
      logs: {
        logEntryExists: true,
        operation: 'rollback',
        noErrors: true,
        successInLog: true
      },
      business: {
        scanningWorks: true
      }
    }

    return this.executeCompleteVerification(componentId, expectedState)
  }

  /**
   * Verify error handling
   * @param {string} componentId - Component ID
   * @param {string} expectedError - Expected error message
   * @returns {Cypress.Chainable<object>} Verification result
   */
  verifyErrorHandling(componentId, expectedError) {
    cy.log(`=== Verifying Error Handling: ${componentId} ===`)

    const result = {
      componentId,
      errorVerified: false
    }

    // Verify error in UI
    this.manualUpdatePage.navigate()
    this.manualUpdatePage.getStatusMessage().then(message => {
      if (message.includes(expectedError)) {
        cy.log(`✓ Error message in UI: ${expectedError}`)
        result.errorVerified = true
      } else {
        cy.log(`✗ Expected error not found in UI`)
      }
    })

    // Verify error in logs
    cy.task('searchUpdateLog', {
      componentId,
      pattern: expectedError
    }).then(logEntry => {
      if (logEntry) {
        cy.log(`✓ Error in log: ${logEntry}`)
        result.errorInLog = true
      }
    })

    return cy.wrap(result)
  }
}

export default VerificationWorkflow
