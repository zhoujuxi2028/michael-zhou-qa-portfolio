/**
 * Log Verification
 *
 * Handles log file verification for IWSVA Update tests.
 * Verifies update logs, error logs, and log entry correctness.
 *
 * @class LogVerification
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class LogVerification {
  /**
   * Verify update log entry exists
   * @param {string} componentId - Component ID
   * @param {string} operation - Operation type ('update', 'rollback', 'forced')
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLogEntryExists(componentId, operation = 'update') {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Entry Exists (${component.name}) ===`)
    cy.log(`Operation: ${operation}`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      operation: operation
    }).then(logEntry => {
      const passed = logEntry !== null

      if (passed) {
        cy.log(`✓ Log entry found: ${logEntry}`)
      } else {
        cy.log(`✗ Log entry not found`)
      }

      return cy.wrap({
        check: 'logEntryExists',
        componentId,
        operation,
        logEntry,
        passed
      })
    })
  }

  /**
   * Verify no errors in log
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyNoErrors(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: No Errors (${component.name}) ===`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: TestConstants.REGEX.logError
    }).then(errorEntries => {
      const passed = !errorEntries || errorEntries.length === 0

      if (passed) {
        cy.log(`✓ No errors in log`)
      } else {
        cy.log(`✗ Errors found in log: ${errorEntries.length}`)
        errorEntries.forEach(error => {
          cy.log(`  ! ${error}`)
        })
      }

      return cy.wrap({
        check: 'noErrors',
        componentId,
        errorCount: errorEntries ? errorEntries.length : 0,
        errors: errorEntries || [],
        passed
      })
    })
  }

  /**
   * Verify success message in log
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifySuccessInLog(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Success Message (${component.name}) ===`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: TestConstants.REGEX.logSuccess
    }).then(successEntry => {
      const passed = successEntry !== null

      if (passed) {
        cy.log(`✓ Success message found: ${successEntry}`)
      } else {
        cy.log(`✗ Success message not found`)
      }

      return cy.wrap({
        check: 'successInLog',
        componentId,
        logEntry: successEntry,
        passed
      })
    })
  }

  /**
   * Verify log timestamp is recent
   * @param {string} componentId - Component ID
   * @param {number} maxAgeMinutes - Maximum age in minutes
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLogTimestampRecent(componentId, maxAgeMinutes = 5) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Recent Timestamp (${component.name}) ===`)

    return cy.task('getLatestLogEntry', { componentId }).then(latestEntry => {
      if (!latestEntry || !latestEntry.timestamp) {
        cy.log(`✗ No log entry found`)
        return cy.wrap({
          check: 'logTimestampRecent',
          componentId,
          passed: false
        })
      }

      const logTime = new Date(latestEntry.timestamp)
      const now = new Date()
      const ageMinutes = (now - logTime) / (1000 * 60)

      const passed = ageMinutes <= maxAgeMinutes

      if (passed) {
        cy.log(`✓ Log timestamp is recent: ${latestEntry.timestamp} (${ageMinutes.toFixed(1)} min ago)`)
      } else {
        cy.log(`✗ Log timestamp is old: ${latestEntry.timestamp} (${ageMinutes.toFixed(1)} min ago)`)
      }

      return cy.wrap({
        check: 'logTimestampRecent',
        componentId,
        timestamp: latestEntry.timestamp,
        ageMinutes,
        maxAgeMinutes,
        passed
      })
    })
  }

  /**
   * Verify specific log message
   * @param {string} componentId - Component ID
   * @param {string} expectedMessage - Expected message in log
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLogMessage(componentId, expectedMessage) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Specific Message (${component.name}) ===`)
    cy.log(`Expected: "${expectedMessage}"`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: expectedMessage
    }).then(logEntry => {
      const passed = logEntry !== null

      if (passed) {
        cy.log(`✓ Message found: ${logEntry}`)
      } else {
        cy.log(`✗ Message not found`)
      }

      return cy.wrap({
        check: 'logMessage',
        componentId,
        expectedMessage,
        logEntry,
        passed
      })
    })
  }

  /**
   * Verify error message in log
   * @param {string} componentId - Component ID
   * @param {string} expectedError - Expected error message
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyErrorInLog(componentId, expectedError) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Error Message (${component.name}) ===`)
    cy.log(`Expected error: "${expectedError}"`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: expectedError
    }).then(errorEntry => {
      const passed = errorEntry !== null

      if (passed) {
        cy.log(`✓ Error found in log: ${errorEntry}`)
      } else {
        cy.log(`✗ Expected error not found in log`)
      }

      return cy.wrap({
        check: 'errorInLog',
        componentId,
        expectedError,
        errorEntry,
        passed
      })
    })
  }

  /**
   * Verify log contains version information
   * @param {string} componentId - Component ID
   * @param {string} version - Expected version in log
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyVersionInLog(componentId, version) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Version in Log (${component.name}) ===`)
    cy.log(`Expected version: ${version}`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: version
    }).then(logEntry => {
      const passed = logEntry !== null

      if (passed) {
        cy.log(`✓ Version found in log: ${logEntry}`)
      } else {
        cy.log(`✗ Version not found in log`)
      }

      return cy.wrap({
        check: 'versionInLog',
        componentId,
        version,
        logEntry,
        passed
      })
    })
  }

  /**
   * Get all log entries for component
   * @param {string} componentId - Component ID
   * @param {number} limit - Maximum number of entries
   * @returns {Cypress.Chainable<object[]>} Array of log entries
   */
  static getAllLogEntries(componentId, limit = 50) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Getting All Log Entries: ${component.name} (limit: ${limit}) ===`)

    return cy.task('getAllLogEntries', {
      componentId: componentId,
      limit: limit
    }).then(entries => {
      cy.log(`Found ${entries.length} log entries`)

      if (entries.length > 0) {
        cy.log(`Latest entry: ${entries[0].message}`)
      }

      return cy.wrap(entries)
    })
  }

  /**
   * Verify log file exists and is writable
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLogFileExists() {
    cy.log(`=== Verifying Log File Exists ===`)

    return cy.task('verifyFile', {
      path: TestConfig.paths.updateLog
    }).then(result => {
      const passed = result.exists && result.writable

      if (passed) {
        cy.log(`✓ Log file exists and is writable`)
      } else {
        cy.log(`✗ Log file missing or not writable`)
      }

      return cy.wrap({
        check: 'logFileExists',
        path: TestConfig.paths.updateLog,
        exists: result.exists,
        writable: result.writable,
        passed
      })
    })
  }

  /**
   * Verify log rotation occurred
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLogRotation() {
    cy.log(`=== Verifying Log Rotation ===`)

    return cy.task('checkLogRotation', {
      logDir: TestConfig.paths.logDir
    }).then(result => {
      const passed = result.rotatedLogs > 0 && result.currentLogSize < result.maxLogSize

      if (passed) {
        cy.log(`✓ Log rotation working (${result.rotatedLogs} rotated logs)`)
      } else {
        cy.log(`! Log rotation may not be working`)
      }

      return cy.wrap({
        check: 'logRotation',
        rotatedLogs: result.rotatedLogs,
        currentLogSize: result.currentLogSize,
        passed
      })
    })
  }

  /**
   * Complete log verification for component
   * @param {string} componentId - Component ID
   * @param {string} operation - Operation type
   * @param {object} options - Verification options
   * @returns {Cypress.Chainable<object>} Complete verification result
   */
  static verifyComplete(componentId, operation = 'update', options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      verifyEntry: true,
      verifyNoErrors: true,
      verifySuccess: true,
      verifyTimestamp: true,
      verifyVersion: false,
      expectedVersion: null,
      ...options
    }

    cy.log(`========================================`)
    cy.log(`=== Complete Log Verification: ${component.name} ===`)
    cy.log(`========================================`)

    const checks = []

    // Verify log entry exists
    if (opts.verifyEntry) {
      LogVerification.verifyLogEntryExists(componentId, operation).then(check => {
        checks.push(check)
      })
    }

    // Verify no errors
    if (opts.verifyNoErrors) {
      LogVerification.verifyNoErrors(componentId).then(check => {
        checks.push(check)
      })
    }

    // Verify success message
    if (opts.verifySuccess) {
      LogVerification.verifySuccessInLog(componentId).then(check => {
        checks.push(check)
      })
    }

    // Verify timestamp
    if (opts.verifyTimestamp) {
      LogVerification.verifyLogTimestampRecent(componentId).then(check => {
        checks.push(check)
      })
    }

    // Verify version in log
    if (opts.verifyVersion && opts.expectedVersion) {
      LogVerification.verifyVersionInLog(componentId, opts.expectedVersion).then(check => {
        checks.push(check)
      })
    }

    const allPassed = checks.every(check => check.passed)

    cy.log(`========================================`)
    cy.log(`=== Log Verification: ${allPassed ? 'PASSED' : 'FAILED'} ===`)
    cy.log(`========================================`)

    return cy.wrap({
      componentId,
      componentName: component.name,
      operation,
      checks,
      passed: allPassed
    })
  }

  /**
   * Verify update log contains expected sequence
   * @param {string} componentId - Component ID
   * @param {string[]} expectedSequence - Expected log message sequence
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLogSequence(componentId, expectedSequence) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Message Sequence (${component.name}) ===`)

    return LogVerification.getAllLogEntries(componentId, 100).then(entries => {
      const messages = entries.map(entry => entry.message)
      let sequenceIndex = 0
      let passed = true

      // Check if all expected messages appear in order
      for (const message of messages) {
        if (message.includes(expectedSequence[sequenceIndex])) {
          cy.log(`✓ Found step ${sequenceIndex + 1}: ${expectedSequence[sequenceIndex]}`)
          sequenceIndex++

          if (sequenceIndex === expectedSequence.length) {
            break
          }
        }
      }

      passed = sequenceIndex === expectedSequence.length

      if (passed) {
        cy.log(`✓ Log sequence verified`)
      } else {
        cy.log(`✗ Log sequence incomplete (found ${sequenceIndex}/${expectedSequence.length})`)
      }

      return cy.wrap({
        check: 'logSequence',
        componentId,
        expectedSteps: expectedSequence.length,
        foundSteps: sequenceIndex,
        passed
      })
    })
  }

  /**
   * Verify no warnings in log
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyNoWarnings(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: No Warnings (${component.name}) ===`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: /Warning|WARN/i
    }).then(warningEntries => {
      const passed = !warningEntries || warningEntries.length === 0

      if (passed) {
        cy.log(`✓ No warnings in log`)
      } else {
        cy.log(`! Warnings found in log: ${warningEntries.length}`)
        warningEntries.forEach(warning => {
          cy.log(`  ! ${warning}`)
        })
      }

      return cy.wrap({
        check: 'noWarnings',
        componentId,
        warningCount: warningEntries ? warningEntries.length : 0,
        warnings: warningEntries || [],
        passed
      })
    })
  }

  /**
   * Verify log contains duration information
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyDurationInLog(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Log Verification: Duration Info (${component.name}) ===`)

    return cy.task('searchUpdateLog', {
      componentId: componentId,
      pattern: /\d+\s*(seconds?|minutes?|ms)/i
    }).then(durationEntry => {
      const passed = durationEntry !== null

      if (passed) {
        cy.log(`✓ Duration info found: ${durationEntry}`)
      } else {
        cy.log(`! Duration info not found in log`)
      }

      return cy.wrap({
        check: 'durationInLog',
        componentId,
        logEntry: durationEntry,
        passed
      })
    })
  }

  /**
   * Clear log file (for testing)
   * @returns {Cypress.Chainable<object>} Clear result
   */
  static clearLogFile() {
    cy.log(`=== Clearing Log File ===`)

    return cy.task('clearLogs').then(result => {
      if (result.success) {
        cy.log(`✓ Log file cleared`)
      } else {
        cy.log(`✗ Failed to clear log file`)
      }

      return cy.wrap(result)
    })
  }

  /**
   * Archive current log file
   * @returns {Cypress.Chainable<string>} Archive path
   */
  static archiveLogFile() {
    cy.log(`=== Archiving Log File ===`)

    return cy.task('archiveLogs').then(result => {
      if (result.success) {
        cy.log(`✓ Logs archived to: ${result.archivePath}`)
        return cy.wrap(result.archivePath)
      } else {
        cy.log(`✗ Failed to archive logs: ${result.error}`)
        throw new Error('Log archive failed')
      }
    })
  }
}

export default LogVerification
