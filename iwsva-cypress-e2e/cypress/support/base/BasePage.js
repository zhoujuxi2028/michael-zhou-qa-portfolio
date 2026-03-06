/**
 * Base Page Object
 * Purpose: Base class for all page objects with common functionality
 */

import Logger from '../logging/Logger'
import ConfigManager from '../config/ConfigManager'
import TestConfig from '../../fixtures/test-config'

class BasePage {
  constructor(pageName) {
    this.pageName = pageName
    this.logger = new Logger(`Page:${pageName}`)
    this.baseUrl = ConfigManager.get('baseUrl')
    this.frames = TestConfig.frames
  }

  /**
   * Get frame document
   * @param {string} frameName - Frame name (tophead/left/right)
   */
  getFrameDoc(frameName) {
    return cy.window().then((win) => {
      const frame = win.document.querySelector(`frame[name="${frameName}"], iframe[name="${frameName}"]`)
      expect(frame, `${frameName} frame should exist`).to.exist
      const frameDoc = frame.contentDocument || frame.contentWindow.document
      expect(frameDoc, `${frameName} frame content should be accessible`).to.exist
      return frameDoc
    })
  }

  /**
   * Wait for frame to load
   */
  waitForFrame(frameName, timeout = TestConfig.timeouts.frameLoad) {
    cy.wait(timeout)
    this.logger.debug(`Waited for ${frameName} frame to load`)
  }

  /**
   * Visit a URL
   */
  visit(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`
    this.logger.info(`Visiting ${fullUrl}`)
    cy.visit(fullUrl, { failOnStatusCode: false, ...options })
  }
}

export default BasePage
