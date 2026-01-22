/**
 * Normal Update Tests - SPYWARE (Spyware Pattern)
 *
 * Test ID: TC-UPDATE-002
 * Priority: P1 (High)
 * Component: SPYWARE (Spyware Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Component-specific verification
 * - Pattern integrity validation
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

describe('Normal Update - SPYWARE (Spyware Pattern)', () => {
  const COMPONENT_ID = 'SPYWARE'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const verificationWorkflow = new VerificationWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()

  let testSnapshot

  before('Setup test environment', () => {
    cy.log('=== SPYWARE Normal Update Test Suite Setup ===')
    setupWorkflow.setupForUpdateTests()

    TestDataSetup.createSnapshot().then(snapshot => {
      testSnapshot = snapshot
    })

    TestDataSetup.setupNormalUpdate(COMPONENT_ID)
  })

  after('Cleanup test environment', () => {
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

  describe('TC-UPDATE-002: SPYWARE Normal Update', () => {
    it('Should perform complete SPYWARE normal update', () => {
      const previousVersion = ComponentVersions[COMPONENT_ID].previous
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(initialVersion => {
        expect(initialVersion).to.equal(previousVersion)
      })

      updateWorkflow.executeNormalUpdate(COMPONENT_ID, {
        verifyBefore: true,
        verifyAfter: true
      }).then(result => {
        expect(result.success).to.be.true
      })

      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(newVersion => {
        expect(newVersion).to.equal(currentVersion)
        cy.log(`✓ SPYWARE updated: ${previousVersion} → ${newVersion}`)
      })
    })

    it('Should verify SPYWARE update at all levels', () => {
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      verificationWorkflow.verifyUpdateCompletion(COMPONENT_ID, currentVersion).then(result => {
        expect(result.overallPassed).to.be.true
        cy.log(`✓ 4-level verification PASSED`)
      })
    })

    it('Should verify SPYWARE pattern integrity', () => {
      BackendVerification.verifyPatternIntegrity(COMPONENT_ID).then(check => {
        if (!check.skipped) {
          expect(check.passed).to.be.true
          cy.log(`✓ Spyware pattern integrity verified`)
        }
      })
    })

    it('Should verify SPYWARE supports rollback', () => {
      expect(handler.isRollbackSupported()).to.be.true
      cy.log(`✓ SPYWARE supports rollback`)
    })

    it('Should verify SPYWARE priority is P1', () => {
      expect(handler.getPriority()).to.equal('P1')
      cy.log(`✓ SPYWARE is P1 (High) priority`)
    })
  })
})
