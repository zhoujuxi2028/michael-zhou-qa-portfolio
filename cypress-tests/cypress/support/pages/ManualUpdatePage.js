/**
 * Manual Update Page Object
 *
 * Page Object for IWSVA Manual Update page (/jsp/manual_update.jsp).
 * Handles component selection, update operations, and status verification.
 *
 * @class ManualUpdatePage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'
import ComponentRegistry from '../../fixtures/ComponentRegistry'

class ManualUpdatePage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.manualUpdatePage
  }

  /**
   * Navigate to Manual Update page
   */
  navigate() {
    cy.log('Navigating to Manual Update page')
    this.visit(this.pageUrl)
    this.waitForPageLoad()
    this.verifyPageLoaded()
  }

  /**
   * Verify Manual Update page is loaded
   */
  verifyPageLoaded() {
    cy.log('Verifying Manual Update page loaded')

    // Verify page elements exist
    cy.get(TestConstants.SELECTORS.manualUpdate.componentTable, {
      timeout: TestConfig.timeouts.pageLoad
    }).should('be.visible')

    cy.get(TestConstants.SELECTORS.manualUpdate.updateButton)
      .should('be.visible')

    cy.log('Manual Update page loaded successfully')
  }

  /**
   * Select component by ID
   * @param {string} componentId - Component ID (e.g., 'PTN', 'ENG')
   */
  selectComponent(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    if (!component) {
      throw new Error(`Component not found: ${componentId}`)
    }

    cy.log(`Selecting component: ${component.name} (${componentId})`)

    const selector = TestConstants.SELECTORS.manualUpdate.componentRadio(componentId)

    cy.get(selector, { timeout: TestConfig.timeouts.elementVisible })
      .should('exist')
      .check({ force: true })
      .should('be.checked')

    cy.log(`Component ${componentId} selected`)
  }

  /**
   * Verify component is selected
   * @param {string} componentId - Component ID
   */
  verifyComponentSelected(componentId) {
    const selector = TestConstants.SELECTORS.manualUpdate.componentRadio(componentId)
    cy.get(selector).should('be.checked')
  }

  /**
   * Get selected component ID
   * @returns {Cypress.Chainable<string>} Selected component ID
   */
  getSelectedComponent() {
    return cy.get(TestConstants.SELECTORS.manualUpdate.selectedComponent)
      .invoke('val')
  }

  /**
   * Click Update button
   */
  clickUpdate() {
    cy.log('Clicking Update button')

    cy.get(TestConstants.SELECTORS.manualUpdate.updateButton)
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    cy.log('Update button clicked')
  }

  /**
   * Click Rollback button
   */
  clickRollback() {
    cy.log('Clicking Rollback button')

    cy.get(TestConstants.SELECTORS.manualUpdate.rollbackButton)
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    cy.log('Rollback button clicked')
  }

  /**
   * Click Update All button
   */
  clickUpdateAll() {
    cy.log('Clicking Update All button')

    cy.get(TestConstants.SELECTORS.manualUpdate.updateAllButton)
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    cy.log('Update All button clicked')
  }

  /**
   * Click Refresh button
   */
  clickRefresh() {
    cy.log('Clicking Refresh button')

    cy.get(TestConstants.SELECTORS.manualUpdate.refreshButton)
      .should('be.visible')
      .click()

    cy.wait(2000) // Wait for page refresh
    cy.log('Refresh button clicked')
  }

  /**
   * Get component version
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<string>} Component version
   */
  getComponentVersion(componentId) {
    const selector = TestConstants.SELECTORS.manualUpdate.versionCell(componentId)

    return cy.get(selector)
      .invoke('text')
      .then(text => text.trim())
  }

  /**
   * Verify component version
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version
   */
  verifyComponentVersion(componentId, expectedVersion) {
    const component = ComponentRegistry.getComponent(componentId)
    cy.log(`Verifying ${component.name} version: ${expectedVersion}`)

    this.getComponentVersion(componentId).then(actualVersion => {
      expect(actualVersion).to.equal(expectedVersion)
      cy.log(`✓ Version verified: ${actualVersion}`)
    })
  }

  /**
   * Get component last update timestamp
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<string>} Last update timestamp
   */
  getComponentTimestamp(componentId) {
    const selector = TestConstants.SELECTORS.manualUpdate.timestampCell(componentId)

    return cy.get(selector)
      .invoke('text')
      .then(text => text.trim())
  }

  /**
   * Verify all components are displayed
   */
  verifyAllComponentsDisplayed() {
    cy.log('Verifying all components are displayed')

    const allComponents = ComponentRegistry.getComponentIds()

    cy.get(TestConstants.SELECTORS.manualUpdate.componentTable)
      .should('be.visible')

    allComponents.forEach(componentId => {
      const component = ComponentRegistry.getComponent(componentId)
      cy.log(`Checking component: ${component.name}`)

      const rowSelector = TestConstants.SELECTORS.manualUpdate.componentRow(componentId)
      cy.get(rowSelector).should('exist')
    })

    cy.log(`✓ All ${allComponents.length} components displayed`)
  }

  /**
   * Verify update button state
   * @param {boolean} shouldBeEnabled - Expected state
   */
  verifyUpdateButtonState(shouldBeEnabled = true) {
    const button = cy.get(TestConstants.SELECTORS.manualUpdate.updateButton)

    if (shouldBeEnabled) {
      button.should('not.be.disabled')
      cy.log('✓ Update button is enabled')
    } else {
      button.should('be.disabled')
      cy.log('✓ Update button is disabled')
    }
  }

  /**
   * Verify rollback button state
   * @param {boolean} shouldBeEnabled - Expected state
   */
  verifyRollbackButtonState(shouldBeEnabled = true) {
    const button = cy.get(TestConstants.SELECTORS.manualUpdate.rollbackButton)

    if (shouldBeEnabled) {
      button.should('not.be.disabled')
      cy.log('✓ Rollback button is enabled')
    } else {
      button.should('be.disabled')
      cy.log('✓ Rollback button is disabled')
    }
  }

  /**
   * Get status message
   * @returns {Cypress.Chainable<string>} Status message text
   */
  getStatusMessage() {
    return cy.get(TestConstants.SELECTORS.manualUpdate.statusMessage)
      .invoke('text')
      .then(text => text.trim())
  }

  /**
   * Verify status message contains text
   * @param {string} expectedText - Expected text in status message
   */
  verifyStatusMessage(expectedText) {
    cy.log(`Verifying status message contains: "${expectedText}"`)

    cy.get(TestConstants.SELECTORS.manualUpdate.statusMessage, {
      timeout: TestConfig.timeouts.elementVisible
    })
      .should('be.visible')
      .and('contain', expectedText)

    cy.log('✓ Status message verified')
  }

  /**
   * Wait for update to redirect to progress page
   * @param {number} timeout - Custom timeout
   */
  waitForUpdateRedirect(timeout = TestConfig.timeouts.defaultCommand) {
    cy.log('Waiting for redirect to update progress page...')

    cy.url({ timeout })
      .should('include', TestConfig.urls.updateProgressPage)

    cy.log('✓ Redirected to progress page')
  }

  /**
   * Perform normal update for component
   * @param {string} componentId - Component ID
   */
  performNormalUpdate(componentId) {
    const component = ComponentRegistry.getComponent(componentId)
    cy.log(`Performing normal update for: ${component.name}`)

    this.selectComponent(componentId)
    this.clickUpdate()
    this.waitForUpdateRedirect()

    cy.log(`✓ Normal update initiated for ${component.name}`)
  }

  /**
   * Perform forced update for component
   * @param {string} componentId - Component ID
   */
  performForcedUpdate(componentId) {
    const component = ComponentRegistry.getComponent(componentId)
    cy.log(`Performing forced update for: ${component.name}`)

    this.selectComponent(componentId)
    this.clickUpdate()

    // Forced update may require confirmation
    cy.wait(1000) // Wait for confirmation dialog

    // Check if confirmation dialog appeared
    cy.get('body').then($body => {
      if ($body.find(TestConstants.SELECTORS.dialog.confirmButton).length > 0) {
        cy.log('Confirmation dialog appeared - accepting')
        this.handleConfirmation(true)
      }
    })

    this.waitForUpdateRedirect()

    cy.log(`✓ Forced update initiated for ${component.name}`)
  }

  /**
   * Perform rollback for component
   * @param {string} componentId - Component ID
   */
  performRollback(componentId) {
    const component = ComponentRegistry.getComponent(componentId)
    cy.log(`Performing rollback for: ${component.name}`)

    if (!component.canRollback) {
      throw new Error(`Component ${componentId} does not support rollback`)
    }

    this.selectComponent(componentId)
    this.clickRollback()

    // Rollback requires confirmation
    cy.wait(1000) // Wait for confirmation dialog
    this.handleConfirmation(true)

    this.waitForUpdateRedirect()

    cy.log(`✓ Rollback initiated for ${component.name}`)
  }

  /**
   * Cancel update/rollback operation
   */
  cancelOperation() {
    cy.log('Cancelling operation')

    cy.get('body').then($body => {
      if ($body.find(TestConstants.SELECTORS.dialog.cancelButton).length > 0) {
        this.handleConfirmation(false)
        cy.log('✓ Operation cancelled')
      } else {
        cy.log('No confirmation dialog found')
      }
    })
  }

  /**
   * Verify component row exists
   * @param {string} componentId - Component ID
   */
  verifyComponentRowExists(componentId) {
    const component = ComponentRegistry.getComponent(componentId)
    const rowSelector = TestConstants.SELECTORS.manualUpdate.componentRow(componentId)

    cy.get(rowSelector)
      .should('exist')
      .and('be.visible')

    cy.log(`✓ Component row exists: ${component.name}`)
  }

  /**
   * Get all displayed versions
   * @returns {Cypress.Chainable<object>} Object mapping componentId to version
   */
  getAllVersions() {
    const versions = {}
    const allComponents = ComponentRegistry.getComponentIds()

    return cy.wrap(Promise.all(
      allComponents.map(componentId =>
        this.getComponentVersion(componentId).then(version => {
          versions[componentId] = version
        })
      )
    )).then(() => {
      cy.log('All versions retrieved:', versions)
      return cy.wrap(versions)
    })
  }

  /**
   * Verify page shows "already up-to-date" message
   * @param {string} componentId - Component ID (optional)
   */
  verifyAlreadyUpToDate(componentId = null) {
    const message = componentId
      ? `${ComponentRegistry.getComponent(componentId).name} is already up-to-date`
      : 'already up-to-date'

    cy.log(`Verifying "already up-to-date" message`)
    this.verifyStatusMessage(message)
  }

  /**
   * Take screenshot of manual update page
   * @param {string} name - Screenshot name suffix
   */
  capturePageState(name = 'manual-update-page') {
    this.takeScreenshot(name)
  }
}

export default ManualUpdatePage
