/**
 * Normal Update Tests - ENG (Virus Scan Engine)
 *
 * Test ID: TC-UPDATE-007
 * Priority: P0 (Critical)
 * Component: ENG (Virus Scan Engine)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Service restart verification
 * - Engine DLL verification
 * - Critical component validation
 */

import UpdateWorkflow from '../../support/workflows/UpdateWorkflow'
import SetupWorkflow from '../../support/workflows/SetupWorkflow'
import VerificationWorkflow from '../../support/workflows/VerificationWorkflow'
import CleanupWorkflow from '../../support/workflows/CleanupWorkflow'
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
import ComponentFactory from '../../support/factories/ComponentFactory'
import TestDataSetup from '../../support/setup/TestDataSetup'
import BackendVerification from '../../support/verification/BackendVerification'
import LogVerification from '../../support/verification/LogVerification'
import ComponentVersions from '../../fixtures/component-test-versions.json'

describe('Normal Update - ENG (Virus Scan Engine)', () => {
  const COMPONENT_ID = 'ENG'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const verificationWorkflow = new VerificationWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()

  let testSnapshot

  before('Setup test environment', () => {
    cy.log('========================================')
    cy.log('=== ENG Normal Update Test Suite Setup ===')
    cy.log('========================================')

    setupWorkflow.setupForUpdateTests()

    TestDataSetup.createSnapshot().then(snapshot => {
      testSnapshot = snapshot
    })

    TestDataSetup.setupNormalUpdate(COMPONENT_ID).then(result => {
      cy.log(`✓ Test data ready: ${result.fromVersion} → ${result.toVersion}`)
    })
  })

  after('Cleanup test environment', () => {
    cy.log('=== ENG Normal Update Test Suite Cleanup ===')

    if (testSnapshot) {
      TestDataSetup.restoreSnapshot(testSnapshot)
    }

    cleanupWorkflow.cleanupAfterSuccess()
  })

  beforeEach('Verify test preconditions', () => {
    setupWorkflow.verifyNoUpdatesInProgress()
    manualUpdatePage.navigate()
  })

  afterEach('Test cleanup', function () {
    if (this.currentTest.state === 'failed') {
      cleanupWorkflow.captureFailureState(this.currentTest.title)
    }
  })

  describe('TC-UPDATE-007: ENG Normal Update', () => {
    it('Should display ENG component in manual update page', () => {
      cy.log('=== Test: Display ENG Component ===')

      manualUpdatePage.verifyComponentRowExists(COMPONENT_ID)
      manualUpdatePage.selectComponent(COMPONENT_ID)
      manualUpdatePage.verifyComponentSelected(COMPONENT_ID)

      handler.logInfo()
    })

    it('Should perform complete ENG normal update', () => {
      cy.log('=== Test: Complete ENG Normal Update ===')

      const previousVersion = ComponentVersions[COMPONENT_ID].previous
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(initialVersion => {
        expect(initialVersion).to.equal(previousVersion)
        cy.log(`Initial version: ${initialVersion}`)
      })

      updateWorkflow.executeNormalUpdate(COMPONENT_ID, {
        verifyBefore: true,
        verifyAfter: true,
        captureScreenshots: true
      }).then(result => {
        expect(result.success).to.be.true
        cy.log(`✓ Update workflow completed`)
      })

      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(newVersion => {
        expect(newVersion).to.equal(currentVersion)
        cy.log(`✓ Version updated: ${previousVersion} → ${newVersion}`)
      })
    })

    it('Should verify ENG update at UI level', () => {
      cy.log('=== Test: UI Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      manualUpdatePage.navigate()
      manualUpdatePage.verifyComponentVersion(COMPONENT_ID, currentVersion)

      manualUpdatePage.getComponentTimestamp(COMPONENT_ID).then(timestamp => {
        cy.log(`Last update: ${timestamp}`)
        const timestampDate = new Date(timestamp)
        const now = new Date()
        const diffMinutes = (now - timestampDate) / (1000 * 60)
        expect(diffMinutes).to.be.lessThan(10)
      })

      cy.log(`✓ UI verification PASSED`)
    })

    it('Should verify ENG update at backend level', () => {
      cy.log('=== Test: Backend Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      BackendVerification.verifyINIVersion(COMPONENT_ID, currentVersion).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ INI version: ${check.actual}`)
      })

      BackendVerification.verifyLockFile(COMPONENT_ID, false).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Lock file removed`)
      })

      BackendVerification.verifyComponentFiles(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Engine files exist (${check.fileCount} files)`)
      })

      cy.log(`✓ Backend verification PASSED`)
    })

    it('Should verify ENG update at log level', () => {
      cy.log('=== Test: Log Level Verification ===')

      LogVerification.verifyLogEntryExists(COMPONENT_ID, 'update').then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Update log entry found`)
      })

      LogVerification.verifyNoErrors(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ No errors in log`)
      })

      LogVerification.verifySuccessInLog(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Success message in log`)
      })

      cy.log(`✓ Log verification PASSED`)
    })

    it('Should complete 4-level verification for ENG update', () => {
      cy.log('=== Test: Complete 4-Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      verificationWorkflow.verifyUpdateCompletion(COMPONENT_ID, currentVersion).then(result => {
        expect(result.overallPassed).to.be.true

        result.levels.forEach(level => {
          cy.log(`${level.level}: ${level.passed ? 'PASSED' : 'FAILED'}`)
        })

        cy.log(`✓ Complete verification PASSED`)
      })
    })

    it('Should verify ENG DLL integrity after update', () => {
      cy.log('=== Test: Engine DLL Integrity ===')

      BackendVerification.verifyEngineDLL(COMPONENT_ID).then(check => {
        if (!check.skipped) {
          expect(check.passed).to.be.true
          cy.log(`✓ Engine DLL verified: ${check.dllPath}`)
        }
      })
    })

    it('Should verify ENG requires service restart', () => {
      cy.log('=== Test: Service Restart Requirement ===')

      expect(handler.requiresServiceRestart()).to.be.true

      cy.log(`✓ ENG requires service restart`)
    })

    it('Should verify ENG supports rollback', () => {
      cy.log('=== Test: Rollback Support ===')

      expect(handler.isRollbackSupported()).to.be.true

      cy.log(`✓ ENG supports rollback`)
    })

    it('Should verify ENG is an engine component', () => {
      cy.log('=== Test: Component Category ===')

      expect(handler.isEngine()).to.be.true
      expect(handler.isPattern()).to.be.false

      cy.log(`✓ ENG is an engine component`)
    })

    it('Should verify ENG is critical (P0) component', () => {
      cy.log('=== Test: Component Priority ===')

      const priority = handler.getPriority()
      expect(priority).to.equal('P0')
      expect(handler.isCritical()).to.be.true

      cy.log(`✓ ENG is critical (${priority}) component`)
    })

    it('Should handle subsequent update attempt (already up-to-date)', () => {
      cy.log('=== Test: Already Up-to-Date ===')

      manualUpdatePage.navigate()
      manualUpdatePage.selectComponent(COMPONENT_ID)
      manualUpdatePage.clickUpdate()

      manualUpdatePage.verifyAlreadyUpToDate(COMPONENT_ID)

      cy.log(`✓ Already up-to-date message displayed`)
    })
  })

  describe('TC-UPDATE-007B: ENG Engine-Specific Tests', () => {
    it('Should verify engine service status after update', () => {
      cy.log('=== Test: Service Status ===')

      // Verify service is running
      cy.task('checkServiceStatus', { componentId: COMPONENT_ID }).then(isRunning => {
        expect(isRunning).to.be.true
        cy.log(`✓ ENG service is running`)
      })
    })

    it('Should verify engine update timeout is configured', () => {
      cy.log('=== Test: Update Timeout ===')

      const timeout = handler.getUpdateTimeout()

      expect(timeout).to.be.greaterThan(0)
      cy.log(`Engine update timeout: ${timeout}ms (${timeout / 1000}s)`)

      cy.log(`✓ Timeout configuration valid`)
    })
  })
})
