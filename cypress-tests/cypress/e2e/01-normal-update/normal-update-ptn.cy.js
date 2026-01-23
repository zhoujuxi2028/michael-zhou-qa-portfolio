/**
 * Normal Update Tests - PTN (Virus Pattern)
 *
 * Test ID: TC-UPDATE-001
 * Priority: P0 (Critical)
 * Component: PTN (Virus Pattern)
 *
 * Test Flow:
 * Step 1: Initialize test environment and downgrade to previous version
 * Step 2: Trigger update on manual update page
 * Step 3: Verify update completion (UI + Backend/Logs)
 */

import UpdateWorkflow from '../../support/workflows/UpdateWorkflow'
import SetupWorkflow from '../../support/workflows/SetupWorkflow'
import CleanupWorkflow from '../../support/workflows/CleanupWorkflow'
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
import ComponentFactory from '../../support/factories/ComponentFactory'
import TestDataSetup from '../../support/setup/TestDataSetup'
import BackendVerification from '../../support/verification/BackendVerification'
import LogVerification from '../../support/verification/LogVerification'
import ComponentVersions from '../../fixtures/component-test-versions.json'

describe('Normal Update - PTN (Virus Pattern)', () => {
  const COMPONENT_ID = 'PTN'
  const handler = ComponentFactory.createHandler(COMPONENT_ID)
  const updateWorkflow = new UpdateWorkflow()
  const setupWorkflow = new SetupWorkflow()
  const cleanupWorkflow = new CleanupWorkflow()
  const manualUpdatePage = new ManualUpdatePage()

  let testSnapshot

  // Step 1: Initialize
  it('Step 1: Initialize test environment', () => {
    cy.log('========================================')
    cy.log('=== STEP 1: Initialize ===')
    cy.log('========================================')

    // Login and setup
    setupWorkflow.setupForUpdateTests()

    // Create state snapshot for restoration
    TestDataSetup.createSnapshot().then(snapshot => {
      testSnapshot = snapshot
      cy.log('✓ Snapshot created')
    })

    // Setup test data - downgrade PTN to previous version
    TestDataSetup.setupNormalUpdate(COMPONENT_ID).then(result => {
      cy.log(`✓ Test data ready: ${result.fromVersion} → ${result.toVersion}`)
    })

    // Navigate to manual update page
    manualUpdatePage.navigate()

    // Verify initial state
    const previousVersion = ComponentVersions[COMPONENT_ID].previous
    manualUpdatePage.getComponentVersion(COMPONENT_ID).then(version => {
      expect(version).to.equal(previousVersion)
      cy.log(`✓ Initial version: ${version}`)
    })
  })

  // Step 2: Trigger update
  it('Step 2: Trigger update on page', () => {
    cy.log('========================================')
    cy.log('=== STEP 2: Trigger Update ===')
    cy.log('========================================')

    const previousVersion = ComponentVersions[COMPONENT_ID].previous
    const currentVersion = ComponentVersions[COMPONENT_ID].current

    // Navigate to manual update page
    manualUpdatePage.navigate()

    // Verify component row exists
    manualUpdatePage.verifyComponentRowExists(COMPONENT_ID)
    cy.log('✓ Component row found')

    // Select component
    manualUpdatePage.selectComponent(COMPONENT_ID)
    manualUpdatePage.verifyComponentSelected(COMPONENT_ID)
    cy.log('✓ Component selected')

    // Execute update
    updateWorkflow.executeNormalUpdate(COMPONENT_ID, {
      verifyBefore: true,
      verifyAfter: true,
      captureScreenshots: true
    }).then(result => {
      expect(result.success).to.be.true
      cy.log(`✓ Update completed: ${previousVersion} → ${currentVersion}`)
    })
  })

  // Step 3: Verify
  it('Step 3: Verify update completion (UI + Backend/Logs)', () => {
    cy.log('========================================')
    cy.log('=== STEP 3: Verify Update ===')
    cy.log('========================================')

    const currentVersion = ComponentVersions[COMPONENT_ID].current

    // UI Verification
    cy.log('--- UI Verification ---')
    manualUpdatePage.navigate()
    manualUpdatePage.verifyComponentVersion(COMPONENT_ID, currentVersion)
    cy.log(`✓ UI: Version updated to ${currentVersion}`)

    manualUpdatePage.getComponentTimestamp(COMPONENT_ID).then(timestamp => {
      const timestampDate = new Date(timestamp)
      const now = new Date()
      const diffMinutes = (now - timestampDate) / (1000 * 60)
      expect(diffMinutes).to.be.lessThan(10)
      cy.log(`✓ UI: Timestamp recent (${diffMinutes.toFixed(1)} min ago)`)
    })

    // Backend Verification (First Unit Check)
    cy.log('--- Backend Verification (First Unit) ---')
    BackendVerification.verifyINIVersion(COMPONENT_ID, currentVersion).then(check => {
      expect(check.passed).to.be.true
      cy.log(`✓ Backend: INI version = ${check.actual}`)
    })

    BackendVerification.verifyComponentFiles(COMPONENT_ID).then(check => {
      expect(check.passed).to.be.true
      cy.log(`✓ Backend: Pattern files exist (${check.fileCount} files)`)
    })

    BackendVerification.verifyLockFile(COMPONENT_ID, false).then(check => {
      expect(check.passed).to.be.true
      cy.log(`✓ Backend: Lock file removed`)
    })

    // Log Verification (First Unit Check)
    cy.log('--- Log Verification (First Unit) ---')
    LogVerification.verifyLogEntryExists(COMPONENT_ID, 'update').then(check => {
      expect(check.passed).to.be.true
      cy.log(`✓ Log: Update entry exists`)
    })

    LogVerification.verifyNoErrors(COMPONENT_ID).then(check => {
      expect(check.passed).to.be.true
      cy.log(`✓ Log: No errors`)
    })

    LogVerification.verifySuccessInLog(COMPONENT_ID).then(check => {
      expect(check.passed).to.be.true
      cy.log(`✓ Log: Success message found`)
    })

    cy.log('========================================')
    cy.log('=== All Verifications PASSED ===')
    cy.log('========================================')
  })

  after('Cleanup test environment', () => {
    // Restore original state
    if (testSnapshot) {
      TestDataSetup.restoreSnapshot(testSnapshot)
    }

    // Cleanup
    cleanupWorkflow.cleanupAfterSuccess()
  })
})
