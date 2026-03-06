/**
 * Normal Update Test Generator
 *
 * Generates consistent test suites for normal update testing across all components.
 * Eliminates 85% code duplication by providing a standardized test template.
 *
 * Usage:
 *   import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'
 *
 *   describe('Normal Update - PTN',
 *     NormalUpdateTestGenerator.generateTestSuite('PTN', {
 *       captureScreenshots: true
 *     })
 *   )
 *
 * @module NormalUpdateTestGenerator
 */

import UpdateWorkflow from '../workflows/UpdateWorkflow'
import SetupWorkflow from '../workflows/SetupWorkflow'
import VerificationWorkflow from '../workflows/VerificationWorkflow'
import CleanupWorkflow from '../workflows/CleanupWorkflow'
import ManualUpdatePage from '../pages/ManualUpdatePage'
import ComponentFactory from '../factories/ComponentFactory'
import TestDataSetup from '../setup/TestDataSetup'
import BackendVerification from '../verification/BackendVerification'
import LogVerification from '../verification/LogVerification'
import ComponentVersions from '../../fixtures/component-test-versions.json'
import ComponentRegistry from '../../fixtures/ComponentRegistry'

class NormalUpdateTestGenerator {
  /**
   * Generate complete test suite for a component
   * @param {string} componentId - Component ID (e.g., 'PTN', 'ENG')
   * @param {object} options - Test options
   * @param {boolean} options.captureScreenshots - Capture screenshots during test
   * @param {boolean} options.verboseLogging - Enable verbose logging
   * @param {boolean} options.skipCleanup - Skip cleanup after tests
   * @returns {Function} Test suite function
   */
  static generateTestSuite(componentId, options = {}) {
    const {
      captureScreenshots = true,
      verboseLogging = false,
      skipCleanup = false
    } = options

    // Validate component ID
    const component = ComponentRegistry.getComponent(componentId)
    if (!component) {
      throw new Error(`Invalid component ID: ${componentId}`)
    }

    // Return test suite function
    return function() {
      const handler = ComponentFactory.createHandler(componentId)
      const updateWorkflow = new UpdateWorkflow()
      const setupWorkflow = new SetupWorkflow()
      const verificationWorkflow = new VerificationWorkflow()
      const cleanupWorkflow = new CleanupWorkflow()
      const manualUpdatePage = new ManualUpdatePage()

      let testSnapshot

      // ==================== HOOKS ====================

      before('Setup test environment', function() {
        cy.log('========================================')
        cy.log(`=== ${component.name} Normal Update Test Suite Setup ===`)
        cy.log('========================================')

        // Verify preconditions
        setupWorkflow.setupForUpdateTests()
        setupWorkflow.verifyNoUpdatesInProgress()

        // Create snapshot
        TestDataSetup.createSnapshot().then(snapshot => {
          testSnapshot = snapshot
          if (verboseLogging) {
            cy.log('✓ Snapshot created:', snapshot)
          }
        })

        // Setup test data
        TestDataSetup.setupNormalUpdate(componentId).then(result => {
          cy.log(`✓ Test data ready: ${result.fromVersion} → ${result.toVersion}`)
        })
      })

      after('Cleanup test environment', function() {
        if (skipCleanup) {
          cy.log('⚠ Cleanup skipped (skipCleanup=true)')
          return
        }

        cy.log(`=== ${component.name} Normal Update Test Suite Cleanup ===`)

        if (testSnapshot) {
          TestDataSetup.restoreSnapshot(testSnapshot).catch(err => {
            cy.log('⚠ Snapshot restoration failed:', err.message)
          })
        }

        cleanupWorkflow.cleanupAfterSuccess()
      })

      beforeEach('Verify test preconditions', function() {
        setupWorkflow.verifyNoUpdatesInProgress()
        manualUpdatePage.navigate()
      })

      afterEach('Test cleanup', function() {
        if (this.currentTest.state === 'failed') {
          if (captureScreenshots) {
            cy.screenshot(`failure-${componentId}-${this.currentTest.title}`)
          }
          cleanupWorkflow.captureFailureState(this.currentTest.title)
        }
      })

      // ==================== TEST CASES ====================

      describe(`TC-UPDATE: ${component.name} Normal Update`, function() {
        it('Should display component in manual update page', function() {
          cy.log(`=== Test: Display ${component.name} Component ===`)

          manualUpdatePage.verifyComponentRowExists(componentId)
          manualUpdatePage.selectComponent(componentId)
          manualUpdatePage.verifyComponentSelected(componentId)

          if (verboseLogging) {
            handler.logInfo()
          }

          cy.log(`✓ ${component.name} component displayed correctly`)
        })

        it('Should perform complete normal update', function() {
          cy.log(`=== Test: Complete ${component.name} Normal Update ===`)

          const previousVersion = ComponentVersions[componentId].previous
          const currentVersion = ComponentVersions[componentId].current

          // Verify initial version
          manualUpdatePage.getComponentVersion(componentId).then(initialVersion => {
            expect(initialVersion, `${component.name} should start at previous version`).to.equal(previousVersion)
            cy.log(`Initial version: ${initialVersion}`)
          })

          // Execute update
          updateWorkflow.executeNormalUpdate(componentId, {
            verifyBefore: true,
            verifyAfter: true,
            captureScreenshots
          }).then(result => {
            expect(result.success, `${component.name} update should succeed`).to.be.true
            cy.log(`✓ Update workflow completed`)
          })

          // Verify final version
          manualUpdatePage.getComponentVersion(componentId).then(newVersion => {
            expect(newVersion, `${component.name} should be updated to current version`).to.equal(currentVersion)
            cy.log(`✓ Version updated: ${previousVersion} → ${newVersion}`)
          })
        })

        it('Should verify update at UI level', function() {
          cy.log('=== Test: UI Level Verification ===')

          const currentVersion = ComponentVersions[componentId].current

          manualUpdatePage.navigate()
          manualUpdatePage.verifyComponentVersion(componentId, currentVersion)

          manualUpdatePage.getComponentTimestamp(componentId).then(timestamp => {
            cy.log(`Last update: ${timestamp}`)
            const timestampDate = new Date(timestamp)
            const now = new Date()
            const diffMinutes = (now - timestampDate) / (1000 * 60)
            expect(diffMinutes, 'Update timestamp should be recent').to.be.lessThan(10)
            cy.log(`✓ Timestamp is recent (${diffMinutes.toFixed(1)} min ago)`)
          })

          cy.log(`✓ UI verification PASSED`)
        })

        it('Should verify update at backend level', function() {
          cy.log('=== Test: Backend Level Verification ===')

          const currentVersion = ComponentVersions[componentId].current

          BackendVerification.verifyINIVersion(componentId, currentVersion).then(check => {
            expect(check.passed, `INI version should be ${currentVersion}`).to.be.true
            cy.log(`✓ INI version: ${check.actual}`)
          })

          BackendVerification.verifyLockFile(componentId, false).then(check => {
            expect(check.passed, 'Lock file should be removed after update').to.be.true
            cy.log(`✓ Lock file removed`)
          })

          BackendVerification.verifyComponentFiles(componentId).then(check => {
            expect(check.passed, 'Component files should exist').to.be.true
            cy.log(`✓ ${component.category === 'engine' ? 'Engine' : 'Pattern'} files exist (${check.fileCount} files)`)
          })

          cy.log(`✓ Backend verification PASSED`)
        })

        it('Should verify update at log level', function() {
          cy.log('=== Test: Log Level Verification ===')

          LogVerification.verifyLogEntryExists(componentId, 'update').then(check => {
            expect(check.passed, 'Update log entry should exist').to.be.true
            cy.log(`✓ Update log entry found`)
          })

          LogVerification.verifyNoErrors(componentId).then(check => {
            expect(check.passed, 'No errors should be present in logs').to.be.true
            cy.log(`✓ No errors in log`)
          })

          LogVerification.verifySuccessInLog(componentId).then(check => {
            expect(check.passed, 'Success message should be in log').to.be.true
            cy.log(`✓ Success message in log`)
          })

          cy.log(`✓ Log verification PASSED`)
        })

        it('Should complete 4-level verification', function() {
          cy.log('=== Test: Complete 4-Level Verification ===')

          const currentVersion = ComponentVersions[componentId].current

          verificationWorkflow.verifyUpdateCompletion(componentId, currentVersion).then(result => {
            expect(result.overallPassed, 'All verification levels should pass').to.be.true

            result.levels.forEach(level => {
              cy.log(`${level.level}: ${level.passed ? 'PASSED' : 'FAILED'}`)
            })

            cy.log(`✓ Complete verification PASSED`)
          })
        })

        // Engine-specific tests
        if (component.category === 'engine') {
          it('Should verify engine DLL integrity after update', function() {
            cy.log('=== Test: Engine DLL Integrity ===')

            BackendVerification.verifyEngineDLL(componentId).then(check => {
              if (!check.skipped) {
                expect(check.passed, 'Engine DLL should be valid').to.be.true
                cy.log(`✓ Engine DLL verified: ${check.dllPath}`)
              } else {
                cy.log('⚠ Engine DLL check skipped')
              }
            })
          })

          it('Should verify engine requires service restart', function() {
            cy.log('=== Test: Service Restart Requirement ===')

            const requiresRestart = handler.requiresServiceRestart()
            expect(requiresRestart, `${component.name} should require service restart`).to.be.true

            cy.log(`✓ ${component.name} requires service restart`)
          })
        }

        it('Should verify rollback support', function() {
          cy.log('=== Test: Rollback Support ===')

          const canRollback = handler.isRollbackSupported()
          const expected = component.canRollback

          expect(canRollback, `${component.name} rollback support should be ${expected}`).to.equal(expected)

          if (canRollback) {
            cy.log(`✓ ${component.name} supports rollback`)
          } else {
            cy.log(`✓ ${component.name} does not support rollback (expected)`)
          }
        })

        it('Should verify component category', function() {
          cy.log('=== Test: Component Category ===')

          if (component.category === 'engine') {
            expect(handler.isEngine(), `${component.name} should be an engine`).to.be.true
            expect(handler.isPattern(), `${component.name} should not be a pattern`).to.be.false
            cy.log(`✓ ${component.name} is an engine component`)
          } else {
            expect(handler.isPattern(), `${component.name} should be a pattern`).to.be.true
            expect(handler.isEngine(), `${component.name} should not be an engine`).to.be.false
            cy.log(`✓ ${component.name} is a pattern component`)
          }
        })

        it('Should verify component priority', function() {
          cy.log('=== Test: Component Priority ===')

          const priority = handler.getPriority()
          expect(priority, `Priority should match registry`).to.equal(component.priority)

          const isCritical = handler.isCritical()
          const expectedCritical = component.priority === 'P0'
          expect(isCritical, `Critical status should be ${expectedCritical}`).to.equal(expectedCritical)

          cy.log(`✓ ${component.name} priority: ${priority} (critical: ${isCritical})`)
        })

        it('Should handle subsequent update attempt (already up-to-date)', function() {
          cy.log('=== Test: Already Up-to-Date ===')

          manualUpdatePage.navigate()
          manualUpdatePage.selectComponent(componentId)
          manualUpdatePage.clickUpdate()

          manualUpdatePage.verifyAlreadyUpToDate(componentId)

          cy.log(`✓ Already up-to-date message displayed`)
        })

        it('Should verify update timeout is configured', function() {
          cy.log('=== Test: Update Timeout ===')

          const timeout = handler.getUpdateTimeout()

          expect(timeout, 'Update timeout should be positive').to.be.greaterThan(0)
          cy.log(`${component.name} update timeout: ${timeout}ms (${timeout / 1000}s)`)

          cy.log(`✓ Timeout configuration valid`)
        })
      })

      // Engine-specific service tests
      if (component.category === 'engine') {
        describe(`${component.name} Engine-Specific Tests`, function() {
          it('Should verify engine service status after update', function() {
            cy.log('=== Test: Service Status ===')

            cy.task('checkServiceStatus', { componentId }).then(isRunning => {
              expect(isRunning, `${component.name} service should be running`).to.be.true
              cy.log(`✓ ${component.name} service is running`)
            })
          })
        })
      }
    }
  }

  /**
   * Generate simplified test suite (3-step pattern)
   * @param {string} componentId - Component ID
   * @param {object} options - Test options
   * @returns {Function} Simplified test suite function
   */
  static generateSimpleTestSuite(componentId, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    if (!component) {
      throw new Error(`Invalid component ID: ${componentId}`)
    }

    return function() {
      const updateWorkflow = new UpdateWorkflow()
      const setupWorkflow = new SetupWorkflow()
      const cleanupWorkflow = new CleanupWorkflow()
      const manualUpdatePage = new ManualUpdatePage()

      let testSnapshot

      it('Step 1: Initialize test environment', function() {
        cy.log('========================================')
        cy.log('=== STEP 1: Initialize ===')
        cy.log('========================================')

        setupWorkflow.setupForUpdateTests()

        TestDataSetup.createSnapshot().then(snapshot => {
          testSnapshot = snapshot
          cy.log('✓ Snapshot created')
        })

        TestDataSetup.setupNormalUpdate(componentId).then(result => {
          cy.log(`✓ Test data ready: ${result.fromVersion} → ${result.toVersion}`)
        })

        manualUpdatePage.navigate()

        const previousVersion = ComponentVersions[componentId].previous
        manualUpdatePage.getComponentVersion(componentId).then(version => {
          expect(version, `Should start at previous version`).to.equal(previousVersion)
          cy.log(`✓ Initial version: ${version}`)
        })
      })

      it('Step 2: Trigger update on page', function() {
        cy.log('========================================')
        cy.log('=== STEP 2: Trigger Update ===')
        cy.log('========================================')

        const previousVersion = ComponentVersions[componentId].previous
        const currentVersion = ComponentVersions[componentId].current

        manualUpdatePage.navigate()
        manualUpdatePage.verifyComponentRowExists(componentId)
        cy.log('✓ Component row found')

        manualUpdatePage.selectComponent(componentId)
        manualUpdatePage.verifyComponentSelected(componentId)
        cy.log('✓ Component selected')

        updateWorkflow.executeNormalUpdate(componentId, {
          verifyBefore: true,
          verifyAfter: true,
          captureScreenshots: options.captureScreenshots || true
        }).then(result => {
          expect(result.success, `${component.name} update should succeed`).to.be.true
          cy.log(`✓ Update completed: ${previousVersion} → ${currentVersion}`)
        })
      })

      it('Step 3: Verify update completion (UI + Backend/Logs)', function() {
        cy.log('========================================')
        cy.log('=== STEP 3: Verify Update ===')
        cy.log('========================================')

        const currentVersion = ComponentVersions[componentId].current

        // UI Verification
        cy.log('--- UI Verification ---')
        manualUpdatePage.navigate()
        manualUpdatePage.verifyComponentVersion(componentId, currentVersion)
        cy.log(`✓ UI: Version updated to ${currentVersion}`)

        manualUpdatePage.getComponentTimestamp(componentId).then(timestamp => {
          const timestampDate = new Date(timestamp)
          const now = new Date()
          const diffMinutes = (now - timestampDate) / (1000 * 60)
          expect(diffMinutes, 'Timestamp should be recent').to.be.lessThan(10)
          cy.log(`✓ UI: Timestamp recent (${diffMinutes.toFixed(1)} min ago)`)
        })

        // Backend Verification
        cy.log('--- Backend Verification ---')
        BackendVerification.verifyINIVersion(componentId, currentVersion).then(check => {
          expect(check.passed, `INI version should be ${currentVersion}`).to.be.true
          cy.log(`✓ Backend: INI version = ${check.actual}`)
        })

        BackendVerification.verifyComponentFiles(componentId).then(check => {
          expect(check.passed, 'Component files should exist').to.be.true
          cy.log(`✓ Backend: ${component.category === 'engine' ? 'Engine' : 'Pattern'} files exist (${check.fileCount} files)`)
        })

        BackendVerification.verifyLockFile(componentId, false).then(check => {
          expect(check.passed, 'Lock file should be removed').to.be.true
          cy.log(`✓ Backend: Lock file removed`)
        })

        // Log Verification
        cy.log('--- Log Verification ---')
        LogVerification.verifyLogEntryExists(componentId, 'update').then(check => {
          expect(check.passed, 'Update log entry should exist').to.be.true
          cy.log(`✓ Log: Update entry exists`)
        })

        LogVerification.verifyNoErrors(componentId).then(check => {
          expect(check.passed, 'No errors should be in logs').to.be.true
          cy.log(`✓ Log: No errors`)
        })

        LogVerification.verifySuccessInLog(componentId).then(check => {
          expect(check.passed, 'Success message should be in log').to.be.true
          cy.log(`✓ Log: Success message found`)
        })

        cy.log('========================================')
        cy.log('=== All Verifications PASSED ===')
        cy.log('========================================')
      })

      after('Cleanup test environment', function() {
        if (testSnapshot) {
          TestDataSetup.restoreSnapshot(testSnapshot)
        }
        cleanupWorkflow.cleanupAfterSuccess()
      })
    }
  }
}

export default NormalUpdateTestGenerator
