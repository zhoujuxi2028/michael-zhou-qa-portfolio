/**
 * Schedule Page Object
 *
 * Page Object for IWSVA Schedule Configuration page (/jsp/update.jsp).
 * Handles automated update scheduling, frequency, and timing configuration.
 *
 * @class SchedulePage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class SchedulePage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.schedulePage
  }

  /**
   * Navigate to Schedule page
   */
  navigate() {
    cy.log('Navigating to Schedule Configuration page')
    this.visit(this.pageUrl)
    this.waitForPageLoad()
    this.verifyPageLoaded()
  }

  /**
   * Verify Schedule page is loaded
   */
  verifyPageLoaded() {
    cy.log('Verifying Schedule page loaded')

    cy.get(TestConstants.SELECTORS.schedule.enableCheckbox, {
      timeout: TestConfig.timeouts.pageLoad
    }).should('exist')

    cy.get(TestConstants.SELECTORS.schedule.saveButton)
      .should('be.visible')

    cy.log('✓ Schedule page loaded successfully')
  }

  /**
   * Enable automatic updates
   * @param {boolean} enable - True to enable, false to disable
   */
  enableAutoUpdate(enable = true) {
    cy.log(`${enable ? 'Enabling' : 'Disabling'} automatic updates`)

    const checkbox = cy.get(TestConstants.SELECTORS.schedule.enableCheckbox)

    if (enable) {
      checkbox.check({ force: true }).should('be.checked')
      cy.log('✓ Automatic updates enabled')
    } else {
      checkbox.uncheck({ force: true }).should('not.be.checked')
      cy.log('✓ Automatic updates disabled')
    }
  }

  /**
   * Verify auto-update is enabled
   * @returns {Cypress.Chainable<boolean>} True if enabled
   */
  isAutoUpdateEnabled() {
    return cy.get(TestConstants.SELECTORS.schedule.enableCheckbox)
      .then($checkbox => $checkbox.is(':checked'))
  }

  /**
   * Set update frequency
   * @param {string} frequency - Frequency value ('hourly', 'daily', 'weekly')
   */
  setFrequency(frequency) {
    cy.log(`Setting update frequency to: ${frequency}`)

    cy.get(TestConstants.SELECTORS.schedule.frequencySelect)
      .should('be.visible')
      .select(frequency)

    cy.get(TestConstants.SELECTORS.schedule.frequencySelect)
      .should('have.value', frequency)

    cy.log(`✓ Frequency set to: ${frequency}`)
  }

  /**
   * Get current frequency setting
   * @returns {Cypress.Chainable<string>} Current frequency
   */
  getFrequency() {
    return cy.get(TestConstants.SELECTORS.schedule.frequencySelect)
      .invoke('val')
  }

  /**
   * Set update time
   * @param {string} time - Time in HH:mm format (e.g., '02:00')
   */
  setTime(time) {
    cy.log(`Setting update time to: ${time}`)

    cy.get(TestConstants.SELECTORS.schedule.timeInput)
      .should('be.visible')
      .clear()
      .type(time)

    cy.log(`✓ Time set to: ${time}`)
  }

  /**
   * Get current time setting
   * @returns {Cypress.Chainable<string>} Current time
   */
  getTime() {
    return cy.get(TestConstants.SELECTORS.schedule.timeInput)
      .invoke('val')
  }

  /**
   * Click Save button
   */
  clickSave() {
    cy.log('Clicking Save button')

    cy.get(TestConstants.SELECTORS.schedule.saveButton)
      .should('be.visible')
      .should('not.be.disabled')
      .click()

    // Wait for save to complete
    this.waitForLoadingComplete()

    cy.log('✓ Save button clicked')
  }

  /**
   * Save schedule configuration
   */
  saveConfiguration() {
    cy.log('Saving schedule configuration')

    this.clickSave()
    this.verifySuccessMessage()

    cy.log('✓ Configuration saved successfully')
  }

  /**
   * Configure complete schedule settings
   * @param {object} config - Schedule configuration
   * @param {boolean} config.enabled - Enable auto-update
   * @param {string} config.frequency - Update frequency
   * @param {string} config.time - Update time (HH:mm)
   */
  configureSchedule(config) {
    cy.log('Configuring schedule settings', config)

    // Enable/disable auto-update
    this.enableAutoUpdate(config.enabled)

    // Only set frequency and time if auto-update is enabled
    if (config.enabled) {
      if (config.frequency) {
        this.setFrequency(config.frequency)
      }

      if (config.time) {
        this.setTime(config.time)
      }
    }

    // Save configuration
    this.saveConfiguration()

    cy.log('✓ Schedule configuration complete')
  }

  /**
   * Verify schedule configuration
   * @param {object} expectedConfig - Expected configuration
   */
  verifyConfiguration(expectedConfig) {
    cy.log('Verifying schedule configuration')

    // Verify enabled state
    this.isAutoUpdateEnabled().then(isEnabled => {
      expect(isEnabled).to.equal(expectedConfig.enabled)
      cy.log(`✓ Auto-update enabled: ${isEnabled}`)
    })

    if (expectedConfig.enabled) {
      // Verify frequency
      if (expectedConfig.frequency) {
        this.getFrequency().then(frequency => {
          expect(frequency).to.equal(expectedConfig.frequency)
          cy.log(`✓ Frequency: ${frequency}`)
        })
      }

      // Verify time
      if (expectedConfig.time) {
        this.getTime().then(time => {
          expect(time).to.equal(expectedConfig.time)
          cy.log(`✓ Time: ${time}`)
        })
      }
    }

    cy.log('✓ Configuration verified')
  }

  /**
   * Disable automatic updates
   */
  disableAutoUpdate() {
    cy.log('Disabling automatic updates')

    this.enableAutoUpdate(false)
    this.saveConfiguration()

    cy.log('✓ Automatic updates disabled and saved')
  }

  /**
   * Enable hourly updates
   */
  enableHourlyUpdate() {
    cy.log('Enabling hourly automatic updates')

    this.configureSchedule({
      enabled: true,
      frequency: 'hourly',
    })

    cy.log('✓ Hourly updates enabled')
  }

  /**
   * Enable daily updates at specific time
   * @param {string} time - Update time (HH:mm)
   */
  enableDailyUpdate(time = '02:00') {
    cy.log(`Enabling daily automatic updates at ${time}`)

    this.configureSchedule({
      enabled: true,
      frequency: 'daily',
      time: time,
    })

    cy.log(`✓ Daily updates enabled at ${time}`)
  }

  /**
   * Enable weekly updates
   * @param {string} time - Update time (HH:mm)
   */
  enableWeeklyUpdate(time = '02:00') {
    cy.log(`Enabling weekly automatic updates at ${time}`)

    this.configureSchedule({
      enabled: true,
      frequency: 'weekly',
      time: time,
    })

    cy.log(`✓ Weekly updates enabled at ${time}`)
  }

  /**
   * Verify frequency options available
   * @param {string[]} expectedOptions - Expected frequency options
   */
  verifyFrequencyOptions(expectedOptions) {
    cy.log('Verifying frequency options')

    cy.get(TestConstants.SELECTORS.schedule.frequencySelect)
      .find('option')
      .then($options => {
        const actualOptions = [...$options].map(opt => opt.value)

        expectedOptions.forEach(expected => {
          expect(actualOptions).to.include(expected)
          cy.log(`✓ Option available: ${expected}`)
        })
      })

    cy.log('✓ All frequency options verified')
  }

  /**
   * Verify time input format
   */
  verifyTimeInputFormat() {
    cy.log('Verifying time input format')

    cy.get(TestConstants.SELECTORS.schedule.timeInput)
      .should('have.attr', 'type', 'time')
      .or('have.attr', 'pattern')

    cy.log('✓ Time input format verified')
  }

  /**
   * Reset to default settings
   */
  resetToDefaults() {
    cy.log('Resetting schedule to default settings')

    this.configureSchedule({
      enabled: true,
      frequency: 'daily',
      time: '02:00',
    })

    cy.log('✓ Schedule reset to defaults')
  }

  /**
   * Verify save button state
   * @param {boolean} shouldBeEnabled - Expected state
   */
  verifySaveButtonState(shouldBeEnabled = true) {
    const button = cy.get(TestConstants.SELECTORS.schedule.saveButton)

    if (shouldBeEnabled) {
      button.should('not.be.disabled')
      cy.log('✓ Save button is enabled')
    } else {
      button.should('be.disabled')
      cy.log('✓ Save button is disabled')
    }
  }

  /**
   * Verify page displays current schedule
   */
  verifyCurrentScheduleDisplayed() {
    cy.log('Verifying current schedule is displayed')

    // Check that checkbox state is determinable
    cy.get(TestConstants.SELECTORS.schedule.enableCheckbox)
      .should('exist')

    // Check that frequency is selected
    this.getFrequency().then(frequency => {
      expect(frequency).to.not.be.empty
      cy.log(`Current frequency: ${frequency}`)
    })

    cy.log('✓ Current schedule displayed')
  }

  /**
   * Get complete schedule configuration
   * @returns {Cypress.Chainable<object>} Schedule configuration
   */
  getCurrentConfiguration() {
    cy.log('Getting current schedule configuration')

    return cy.wrap(null).then(() => {
      const config = {}

      return this.isAutoUpdateEnabled().then(enabled => {
        config.enabled = enabled

        if (enabled) {
          return this.getFrequency().then(frequency => {
            config.frequency = frequency

            return this.getTime().then(time => {
              config.time = time
              cy.log('Current configuration:', config)
              return cy.wrap(config)
            })
          })
        } else {
          cy.log('Current configuration:', config)
          return cy.wrap(config)
        }
      })
    })
  }

  /**
   * Verify configuration was saved
   * @param {object} expectedConfig - Expected configuration
   */
  verifyConfigurationSaved(expectedConfig) {
    cy.log('Verifying configuration was saved')

    // Reload page
    this.reload()
    this.waitForPageLoad()

    // Verify configuration persists
    this.verifyConfiguration(expectedConfig)

    cy.log('✓ Configuration saved and persisted')
  }

  /**
   * Test invalid time input
   * @param {string} invalidTime - Invalid time value
   */
  testInvalidTime(invalidTime) {
    cy.log(`Testing invalid time input: ${invalidTime}`)

    cy.get(TestConstants.SELECTORS.schedule.timeInput)
      .clear()
      .type(invalidTime)

    this.clickSave()

    // Should see error or validation message
    cy.get('body').then($body => {
      const hasError =
        $body.find(TestConstants.SELECTORS.common.errorMessage).length > 0 ||
        $body.find(':invalid').length > 0

      expect(hasError).to.be.true
      cy.log('✓ Invalid time rejected')
    })
  }

  /**
   * Verify schedule status message
   * @param {string} expectedMessage - Expected status message
   */
  verifyScheduleStatus(expectedMessage) {
    cy.log(`Verifying schedule status: "${expectedMessage}"`)

    cy.get(TestConstants.SELECTORS.manualUpdate.statusMessage, {
      timeout: TestConfig.timeouts.elementVisible
    })
      .should('be.visible')
      .and('contain', expectedMessage)

    cy.log('✓ Schedule status verified')
  }

  /**
   * Take screenshot of schedule page
   * @param {string} name - Screenshot name suffix
   */
  capturePageState(name = 'schedule-page') {
    this.takeScreenshot(name)
  }
}

export default SchedulePage
