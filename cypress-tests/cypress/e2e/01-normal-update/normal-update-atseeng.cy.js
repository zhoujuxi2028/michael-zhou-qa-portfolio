/**
 * Normal Update Tests - ATSEENG (ATSE Scan Engine)
 *
 * Test ID: TC-UPDATE-008
 * Priority: P1 (High)
 * Component: ATSEENG (ATSE Scan Engine)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - ATSE engine specific verification
 * - Service restart requirement
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

describe('Normal Update - ATSEENG (ATSE Scan Engine)', () => {
  const COMPONENT_ID = 'ATSEENG'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const verificationWorkflow = new VerificationWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()

  let testSnapshot

  before('Setup test environment', () => {
    cy.log('=== ATSEENG Normal Update Test Suite Setup ===')

    setupWorkflow.setupForUpdateTests()

    TestDataSetup.createSnapshot().then(snapshot => {
      testSnapshot = snapshot
    })

    TestDataSetup.setupNormalUpdate(COMPONENT_ID).then(result => {
      cy.log(`✓ Test data ready: ${result.fromVersion} → ${result.toVersion}`)
    })
  })

  after('Cleanup test environment', () => {
    cy.log('=== ATSEENG Normal Update Test Suite Cleanup ===')

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

  describe('TC-UPDATE-008: ATSEENG Normal Update', () => {
    it('Should display ATSEENG component in manual update page', () => {
      cy.log('=== Test: Display ATSEENG Component ===')

      manualUpdatePage.verifyComponentRowExists(COMPONENT_ID)
      manualUpdatePage.selectComponent(COMPONENT_ID)
      manualUpdatePage.verifyComponentSelected(COMPONENT_ID)

      handler.logInfo()
    })

    it('Should perform complete ATSEENG normal update', () => {
      cy.log('=== Test: Complete ATSEENG Normal Update ===')

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

    it('Should verify ATSEENG update at all levels', () => {
      cy.log('=== Test: 4-Level Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      verificationWorkflow.verifyUpdateCompletion(COMPONENT_ID, currentVersion).then(result => {
        expect(result.overallPassed).to.be.true

        result.levels.forEach(level => {
          cy.log(`${level.level}: ${level.passed ? 'PASSED' : 'FAILED'}`)
        })

        cy.log(`✓ Complete verification PASSED`)
      })
    })

    it('Should verify ATSEENG backend state', () => {
      cy.log('=== Test: Backend Verification ===')

      const currentVersion = ComponentVersions[COMPONENT_ID].current

      BackendVerification.verifyINIVersion(COMPONENT_ID, currentVersion).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ INI version: ${check.actual}`)
      })

      BackendVerification.verifyComponentFiles(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Engine files exist (${check.fileCount} files)`)
      })
    })

    it('Should verify ATSEENG log entries', () => {
      cy.log('=== Test: Log Verification ===')

      LogVerification.verifyLogEntryExists(COMPONENT_ID, 'update').then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ Update log entry found`)
      })

      LogVerification.verifyNoErrors(COMPONENT_ID).then(check => {
        expect(check.passed).to.be.true
        cy.log(`✓ No errors in log`)
      })
    })

    it('Should verify ATSEENG engine DLL', () => {
      cy.log('=== Test: Engine DLL Verification ===')

      BackendVerification.verifyEngineDLL(COMPONENT_ID).then(check => {
        if (!check.skipped) {
          expect(check.passed).to.be.true
          cy.log(`✓ ATSE engine DLL verified`)
        }
      })
    })

    it('Should verify ATSEENG requires service restart', () => {
      cy.log('=== Test: Service Restart Requirement ===')

      expect(handler.requiresServiceRestart()).to.be.true

      cy.log(`✓ ATSEENG requires service restart`)
    })

    it('Should verify ATSEENG supports rollback', () => {
      cy.log('=== Test: Rollback Support ===')

      expect(handler.isRollbackSupported()).to.be.true

      cy.log(`✓ ATSEENG supports rollback`)
    })

    it('Should verify ATSEENG is an engine component', () => {
      cy.log('=== Test: Component Category ===')

      expect(handler.isEngine()).to.be.true
      expect(handler.isPattern()).to.be.false

      cy.log(`✓ ATSEENG is an engine component`)
    })

    it('Should verify ATSEENG priority is P1', () => {
      cy.log('=== Test: Component Priority ===')

      const priority = handler.getPriority()
      expect(priority).to.equal('P1')

      cy.log(`✓ ATSEENG is P1 (High) priority`)
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

  describe('TC-UPDATE-008B: ATSEENG Engine-Specific Tests', () => {
    it('Should verify ATSE engine service status', () => {
      cy.log('=== Test: Service Status ===')

      cy.task('checkServiceStatus', { componentId: COMPONENT_ID }).then(isRunning => {
        expect(isRunning).to.be.true
        cy.log(`✓ ATSEENG service is running`)
      })
    })

    it('Should verify ATSE engine update timeout', () => {
      cy.log('=== Test: Update Timeout ===')

      const timeout = handler.getUpdateTimeout()

      expect(timeout).to.be.greaterThan(0)
      cy.log(`ATSE engine update timeout: ${timeout}ms (${timeout / 1000}s)`)

      cy.log(`✓ Timeout configuration valid`)
    })
  })
})
