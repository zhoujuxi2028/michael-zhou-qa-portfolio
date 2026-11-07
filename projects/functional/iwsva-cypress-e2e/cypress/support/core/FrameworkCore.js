/**
 * Enterprise Framework Core
 * Purpose: Framework initialization and lifecycle management
 */

import ConfigManager from '../config/ConfigManager'
import Logger from '../logging/Logger'
import TestContext from './TestContext'

class FrameworkCore {
  static logger = null
  static initialized = false

  static initialize(options = {}) {
    if (this.initialized) {
      return
    }

    // Initialize ConfigManager
    ConfigManager.initialize()

    // Create framework logger
    this.logger = new Logger('FrameworkCore')
    this.logger.info('Initializing Enterprise Test Framework')

    // Validate configuration
    try {
      ConfigManager.validate()
      this.logger.info('Configuration validated successfully')
    } catch (error) {
      this.logger.error('Configuration validation failed', error)
      throw error
    }

    this.initialized = true
    this.logger.info('Framework initialization complete', {
      environment: ConfigManager.getEnvironment(),
      baseUrl: ConfigManager.get('baseUrl')
    })
  }

  static beforeTestSuite() {
    this.logger?.info('Test suite started')
  }

  static afterTestSuite() {
    this.logger?.info('Test suite completed')
  }
}

export default FrameworkCore
