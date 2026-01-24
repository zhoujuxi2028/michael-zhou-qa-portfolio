/**
 * Update Workflow
 *
 * Orchestrates complete update workflows for IWSVA Update module.
 * Handles end-to-end update scenarios including setup, execution, and verification.
 *
 * @class UpdateWorkflow
 */

import ManualUpdatePage from '../pages/ManualUpdatePage'
import UpdateProgressPage from '../pages/UpdateProgressPage'
import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class UpdateWorkflow {
  constructor() {
    this.manualUpdatePage = new ManualUpdatePage()
    this.progressPage = new UpdateProgressPage()
  }

  /**
   * Execute complete normal update workflow
   * @param {string} componentId - Component ID to update
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow result
   */
  executeNormalUpdate(componentId, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      verifyBefore: true,
      verifyAfter: true,
      captureScreenshots: false,
      ...options
    }

    cy.log(`=== Starting Normal Update Workflow: ${component.name} ===`)

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Verify component is displayed
    if (opts.verifyBefore) {
      this.manualUpdatePage.verifyComponentRowExists(componentId)
    }

    // Capture initial version (if verification enabled)
    let initialVersion
    if (opts.verifyAfter) {
      this.manualUpdatePage.getComponentVersion(componentId).then(version => {
        initialVersion = version
        cy.log(`Initial version: ${initialVersion}`)
      })
    }

    // Screenshot before update
    if (opts.captureScreenshots) {
      this.manualUpdatePage.capturePageState(`${componentId}-before-update`)
    }

    // Perform update
    this.manualUpdatePage.performNormalUpdate(componentId)

    // Wait on progress page
    this.progressPage.waitForPageLoad()

    // Screenshot during update
    if (opts.captureScreenshots) {
      this.progressPage.captureProgress(`${componentId}-updating`)
    }

    // Monitor progress
    this.progressPage.monitorProgress(componentId, opts.logInterval || 5000)

    // Wait for completion
    this.progressPage.waitForUpdateComplete(componentId)

    // Verify update completed
    this.progressPage.verifyUpdateComplete()

    // Screenshot after update
    if (opts.captureScreenshots) {
      this.progressPage.captureProgress(`${componentId}-complete`)
    }

    // Return to manual update page
    this.progressPage.clickBack()
    this.manualUpdatePage.waitForPageLoad()

    // Verify version changed (if enabled)
    if (opts.verifyAfter && initialVersion) {
      this.manualUpdatePage.getComponentVersion(componentId).then(newVersion => {
        cy.log(`New version: ${newVersion}`)

        // Version should have changed or stayed same (if already up-to-date)
        if (newVersion !== initialVersion) {
          cy.log(`✓ Version updated: ${initialVersion} → ${newVersion}`)
        } else {
          cy.log(`! Version unchanged: ${newVersion} (may already be up-to-date)`)
        }
      })
    }

    cy.log(`=== Normal Update Workflow Complete: ${component.name} ===`)

    return cy.wrap({ componentId, success: true })
  }

  /**
   * Execute forced update workflow
   * @param {string} componentId - Component ID to update
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow result
   */
  executeForcedUpdate(componentId, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      acceptConfirmation: true,
      verifyAfter: true,
      captureScreenshots: false,
      ...options
    }

    cy.log(`=== Starting Forced Update Workflow: ${component.name} ===`)

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Verify component is displayed
    this.manualUpdatePage.verifyComponentRowExists(componentId)

    // Capture initial version
    let initialVersion
    this.manualUpdatePage.getComponentVersion(componentId).then(version => {
      initialVersion = version
      cy.log(`Current version: ${initialVersion}`)
    })

    // Screenshot before forced update
    if (opts.captureScreenshots) {
      this.manualUpdatePage.capturePageState(`${componentId}-before-forced`)
    }

    // Perform forced update
    this.manualUpdatePage.performForcedUpdate(componentId)

    // Wait on progress page
    this.progressPage.waitForPageLoad()

    // Monitor and wait for completion
    this.progressPage.waitForUpdateComplete(componentId)
    this.progressPage.verifyUpdateComplete()

    // Return to manual update page
    this.progressPage.clickBack()
    this.manualUpdatePage.waitForPageLoad()

    // Verify version (should be same for forced update)
    if (opts.verifyAfter && initialVersion) {
      this.manualUpdatePage.getComponentVersion(componentId).then(newVersion => {
        expect(newVersion).to.equal(initialVersion)
        cy.log(`✓ Version unchanged after forced update: ${newVersion}`)
      })
    }

    cy.log(`=== Forced Update Workflow Complete: ${component.name} ===`)

    return cy.wrap({ componentId, success: true, forced: true })
  }

  /**
   * Execute rollback workflow
   * @param {string} componentId - Component ID to rollback
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow result
   */
  executeRollback(componentId, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)

    // Verify component supports rollback
    if (!component.canRollback) {
      throw new Error(`Component ${componentId} does not support rollback`)
    }

    const opts = {
      verifyBefore: true,
      verifyAfter: true,
      captureScreenshots: false,
      ...options
    }

    cy.log(`=== Starting Rollback Workflow: ${component.name} ===`)

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Capture current version (before rollback)
    let beforeVersion
    this.manualUpdatePage.getComponentVersion(componentId).then(version => {
      beforeVersion = version
      cy.log(`Version before rollback: ${beforeVersion}`)
    })

    // Screenshot before rollback
    if (opts.captureScreenshots) {
      this.manualUpdatePage.capturePageState(`${componentId}-before-rollback`)
    }

    // Perform rollback
    this.manualUpdatePage.performRollback(componentId)

    // Wait on progress page
    this.progressPage.waitForPageLoad()

    // Monitor rollback progress
    this.progressPage.waitForRollbackComplete(componentId)
    this.progressPage.verifyUpdateComplete()

    // Return to manual update page
    this.progressPage.clickBack()
    this.manualUpdatePage.waitForPageLoad()

    // Verify version changed (rolled back)
    if (opts.verifyAfter && beforeVersion) {
      this.manualUpdatePage.getComponentVersion(componentId).then(afterVersion => {
        cy.log(`Version after rollback: ${afterVersion}`)

        // Version should be different (older)
        expect(afterVersion).to.not.equal(beforeVersion)
        cy.log(`✓ Rollback successful: ${beforeVersion} → ${afterVersion}`)
      })
    }

    cy.log(`=== Rollback Workflow Complete: ${component.name} ===`)

    return cy.wrap({ componentId, success: true, rolledBack: true })
  }

  /**
   * Execute Update All workflow
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow result
   */
  executeUpdateAll(options = {}) {
    const opts = {
      verifyBefore: true,
      verifyAfter: true,
      captureScreenshots: false,
      logInterval: 10000, // 10 seconds for update all
      ...options
    }

    cy.log('=== Starting Update All Workflow ===')

    // Navigate to manual update page
    this.manualUpdatePage.navigate()

    // Verify all components displayed
    if (opts.verifyBefore) {
      this.manualUpdatePage.verifyAllComponentsDisplayed()
    }

    // Capture all versions before update
    const beforeVersions = {}
    if (opts.verifyAfter) {
      this.manualUpdatePage.getAllVersions().then(versions => {
        Object.assign(beforeVersions, versions)
        cy.log('Versions before Update All:', beforeVersions)
      })
    }

    // Screenshot before Update All
    if (opts.captureScreenshots) {
      this.manualUpdatePage.capturePageState('before-update-all')
    }

    // Click Update All
    this.manualUpdatePage.clickUpdateAll()

    // Wait on progress page
    this.progressPage.waitForPageLoad()

    // Monitor progress for all components
    // Note: This assumes sequential updates; adjust if parallel
    const allComponents = ComponentRegistry.getComponentIds()

    allComponents.forEach((compId, index) => {
      cy.log(`[${index + 1}/${allComponents.length}] Waiting for ${compId} update...`)

      // Check progress periodically
      this.progressPage.getProgressPercentage().then(percent => {
        cy.log(`Overall progress: ${percent}%`)
      })

      cy.wait(opts.logInterval)
    })

    // Wait for all updates to complete
    cy.log('Waiting for all updates to complete...')
    this.progressPage.waitForUpdateComplete('ALL', TestConfig.timeouts.updateAll)
    this.progressPage.verifyUpdateComplete()

    // Screenshot after completion
    if (opts.captureScreenshots) {
      this.progressPage.captureProgress('update-all-complete')
    }

    // Return to manual update page
    this.progressPage.clickBack()
    this.manualUpdatePage.waitForPageLoad()

    // Verify versions updated (if enabled)
    if (opts.verifyAfter && Object.keys(beforeVersions).length > 0) {
      this.manualUpdatePage.getAllVersions().then(afterVersions => {
        cy.log('Versions after Update All:', afterVersions)

        // Check which components updated
        let updatedCount = 0
        Object.keys(beforeVersions).forEach(compId => {
          if (afterVersions[compId] !== beforeVersions[compId]) {
            updatedCount++
            cy.log(`✓ ${compId}: ${beforeVersions[compId]} → ${afterVersions[compId]}`)
          } else {
            cy.log(`- ${compId}: ${afterVersions[compId]} (unchanged)`)
          }
        })

        cy.log(`Update All complete: ${updatedCount} components updated`)
      })
    }

    cy.log('=== Update All Workflow Complete ===')

    return cy.wrap({ success: true, updateAll: true })
  }

  /**
   * Execute update with expected failure
   * @param {string} componentId - Component ID
   * @param {string} expectedError - Expected error message
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow result
   */
  executeUpdateWithError(componentId, expectedError, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      captureScreenshots: false,
      ...options
    }

    cy.log(`=== Starting Update with Error Workflow: ${component.name} ===`)
    cy.log(`Expected error: "${expectedError}"`)

    // Navigate and initiate update
    this.manualUpdatePage.navigate()
    this.manualUpdatePage.selectComponent(componentId)
    this.manualUpdatePage.clickUpdate()

    // Wait on progress page
    this.progressPage.waitForPageLoad()

    // Screenshot during error
    if (opts.captureScreenshots) {
      this.progressPage.captureProgress(`${componentId}-error`)
    }

    // Verify update failed
    this.progressPage.verifyUpdateFailed()

    // Verify specific error message
    this.progressPage.verifyErrorMessage(expectedError)

    // Return to manual update page
    this.progressPage.clickBack()
    this.manualUpdatePage.waitForPageLoad()

    cy.log(`=== Error Workflow Complete: ${component.name} ===`)

    return cy.wrap({ componentId, success: false, error: expectedError })
  }

  /**
   * Execute cancelled update workflow
   * @param {string} componentId - Component ID
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow result
   */
  executeCancelledUpdate(componentId, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      cancelAt: 'confirmation', // 'confirmation' or 'progress'
      ...options
    }

    cy.log(`=== Starting Cancelled Update Workflow: ${component.name} ===`)

    this.manualUpdatePage.navigate()

    if (opts.cancelAt === 'confirmation') {
      // Cancel at confirmation dialog
      this.manualUpdatePage.selectComponent(componentId)
      this.manualUpdatePage.clickUpdate()

      // Wait for confirmation dialog
      cy.wait(1000)

      // Cancel the operation
      this.manualUpdatePage.cancelOperation()

      // Should remain on manual update page
      this.manualUpdatePage.verifyUrl(TestConfig.urls.manualUpdatePage)

      cy.log('✓ Update cancelled at confirmation')
    } else {
      // Cancel during progress (if supported)
      cy.log('! Cancel during progress not implemented')
    }

    cy.log(`=== Cancelled Update Workflow Complete: ${component.name} ===`)

    return cy.wrap({ componentId, success: false, cancelled: true })
  }

  /**
   * Verify component is already up-to-date
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable} Workflow result
   */
  verifyAlreadyUpToDate(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Verifying Already Up-to-Date: ${component.name} ===`)

    this.manualUpdatePage.navigate()
    this.manualUpdatePage.selectComponent(componentId)
    this.manualUpdatePage.clickUpdate()

    // Should see "already up-to-date" message
    this.manualUpdatePage.verifyAlreadyUpToDate(componentId)

    cy.log(`=== Verification Complete: ${component.name} is up-to-date ===`)

    return cy.wrap({ componentId, upToDate: true })
  }

  /**
   * Execute batch updates for multiple components
   * @param {string[]} componentIds - Array of component IDs
   * @param {object} options - Workflow options
   * @returns {Cypress.Chainable} Workflow results
   */
  executeBatchUpdates(componentIds, options = {}) {
    cy.log(`=== Starting Batch Update Workflow: ${componentIds.length} components ===`)

    const results = []

    componentIds.forEach((componentId, index) => {
      cy.log(`[${index + 1}/${componentIds.length}] Updating ${componentId}...`)

      this.executeNormalUpdate(componentId, options).then(result => {
        results.push(result)
      })
    })

    cy.log(`=== Batch Update Workflow Complete: ${results.length} components ===`)

    return cy.wrap({ results, batchUpdate: true })
  }
}

export default UpdateWorkflow
