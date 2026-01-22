/**
 * Normal Update Tests - BOT (Bot Pattern)
 *
 * Test ID: TC-UPDATE-003
 * Priority: P1 (High)
 * Component: BOT (Bot Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Bot pattern specific verification
 */

import UpdateWorkflow from '../../support/workflows/UpdateWorkflow'
import SetupWorkflow from '../../support/workflows/SetupWorkflow'
import VerificationWorkflow from '../../support/workflows/VerificationWorkflow'
import CleanupWorkflow from '../../support/workflows/CleanupWorkflow'
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
import ComponentFactory from '../../support/factories/ComponentFactory'
import TestDataSetup from '../../support/setup/TestDataSetup'
import BackendVerification from '../../support/verification/BackendVerification'
import ComponentVersions from '../../fixtures/component-test-versions.json'

describe('Normal Update - BOT (Bot Pattern)', () => {
  const COMPONENT_ID = 'BOT'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const verificationWorkflow = new VerificationWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()

  let testSnapshot

  before('Setup test environment', () => {
    cy.log('=== BOT Normal Update Test Suite Setup ===')
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

  describe('TC-UPDATE-003: BOT Normal Update', () => {
    it('Should perform complete BOT normal update', () => {
      const previousVersion = ComponentVersions[COMPONENT_ID].previous
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      updateWorkflow.executeNormalUpdate(COMPONENT_ID, {
        verifyBefore: true,
        verifyAfter: true
      }).then(result => {
        expect(result.success).to.be.true
      })

      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(newVersion => {
        expect(newVersion).to.equal(currentVersion)
        cy.log(`✓ BOT updated: ${previousVersion} → ${newVersion}`)
      })
    })

    it('Should verify BOT update at all levels', () => {
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      verificationWorkflow.verifyUpdateCompletion(COMPONENT_ID, currentVersion).then(result => {
        expect(result.overallPassed).to.be.true
        cy.log(`✓ 4-level verification PASSED`)
      })
    })

    it('Should verify BOT INI entry', () => {
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      BackendVerification.verifyINIEntry(COMPONENT_ID, currentVersion).then(result => {
        expect(result.passed).to.be.true
        cy.log(`✓ BOT INI entry verified`)
      })
    })

    it('Should verify BOT supports rollback', () => {
      expect(handler.isRollbackSupported()).to.be.true
      cy.log(`✓ BOT supports rollback`)
    })
  })
})
