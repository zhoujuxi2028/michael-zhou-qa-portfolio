/**
 * Normal Update Tests - ITE (IntelliTrap Exception)
 *
 * Test ID: TC-UPDATE-005
 * Priority: P2 (Medium)
 * Component: ITE (IntelliTrap Exception)
 */

import UpdateWorkflow from '../../support/workflows/UpdateWorkflow'
import SetupWorkflow from '../../support/workflows/SetupWorkflow'
import VerificationWorkflow from '../../support/workflows/VerificationWorkflow'
import CleanupWorkflow from '../../support/workflows/CleanupWorkflow'
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
import ComponentFactory from '../../support/factories/ComponentFactory'
import TestDataSetup from '../../support/setup/TestDataSetup'
import ComponentVersions from '../../fixtures/component-test-versions.json'

describe('Normal Update - ITE (IntelliTrap Exception)', () => {
  const COMPONENT_ID = 'ITE'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const verificationWorkflow = new VerificationWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()

  let testSnapshot

  before('Setup test environment', () => {
    cy.log('=== ITE Normal Update Test Suite Setup ===')
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

  describe('TC-UPDATE-005: ITE Normal Update', () => {
    it('Should perform complete ITE normal update', () => {
      const previousVersion = ComponentVersions[COMPONENT_ID].previous
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      updateWorkflow.executeNormalUpdate(COMPONENT_ID).then(result => {
        expect(result.success).to.be.true
      })

      manualUpdatePage.getComponentVersion(COMPONENT_ID).then(newVersion => {
        expect(newVersion).to.equal(currentVersion)
        cy.log(`✓ ITE updated: ${previousVersion} → ${newVersion}`)
      })
    })

    it('Should verify ITE update at all levels', () => {
      const currentVersion = ComponentVersions[COMPONENT_ID].current

      verificationWorkflow.verifyUpdateCompletion(COMPONENT_ID, currentVersion).then(result => {
        expect(result.overallPassed).to.be.true
      })
    })
  })
})
