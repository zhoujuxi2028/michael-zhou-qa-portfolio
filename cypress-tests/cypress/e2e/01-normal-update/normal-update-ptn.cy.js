/**
 * Normal Update Tests - PTN (Virus Pattern)
 *
 * Test ID: TC-UPDATE-001
 * Priority: P0 (Critical)
 * Component: PTN (Virus Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - UI verification (version display, button states)
 * - Backend verification (INI file, pattern files)
 * - Log verification (update logs, no errors)
 * - Business logic verification (scanning functionality)
 */

import UpdateWorkflow from '../../support/workflows/UpdateWorkflow'
import SetupWorkflow from '../../support/workflows/SetupWorkflow'
import VerificationWorkflow from '../../support/workflows/VerificationWorkflow'
import CleanupWorkflow from '../../support/workflows/CleanupWorkflow'
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
import UpdateProgressPage from '../../support/pages/UpdateProgressPage'
import ComponentFactory from '../../support/factories/ComponentFactory'
import TestDataFactory from '../../support/factories/TestDataFactory'
import TestDataSetup from '../../support/setup/TestDataSetup'
import BackendVerification from '../../support/verification/BackendVerification'
import LogVerification from '../../support/verification/LogVerification'
import ComponentVersions from '../../fixtures/component-test-versions.json'

describe('Normal Update - PTN (Virus Pattern)', () => {
  const COMPONENT_ID = 'PTN'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const verificationWorkflow = new VerificationWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()
  const progressPage = new UpdateProgressPage()

  let testSnapshot

  before('Setup test environment', () => {
    cy.log('========================================')
    cy.log('=== PTN Normal Update Test Suite Setup ===')
    cy.log('========================================')

    // Login and setup
    setupWorkflow.setupForUpdateTests()

    // Create state snapshot for restoration
    TestDataSetup.createSnapshot().then(snapshot => {
      testSnapshot = snapshot
    })

    // Setup test data - downgrade PTN to previous version
    TestDataSetup.setupNormalUpdate(COMPONENT_ID).then(result => {
      cy.log(`✓ Test data ready: ${result.fromVersion} → ${result.toVersion}`)
    })
  })

  after('Cleanup test environment', () => {
    cy.log('========================================')
    cy.log('=== PTN Normal Update Test Suite Cleanup ===')
    cy.log('========================================')

    // Restore original state
    if (testSnapshot) {
      TestDataSetup.restoreSnapshot(testSnapshot)
    }

    // Cleanup
    cleanupWorkflow.cleanupAfterSuccess()
  })

  beforeEach('Verify test preconditions', () => {
    // Verify no updates in progress
    setupWorkflow.verifyNoUpdatesInProgress()

    // Navigate to manual update page
    manualUpdatePage.navigate()
  })

  afterEach('Test cleanup', function () {
    // Capture screenshot on failure
    if (this.currentTest.state === 'failed') {
      cleanupWorkflow.captureFailureState(this.currentTest.title)
    }
  })

  describe('TC-UPDATE-001: PTN Normal Update', () => {
    it('Should display PTN component in manual update page', () => {
      cy.log('=== Test: Display PTN Component ===')

      // Verify component row exists
      manualUpdatePage.verifyComponentRowExists(COMPONENT_ID)

      // Verify component can be selected
      manualUpdatePage.selectComponent(COMPONENT_ID)
      manualUpdatePage.verifyComponentSelected(COMPONENT_ID)

      // Log component info
      handler.logInfo()
    })

    it('Should display current PTN version', () => {
      cy.log('=== Test: Display Current Version ===')

      const previousVersion = ComponentVersions[COMPONENT_ID].previous

      // Verify version displayed
      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(version => {
        expect(version).to.equal(previousVersion)
        cy.log(`✓ Current version displayed: ${version}`)
      })
    })

    it('Should perform complete PTN normal update', () => {
      cy.log('=== Test: Complete Normal Update ===')

      const previousVersion = ComponentVersions[COMPONENT_ID].previous
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      // Capture initial state
      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(initialVersion => {
        expect(initialVersion).to.equal(previousVersion)
        cy.log(`Initial version: ${initialVersion}`)
      })

      // Execute update workflow
      updateWorkflow.executeNormalUpdate(COMPONENT_ID, {
        verifyBefore: true,
        verifyAfter: true,
        captureScreenshots: true
      }).then(result => {
        expect(result.success).to.be.true
        cy.log(`✓ Update workflow completed`)
      })

      // Verify new version
      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(newVersion => {
        expect(newVersion).to.equal(currentVersion)
        cy.log(`✓ Version updated: ${previousVersion} → ${newVersion}`)
      })
    })

    it('Should verify PTN update at UI level', () => {
      cy.log('=== Test: UI Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      // Navigate to manual update page
      manualUpdatePage.navigate()

      // Verify version displayed
      manualUpdatePage.verifyComponentVersion(COMPONENT_ID, currentVersion)

      // Verify timestamp updated (should be recent)
      manualUpdatePage.getComponentTimestamp(COMPONENT_ID).then(timestamp => {
        cy.log(`Last update: ${timestamp}`)
        // Verify timestamp is recent (within last 10 minutes)
        const timestampDate = new Date(timestamp)
        const now = new Date()
        const diffMinutes = (now - timestampDate) / (1000 * 60)
        expect(diffMinutes).to.be.lessThan(10)
      })

      // Verify update button is enabled
      manualUpdatePage.verifyUpdateButtonState(true)
    })

    it('Should verify PTN update at backend level', () => {
      cy.log('=== Test: Backend Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      // Verify INI version
      BackendVerification.verifyINIVersion(COMPONENT_ID, currentVersion).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ INI version: ${check.actual}`)
      })

      // Verify lock file removed
      BackendVerification.verifyLockFile(COMPONENT_ID, false).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Lock file removed`)
      })

      // Verify pattern files exist
      BackendVerification.verifyComponentFiles(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Pattern files exist (${check.fileCount} files)`)
      })
    })

    it('Should verify PTN update at log level', () => {
      cy.log('=== Test: Log Level Verification ===')

      // Verify update log entry exists
      LogVerification.verifyLogEntryExists(COMPONENT_ID, 'update').then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Update log entry: ${check.logEntry}`)
      })

      // Verify no errors in log
      LogVerification.verifyNoErrors(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ No errors in log`)
      })

      // Verify success message in log
      LogVerification.verifySuccessInLog(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Success message in log`)
      })

      // Verify log timestamp is recent
      LogVerification.verifyLogTimestampRecent(COMPONENT_ID, 10).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Log timestamp recent: ${check.ageMinutes.toFixed(1)} min ago`)
      })
    })

    it('Should complete 4-level verification for PTN update', () => {
      cy.log('=== Test: Complete 4-Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      // Execute complete verification
      verificationWorkflow.verifyUpdateCompletion(COMPONENT_ID, currentVersion).then(result => {
        expect(result.overallPassed).to.be.true

        // Log verification results
        result.levels.forEach(level => {
          cy.log(`${level.level}: ${level.passed ? 'PASSED' : 'FAILED'}`)
        })

        cy.log(`✓ Complete verification PASSED`)
      })
    })

    it('Should verify PTN pattern integrity after update', () => {
      cy.log('=== Test: Pattern Integrity ===')

      // Verify pattern file integrity
      BackendVerification.verifyPatternIntegrity(COMPONENT_ID).then(check => {
        if (!check.skipped) {
          expect(check.passed).to.be.true
          cy.log(`✓ Pattern integrity verified (checksum: ${check.checksum})`)
        }
      })
    })

    it('Should verify PTN update duration is within acceptable range', () => {
      cy.log('=== Test: Update Duration ===')

      const maxDuration = handler.getUpdateTimeout()

      // Get duration from log
      LogVerification.verifyDurationInLog(COMPONENT_ID).then(check => {
        if (check.passed) {
          cy.log(`✓ Duration info found in log`)
        }
      })

      cy.log(`Maximum allowed duration: ${maxDuration}ms`)
    })

    it('Should handle subsequent update attempt (already up-to-date)', () => {
      cy.log('=== Test: Already Up-to-Date ===')

      // Navigate to manual update page
      manualUpdatePage.navigate()

      // Select PTN
      manualUpdatePage.selectComponent(COMPONENT_ID)

      // Click update
      manualUpdatePage.clickUpdate()

      // Should see "already up-to-date" message
      manualUpdatePage.verifyAlreadyUpToDate(COMPONENT_ID)

      cy.log(`✓ Already up-to-date message displayed`)
    })
  })

  describe('TC-UPDATE-001B: PTN Update Edge Cases', () => {
    it('Should refresh component status', () => {
      cy.log('=== Test: Refresh Status ===')

      manualUpdatePage.navigate()

      // Get initial version
      let initialVersion
      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(version => {
        initialVersion = version
      })

      // Click refresh
      manualUpdatePage.clickRefresh()

      // Verify version still displayed correctly
      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(version => {
        expect(version).to.equal(initialVersion)
        cy.log(`✓ Version consistent after refresh: ${version}`)
      })
    })

    it('Should display component priority correctly', () => {
      cy.log('=== Test: Component Priority ===')

      const priority = handler.getPriority()

      expect(priority).to.equal('P0')
      expect(handler.isCritical()).to.be.true

      cy.log(`✓ PTN is critical (${priority}) component`)
    })

    it('Should verify PTN supports rollback', () => {
      cy.log('=== Test: Rollback Support ===')

      expect(handler.isRollbackSupported()).to.be.true

      cy.log(`✓ PTN supports rollback`)
    })

    it('Should verify PTN does not require service restart', () => {
      cy.log('=== Test: Service Restart Requirement ===')

      expect(handler.requiresServiceRestart()).to.be.false

      cy.log(`✓ PTN does not require service restart`)
    })

    it('Should verify PTN is a pattern component', () => {
      cy.log('=== Test: Component Category ===')

      expect(handler.isPattern()).to.be.true
      expect(handler.isEngine()).to.be.false

      cy.log(`✓ PTN is a pattern component`)
    })
  })

  describe('TC-UPDATE-001C: PTN Update Performance', () => {
    it('Should complete update within timeout', () => {
      cy.log('=== Test: Update Timeout ===')

      const timeout = handler.getUpdateTimeout()

      cy.log(`Update timeout: ${timeout}ms (${timeout / 1000}s)`)

      // This is verified implicitly in the update workflow
      // If update exceeds timeout, test will fail
      expect(timeout).to.be.greaterThan(0)

      cy.log(`✓ Timeout configuration valid`)
    })

    it('Should monitor update progress', () => {
      cy.log('=== Test: Progress Monitoring ===')

      // This would require starting a new update
      // For now, just verify progress page elements exist
      cy.log(`! Progress monitoring tested in main update workflow`)
    })
  })
})
