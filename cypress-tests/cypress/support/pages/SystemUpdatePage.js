/**
 * System Update Page Object
 *
 * Page Object for IWSVA System Updates page.
 * Handles frame navigation, kernel version verification, and system information display.
 *
 * IWSVA uses legacy frameset architecture:
 * - tophead (navigation bar)
 * - left (menu)
 * - right (content)
 *
 * @class SystemUpdatePage
 * @extends BasePage
 */

import BasePage from './BasePage'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class SystemUpdatePage extends BasePage {
  constructor() {
    super()
    this.pageUrl = TestConfig.urls.systemUpdatePage || '/jsp/system_update.jsp'
  }

  /**
   * Get frame document by frame name
   * Helper method to access IWSVA's frameset architecture
   * @param {string} frameName - Frame name ('tophead', 'left', 'right')
   * @returns {Cypress.Chainable<Document>} Frame document
   */
  getFrameDoc(frameName) {
    cy.log(`Accessing frame: ${frameName}`)

    return cy.window().then((win) => {
      const frame = win.document.querySelector(`frame[name="${frameName}"], iframe[name="${frameName}"]`)

      if (!frame) {
        throw new Error(`Frame '${frameName}' not found`)
      }

      const frameDoc = frame.contentDocument || frame.contentWindow.document

      if (!frameDoc) {
        throw new Error(`Cannot access content of frame '${frameName}'`)
      }

      cy.log(`✓ Frame '${frameName}' accessed`)
      return cy.wrap(frameDoc)
    })
  }

  /**
   * Click element in frame by text content
   * @param {string} frameName - Frame name
   * @param {string} textContent - Text to search for
   * @param {string} tagName - HTML tag name (optional, defaults to '*')
   */
  clickInFrameByText(frameName, textContent, tagName = '*') {
    cy.log(`Clicking element with text "${textContent}" in ${frameName} frame`)

    return this.getFrameDoc(frameName).then((frameDoc) => {
      const elements = frameDoc.getElementsByTagName(tagName)
      let found = false

      for (let el of elements) {
        if (el.textContent.trim() === textContent) {
          el.click()
          found = true
          cy.log(`✓ Clicked: ${textContent}`)
          break
        }
      }

      if (!found) {
        throw new Error(`Element with text "${textContent}" not found in ${frameName} frame`)
      }
    })
  }

  /**
   * Click link in frame by partial text match
   * @param {string} frameName - Frame name
   * @param {string} searchText - Text to search for (case-insensitive)
   */
  clickLinkInFrame(frameName, searchText) {
    cy.log(`Clicking link containing "${searchText}" in ${frameName} frame`)

    return this.getFrameDoc(frameName).then((frameDoc) => {
      const links = frameDoc.getElementsByTagName('a')
      let found = false

      for (let link of links) {
        const text = link.textContent.trim().toLowerCase()
        const searchLower = searchText.toLowerCase()

        if (text.includes(searchLower)) {
          link.click()
          found = true
          cy.log(`✓ Clicked link: ${link.textContent.trim()}`)
          break
        }
      }

      if (!found) {
        throw new Error(`Link containing "${searchText}" not found in ${frameName} frame`)
      }
    })
  }

  /**
   * Navigate to System Updates page via menu
   * Uses IWSVA's frameset navigation structure
   * Optimized with smart waits instead of fixed waits
   */
  navigateToSystemUpdates() {
    cy.log('=== Navigating to System Updates ===')

    // Wait for left frame to be ready (smart wait)
    this.waitForFrameContent('left', 'Administration', 5000)

    // Click "Administration" in left frame
    this.clickInFrameByText('left', 'Administration')

    // Wait for menu to expand (smart wait)
    this.waitForFrameContent('left', 'System Update', 5000)

    // Click "System Updates" link in left frame
    this.clickLinkInFrame('left', 'system update')

    // Wait for right frame content to load (smart wait)
    this.waitForFrameContent('right', 'System', 10000)

    cy.log('✓ Navigated to System Updates page')
  }

  /**
   * Wait for frame content to contain expected text
   * Uses smart wait instead of fixed cy.wait()
   * This is much faster than fixed waits as it returns as soon as the condition is met
   * @param {string} frameName - Frame name ('left', 'right', 'tophead')
   * @param {string} expectedText - Text to wait for (optional)
   * @param {number} timeout - Maximum wait time in ms (default: 10000)
   * @returns {Cypress.Chainable} Frame body element
   */
  waitForFrameContent(frameName, expectedText = '', timeout = 10000) {
    cy.log(`Waiting for ${frameName} frame${expectedText ? `: "${expectedText}"` : ''}`)

    // Use cy.window() with should() callback for retry-ability
    // This re-queries the frame on each retry, handling frame reloads
    return cy.window({ timeout }).should((win) => {
      const frame = win.document.querySelector(`frame[name="${frameName}"], iframe[name="${frameName}"]`)
      expect(frame, `Frame '${frameName}' should exist`).to.exist

      const frameDoc = frame.contentDocument || frame.contentWindow.document
      expect(frameDoc, `Frame '${frameName}' document should be accessible`).to.exist
      expect(frameDoc.body, `Frame '${frameName}' body should exist`).to.exist

      const bodyText = frameDoc.body.textContent || ''
      expect(bodyText.trim().length, `Frame '${frameName}' should have content`).to.be.greaterThan(0)

      if (expectedText) {
        expect(bodyText, `Frame '${frameName}' should contain "${expectedText}"`)
          .to.include(expectedText)
      }
    }).then(() => {
      cy.log(`✓ ${frameName} frame ready`)
    })
  }

  /**
   * Get text content from right frame
   * @returns {Cypress.Chainable<string>} Frame text content
   */
  getRightFrameContent() {
    return this.getFrameDoc('right').then((frameDoc) => {
      const bodyText = frameDoc.body.textContent || ''
      return cy.wrap(bodyText.trim())
    })
  }

  /**
   * Get kernel version from System Updates page
   * Extracts kernel version from page content
   * @returns {Cypress.Chainable<string>} Kernel version
   */
  getKernelVersion() {
    cy.log('Getting kernel version from page')

    return this.getRightFrameContent().then((content) => {
      // Pattern to match kernel version format
      // Example: 5.14.0-427.24.1.el9_4.x86_64
      const kernelPattern = /(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)/

      const match = content.match(kernelPattern)

      if (match && match[1]) {
        const version = match[1]
        cy.log(`✓ Kernel version found: ${version}`)
        return cy.wrap(version)
      } else {
        cy.log('! Kernel version not found in page content')
        return cy.wrap(null)
      }
    })
  }

  /**
   * Verify kernel version is displayed on page
   * @param {string} expectedVersion - Expected kernel version
   */
  verifyKernelVersion(expectedVersion) {
    cy.log(`Verifying kernel version: ${expectedVersion}`)

    this.getRightFrameContent().then((content) => {
      expect(content, `Page should contain kernel version ${expectedVersion}`)
        .to.include(expectedVersion)

      cy.log(`✓ Kernel version verified: ${expectedVersion}`)
    })
  }

  /**
   * Verify page shows kernel information section
   */
  verifyKernelInfoDisplayed() {
    cy.log('Verifying kernel information is displayed')

    this.getRightFrameContent().then((content) => {
      const hasKernelInfo =
        content.toLowerCase().includes('kernel') ||
        content.toLowerCase().includes('system')

      expect(hasKernelInfo, 'Page should display kernel/system information').to.be.true

      cy.log('✓ Kernel information section found')
    })
  }

  /**
   * Verify frameset structure (3 frames)
   * Validates IWSVA's legacy frameset architecture
   */
  verifyFrameStructure() {
    cy.log('=== Verifying Frame Structure ===')

    cy.window().then((win) => {
      const frames = win.document.querySelectorAll('frame, iframe')

      // Should have exactly 3 frames
      expect(frames.length, 'Should have 3 frames').to.equal(3)
      cy.log(`✓ Frame count: ${frames.length}`)

      // Extract frame names
      const frameNames = Array.from(frames).map(f => f.getAttribute('name'))
      cy.log(`Frame names: ${frameNames.join(', ')}`)

      // Verify required frames exist
      const requiredFrames = TestConstants.SELECTORS.systemUpdate.requiredFrames
      requiredFrames.forEach(frameName => {
        expect(frameNames, `Should include frame: ${frameName}`)
          .to.include(frameName)
      })

      cy.log('✓ All required frames present')
    })
  }

  /**
   * Verify right frame has content loaded
   */
  verifyContentLoaded() {
    cy.log('Verifying content loaded in right frame')

    this.getFrameDoc('right').then((frameDoc) => {
      expect(frameDoc.body, 'Right frame body should exist').to.exist

      const bodyText = frameDoc.body.textContent || ''
      expect(bodyText.trim().length, 'Right frame should have content')
        .to.be.greaterThan(0)

      cy.log('✓ Content loaded in right frame')
    })
  }

  /**
   * Take screenshot of System Updates page
   * @param {string} name - Screenshot name suffix
   */
  capturePageState(name = 'system-updates-page') {
    cy.log(`Taking screenshot: ${name}`)
    this.takeScreenshot(name)
  }

  /**
   * Verify page title/heading
   * @param {string} expectedText - Expected title text
   */
  verifyPageTitle(expectedText = 'System Update') {
    cy.log(`Verifying page title contains: "${expectedText}"`)

    this.getRightFrameContent().then((content) => {
      expect(content, `Page should contain title: ${expectedText}`)
        .to.include(expectedText)

      cy.log('✓ Page title verified')
    })
  }

  /**
   * Get all text from specific frame
   * @param {string} frameName - Frame name
   * @returns {Cypress.Chainable<string>} Frame content
   */
  getFrameText(frameName) {
    return this.getFrameDoc(frameName).then((frameDoc) => {
      const text = frameDoc.body.textContent || ''
      cy.log(`${frameName} frame content length: ${text.length} chars`)
      return cy.wrap(text.trim())
    })
  }

  /**
   * Verify element exists in frame
   * @param {string} frameName - Frame name
   * @param {string} selector - CSS selector
   */
  verifyElementInFrame(frameName, selector) {
    cy.log(`Verifying element "${selector}" in ${frameName} frame`)

    this.getFrameDoc(frameName).then((frameDoc) => {
      const element = frameDoc.querySelector(selector)
      expect(element, `Element "${selector}" should exist in ${frameName}`)
        .to.exist

      cy.log(`✓ Element found in ${frameName}`)
    })
  }

  /**
   * Wait for frame to load
   * @param {string} frameName - Frame name
   * @param {number} timeout - Custom timeout
   */
  waitForFrame(frameName, timeout = TestConfig.timeouts.pageLoad) {
    cy.log(`Waiting for ${frameName} frame to load...`)

    return cy.window({ timeout }).then((win) => {
      const frame = win.document.querySelector(`frame[name="${frameName}"]`)

      if (!frame) {
        throw new Error(`Frame '${frameName}' not found`)
      }

      // Wait for frame document to be ready
      return cy.wrap(frame).then(() => {
        const frameDoc = frame.contentDocument || frame.contentWindow.document

        expect(frameDoc.readyState, `${frameName} should be loaded`)
          .to.equal('complete')

        cy.log(`✓ ${frameName} frame loaded`)
      })
    })
  }

  /**
   * Navigate and verify page is ready
   * Complete navigation workflow with verification
   */
  navigateAndVerify() {
    cy.log('=== Navigate and Verify System Updates Page ===')

    // Perform navigation
    this.navigateToSystemUpdates()

    // Verify page loaded
    this.verifyContentLoaded()

    // Verify frame structure
    this.verifyFrameStructure()

    cy.log('✓ Navigation and verification complete')
  }
}

export default SystemUpdatePage
