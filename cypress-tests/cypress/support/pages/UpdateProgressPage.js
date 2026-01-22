/**
 * Update Progress Page Object
 *
 * Page Object for IWSVA Update Progress page (/jsp/AU_Update.jsp).
 * Handles monitoring update progress, completion, and error handling.
 *
 * @class UpdateProgressPage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'
import ComponentRegistry from '../../fixtures/ComponentRegistry'

class UpdateProgressPage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.updateProgressPage
  }

  /**
   * Wait for page to load
   */
  waitForPageLoad() {
    cy.log('Waiting for Update Progress page to load')

    cy.url({ timeout: TestConfig.timeouts.pageLoad })
      .should('include', this.pageUrl)

    cy.get(TestConstants.SELECTORS.updateProgress.progressBar, {
      timeout: TestConfig.timeouts.pageLoad
    }).should('exist')

    cy.log('✓ Update Progress page loaded')
  }

  /**
   * Get current progress percentage
   * @returns {Cypress.Chainable<number>} Progress percentage (0-100)
   */
  getProgressPercentage() {
    return cy.get(TestConstants.SELECTORS.updateProgress.percentage)
      .invoke('text')
      .then(text => {
        const percent = parseInt(text.replace('%', ''))
        return percent
      })
  }

  /**
   * Get status text
   * @returns {Cypress.Chainable<string>} Current status text
   */
  getStatusText() {
    return cy.get(TestConstants.SELECTORS.updateProgress.statusText)
      .invoke('text')
      .then(text => text.trim())
  }

  /**
   * Wait for update to complete
   * @param {string} componentId - Component ID being updated
   * @param {number} timeout - Custom timeout (default from component config)
   */
  waitForUpdateComplete(componentId, timeout = null) {
    const component = ComponentRegistry.getComponent(componentId)

    const updateTimeout = timeout || component.updateTimeout || TestConfig.timeouts.patternUpdate

    cy.log(`Waiting for ${component.name} update to complete (max ${updateTimeout}ms)`)

    // Poll progress until complete
    const startTime = Date.now()

    const checkProgress = () => {
      const elapsed = Date.now() - startTime

      if (elapsed > updateTimeout) {
        throw new Error(`Update timeout exceeded: ${updateTimeout}ms`)
      }

      this.getProgressPercentage().then(percent => {
        cy.log(`Progress: ${percent}%`)

        if (percent < 100) {
          cy.wait(2000) // Wait 2 seconds before next check
          checkProgress()
        } else {
          cy.log('✓ Update progress reached 100%')
        }
      })
    }

    checkProgress()

    // Verify completion message
    this.verifyUpdateComplete()
  }

  /**
   * Wait for rollback to complete
   * @param {string} componentId - Component ID being rolled back
   */
  waitForRollbackComplete(componentId) {
    const component = ComponentRegistry.getComponent(componentId)
    const timeout = TestConfig.timeouts.rollback

    cy.log(`Waiting for ${component.name} rollback to complete (max ${timeout}ms)`)

    // Similar to update, but typically faster
    this.waitForUpdateComplete(componentId, timeout)

    cy.log('✓ Rollback complete')
  }

  /**
   * Verify update completed successfully
   */
  verifyUpdateComplete() {
    cy.log('Verifying update completed successfully')

    cy.get(TestConstants.SELECTORS.updateProgress.completionMessage, {
      timeout: TestConfig.timeouts.elementVisible
    })
      .should('be.visible')
      .and('contain', TestConstants.MESSAGES.success.updateComplete)

    cy.log('✓ Update completion message verified')
  }

  /**
   * Verify update failed
   */
  verifyUpdateFailed() {
    cy.log('Verifying update failed')

    cy.get(TestConstants.SELECTORS.updateProgress.errorMessage, {
      timeout: TestConfig.timeouts.elementVisible
    })
      .should('be.visible')

    cy.log('✓ Update failure detected')
  }

  /**
   * Get error message
   * @returns {Cypress.Chainable<string>} Error message text
   */
  getErrorMessage() {
    return cy.get(TestConstants.SELECTORS.updateProgress.errorMessage)
      .invoke('text')
      .then(text => text.trim())
  }

  /**
   * Verify specific error message
   * @param {string} expectedError - Expected error message
   */
  verifyErrorMessage(expectedError) {
    cy.log(`Verifying error message contains: "${expectedError}"`)

    this.getErrorMessage().then(actualError => {
      expect(actualError).to.include(expectedError)
      cy.log(`✓ Error message verified: ${actualError}`)
    })
  }

  /**
   * Click Back button to return to manual update page
   */
  clickBack() {
    cy.log('Clicking Back button')

    cy.get(TestConstants.SELECTORS.updateProgress.backButton)
      .should('be.visible')
      .click()

    // Wait for navigation back
    cy.url({ timeout: TestConfig.timeouts.pageLoad })
      .should('include', TestConfig.urls.manualUpdatePage)

    cy.log('✓ Returned to Manual Update page')
  }

  /**
   * Monitor update progress with periodic logging
   * @param {string} componentId - Component ID
   * @param {number} logInterval - Interval for progress logging (ms)
   */
  monitorProgress(componentId, logInterval = 5000) {
    const component = ComponentRegistry.getComponent(componentId)
    cy.log(`Monitoring ${component.name} update progress...`)

    const startTime = Date.now()
    let lastLogTime = startTime

    const monitor = () => {
      const currentTime = Date.now()

      if (currentTime - lastLogTime >= logInterval) {
        this.getProgressPercentage().then(percent => {
          const elapsed = Math.floor((currentTime - startTime) / 1000)
          cy.log(`[${elapsed}s] Progress: ${percent}%`)
        })

        this.getStatusText().then(status => {
          cy.log(`Status: ${status}`)
        })

        lastLogTime = currentTime
      }

      // Check if complete
      this.getProgressPercentage().then(percent => {
        if (percent < 100) {
          cy.wait(1000)
          monitor()
        } else {
          const totalTime = Math.floor((Date.now() - startTime) / 1000)
          cy.log(`✓ Update complete in ${totalTime} seconds`)
        }
      })
    }

    monitor()
  }

  /**
   * Verify progress bar is visible and animating
   */
  verifyProgressBarActive() {
    cy.log('Verifying progress bar is active')

    cy.get(TestConstants.SELECTORS.updateProgress.progressBar)
      .should('be.visible')

    // Check progress is increasing
    let initialProgress

    this.getProgressPercentage().then(percent1 => {
      initialProgress = percent1
      cy.log(`Initial progress: ${percent1}%`)
    })

    cy.wait(3000) // Wait 3 seconds

    this.getProgressPercentage().then(percent2 => {
      cy.log(`Progress after 3s: ${percent2}%`)

      if (percent2 < 100) {
        expect(percent2).to.be.at.least(initialProgress)
        cy.log('✓ Progress is increasing')
      } else {
        cy.log('Update already at 100%')
      }
    })
  }

  /**
   * Verify status text contains expected text
   * @param {string} expectedStatus - Expected status text
   */
  verifyStatusText(expectedStatus) {
    cy.log(`Verifying status contains: "${expectedStatus}"`)

    this.getStatusText().then(actualStatus => {
      expect(actualStatus).to.include(expectedStatus)
      cy.log(`✓ Status verified: ${actualStatus}`)
    })
  }

  /**
   * Wait for specific status
   * @param {string} expectedStatus - Expected status
   * @param {number} timeout - Custom timeout
   */
  waitForStatus(expectedStatus, timeout = TestConfig.timeouts.defaultCommand) {
    cy.log(`Waiting for status: "${expectedStatus}"`)

    const startTime = Date.now()

    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for status: ${expectedStatus}`)
      }

      this.getStatusText().then(actualStatus => {
        if (actualStatus.includes(expectedStatus)) {
          cy.log(`✓ Status reached: ${actualStatus}`)
        } else {
          cy.wait(1000)
          checkStatus()
        }
      })
    }

    checkStatus()
  }

  /**
   * Capture screenshot of progress page
   * @param {string} suffix - Screenshot name suffix
   */
  captureProgress(suffix = 'progress') {
    this.getProgressPercentage().then(percent => {
      this.takeScreenshot(`update-progress-${percent}pct-${suffix}`)
    })
  }

  /**
   * Verify update did not start (error before update begins)
   */
  verifyUpdateNotStarted() {
    cy.log('Verifying update did not start')

    this.getProgressPercentage().then(percent => {
      expect(percent).to.equal(0)
      cy.log('✓ Progress is 0% - update not started')
    })

    this.verifyUpdateFailed()
  }

  /**
   * Get update duration
   * @returns {Cypress.Chainable<number>} Update duration in seconds
   */
  getUpdateDuration() {
    const startTime = Date.now()

    return cy.wrap(null).then(() => {
      this.waitForUpdateComplete().then(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000)
        cy.log(`Update duration: ${duration} seconds`)
        return duration
      })
    })
  }

  /**
   * Complete update and return to main page
   * @param {string} componentId - Component ID
   */
  completeAndReturn(componentId) {
    cy.log('Completing update and returning to main page')

    this.waitForUpdateComplete(componentId)
    this.verifyUpdateComplete()
    this.clickBack()

    cy.log('✓ Update complete, returned to main page')
  }
}

export default UpdateProgressPage
