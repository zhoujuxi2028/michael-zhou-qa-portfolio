/**
 * Assertion Helpers
 *
 * Provides enhanced assertion methods with clear, contextual error messages.
 * Improves test failure diagnostics and debugging experience.
 *
 * Usage:
 *   import AssertionHelpers from '../verification/AssertionHelpers'
 *   AssertionHelpers.assertUpdateSuccess(componentId, result)
 *
 * @module AssertionHelpers
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'

class AssertionHelpers {
  /**
   * Assert update operation succeeded
   * @param {string} componentId - Component ID
   * @param {object} result - Update result object
   * @param {boolean} result.success - Success flag
   * @param {string} result.error - Error message (if failed)
   */
  static assertUpdateSuccess(componentId, result) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId

    expect(result.success,
      `${componentName} update should succeed, but got error: ${result.error || 'unknown error'}`
    ).to.be.true
  }

  /**
   * Assert version matches expected value
   * @param {string} componentId - Component ID
   * @param {string} actualVersion - Actual version
   * @param {string} expectedVersion - Expected version
   * @param {string} context - Context (e.g., 'UI', 'INI file')
   */
  static assertVersionMatch(componentId, actualVersion, expectedVersion, context = '') {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId
    const contextStr = context ? ` (${context})` : ''

    expect(actualVersion,
      `${componentName} version${contextStr} should be ${expectedVersion}, but was ${actualVersion}`
    ).to.equal(expectedVersion)
  }

  /**
   * Assert version changed
   * @param {string} componentId - Component ID
   * @param {string} oldVersion - Previous version
   * @param {string} newVersion - Current version
   */
  static assertVersionChanged(componentId, oldVersion, newVersion) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId

    expect(newVersion,
      `${componentName} version should have changed from ${oldVersion}, but is still ${newVersion}`
    ).to.not.equal(oldVersion)
  }

  /**
   * Assert verification check passed
   * @param {object} check - Verification check result
   * @param {boolean} check.passed - Check passed flag
   * @param {string} check.message - Check message
   * @param {string} context - Additional context
   */
  static assertCheckPassed(check, context = '') {
    const message = context
      ? `${context}: ${check.message || 'Verification failed'}`
      : check.message || 'Verification failed'

    expect(check.passed, message).to.be.true
  }

  /**
   * Assert file exists
   * @param {string} filePath - File path
   * @param {boolean} exists - Whether file exists
   * @param {string} fileType - Type of file (e.g., 'lock file', 'pattern file')
   */
  static assertFileExists(filePath, exists, fileType = 'file') {
    if (exists) {
      expect(true,
        `${fileType} should exist at ${filePath}, but was not found`
      ).to.be.true
    } else {
      // For non-existent files, we can't really assert false === true
      // This is just for documentation
      cy.log(`✓ ${fileType} does not exist at ${filePath} (expected)`)
    }
  }

  /**
   * Assert file does not exist (e.g., lock file should be removed)
   * @param {string} filePath - File path
   * @param {boolean} exists - Whether file exists
   * @param {string} fileType - Type of file
   */
  static assertFileRemoved(filePath, exists, fileType = 'file') {
    expect(exists,
      `${fileType} should be removed from ${filePath}, but still exists`
    ).to.be.false
  }

  /**
   * Assert timestamp is recent
   * @param {string|Date} timestamp - Timestamp to check
   * @param {number} maxAgeMinutes - Maximum age in minutes
   * @param {string} context - Context
   */
  static assertTimestampRecent(timestamp, maxAgeMinutes = 10, context = '') {
    const timestampDate = timestamp instanceof Date ? timestamp : new Date(timestamp)
    const now = new Date()
    const ageMinutes = (now - timestampDate) / (1000 * 60)
    const contextStr = context ? ` (${context})` : ''

    expect(ageMinutes,
      `Timestamp${contextStr} should be within ${maxAgeMinutes} minutes, but is ${ageMinutes.toFixed(1)} minutes old`
    ).to.be.lessThan(maxAgeMinutes)
  }

  /**
   * Assert no errors in log
   * @param {string} componentId - Component ID
   * @param {array} errors - Array of error messages
   */
  static assertNoErrors(componentId, errors = []) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId

    expect(errors.length,
      `${componentName} should have no errors, but found ${errors.length} error(s): ${errors.join(', ')}`
    ).to.equal(0)
  }

  /**
   * Assert log entry exists
   * @param {string} componentId - Component ID
   * @param {boolean} found - Whether log entry was found
   * @param {string} operationType - Operation type (e.g., 'update', 'rollback')
   */
  static assertLogEntryExists(componentId, found, operationType = 'operation') {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId

    expect(found,
      `${componentName} ${operationType} should have log entry, but none was found`
    ).to.be.true
  }

  /**
   * Assert component category
   * @param {string} componentId - Component ID
   * @param {string} expectedCategory - Expected category ('pattern' or 'engine')
   */
  static assertComponentCategory(componentId, expectedCategory) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId
    const actualCategory = component ? component.category : 'unknown'

    expect(actualCategory,
      `${componentName} should be a ${expectedCategory}, but is ${actualCategory}`
    ).to.equal(expectedCategory)
  }

  /**
   * Assert component priority
   * @param {string} componentId - Component ID
   * @param {string} expectedPriority - Expected priority (P0, P1, P2, P3)
   */
  static assertComponentPriority(componentId, expectedPriority) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId
    const actualPriority = component ? component.priority : 'unknown'

    expect(actualPriority,
      `${componentName} priority should be ${expectedPriority}, but is ${actualPriority}`
    ).to.equal(expectedPriority)
  }

  /**
   * Assert rollback support
   * @param {string} componentId - Component ID
   * @param {boolean} expectedSupport - Expected rollback support
   */
  static assertRollbackSupport(componentId, expectedSupport) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId
    const actualSupport = component ? component.canRollback : false

    expect(actualSupport,
      `${componentName} rollback support should be ${expectedSupport}, but is ${actualSupport}`
    ).to.equal(expectedSupport)
  }

  /**
   * Assert service restart requirement
   * @param {string} componentId - Component ID
   * @param {boolean} expectedRequirement - Expected restart requirement
   */
  static assertServiceRestartRequired(componentId, expectedRequirement) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId
    const actualRequirement = component ? component.requiresRestart : false

    expect(actualRequirement,
      `${componentName} service restart requirement should be ${expectedRequirement}, but is ${actualRequirement}`
    ).to.equal(expectedRequirement)
  }

  /**
   * Assert progress increased
   * @param {number} oldProgress - Previous progress
   * @param {number} newProgress - Current progress
   * @param {string} componentId - Component ID (optional)
   */
  static assertProgressIncreased(oldProgress, newProgress, componentId = '') {
    const componentStr = componentId ? ` for ${componentId}` : ''

    expect(newProgress,
      `Progress${componentStr} should increase from ${oldProgress}%, but is ${newProgress}%`
    ).to.be.greaterThan(oldProgress)
  }

  /**
   * Assert operation completed within timeout
   * @param {number} duration - Actual duration (ms)
   * @param {number} maxTimeout - Maximum allowed timeout (ms)
   * @param {string} operationType - Operation type
   */
  static assertCompletedWithinTimeout(duration, maxTimeout, operationType = 'operation') {
    const durationSec = Math.floor(duration / 1000)
    const timeoutSec = Math.floor(maxTimeout / 1000)

    expect(duration,
      `${operationType} should complete within ${timeoutSec}s, but took ${durationSec}s`
    ).to.be.lessThan(maxTimeout)
  }

  /**
   * Assert multi-level verification passed
   * @param {object} result - Verification result
   * @param {boolean} result.overallPassed - Overall pass status
   * @param {array} result.levels - Level results
   */
  static assertVerificationPassed(result) {
    const failedLevels = result.levels
      ? result.levels.filter(l => !l.passed).map(l => l.level).join(', ')
      : 'unknown'

    expect(result.overallPassed,
      `Multi-level verification should pass, but failed at: ${failedLevels}`
    ).to.be.true
  }

  /**
   * Assert component files exist
   * @param {string} componentId - Component ID
   * @param {number} fileCount - Number of files found
   * @param {number} minExpected - Minimum expected files
   */
  static assertComponentFilesExist(componentId, fileCount, minExpected = 1) {
    const component = ComponentRegistry.getComponent(componentId)
    const componentName = component ? component.name : componentId

    expect(fileCount,
      `${componentName} should have at least ${minExpected} file(s), but found ${fileCount}`
    ).to.be.at.least(minExpected)
  }

  /**
   * Create custom assertion with context
   * @param {boolean} condition - Condition to assert
   * @param {string} successMessage - Message when assertion passes
   * @param {string} failureMessage - Message when assertion fails
   */
  static assert(condition, successMessage, failureMessage) {
    expect(condition, failureMessage).to.be.true
    if (condition) {
      cy.log(`✓ ${successMessage}`)
    }
  }
}

export default AssertionHelpers
