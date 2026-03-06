/**
 * Enterprise Framework - Structured Logger
 *
 * Purpose: Provides structured logging with multiple levels (INFO/WARN/ERROR/DEBUG)
 * Features:
 * - Contextual logging with test name
 * - Timestamp inclusion
 * - Log level filtering
 * - Integration with Cypress task for log persistence
 *
 * Usage:
 * const logger = new Logger('TC-UPDATE-001')
 * logger.info('Test started', { version: '18.500.00' })
 * logger.error('Update failed', error, { component: 'PTN' })
 */

class Logger {
  /**
   * @param {string} context - Test name or component name for log context
   * @param {object} options - Logger configuration options
   */
  constructor(context, options = {}) {
    this.context = context
    this.level = options.level || Cypress.env('LOG_LEVEL') || 'INFO'
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    }
  }

  /**
   * Log information message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    this._log('INFO', message, metadata)
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    this._log('WARN', message, metadata)
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error} error - Error object
   * @param {object} metadata - Additional metadata
   */
  error(message, error, metadata = {}) {
    const errorMetadata = {
      ...metadata,
      error: {
        message: error?.message,
        stack: error?.stack
      }
    }
    this._log('ERROR', message, errorMetadata)
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    this._log('DEBUG', message, metadata)
  }

  /**
   * Internal logging method
   * @private
   */
  _log(level, message, metadata) {
    // Check if log level meets threshold
    if (this.levels[level] < this.levels[this.level]) {
      return
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      metadata
    }

    // Log to Cypress console with emoji indicators
    const emoji = this._getEmoji(level)
    const formattedMessage = `${emoji} [${level}] [${this.context}] ${message}`

    // Use appropriate Cypress logging method
    switch (level) {
      case 'ERROR':
        cy.log(`❌ ${formattedMessage}`)
        break
      case 'WARN':
        cy.log(`⚠️ ${formattedMessage}`)
        break
      case 'DEBUG':
        cy.log(`🔍 ${formattedMessage}`)
        break
      default:
        cy.log(`ℹ️ ${formattedMessage}`)
    }

    // Optional: Persist to file via Cypress task (if task is available)
    if (Cypress.config('isInteractive') === false) {
      // Only persist in headless mode (CI/CD)
      try {
        cy.task('logToFile', logEntry, { log: false })
      } catch (e) {
        // Task not available, skip persistence
      }
    }
  }

  /**
   * Get emoji for log level
   * @private
   */
  _getEmoji(level) {
    const emojis = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌'
    }
    return emojis[level] || 'ℹ️'
  }

  /**
   * Create a child logger with additional context
   * @param {string} subContext - Additional context to append
   * @returns {Logger} New logger instance
   */
  child(subContext) {
    return new Logger(`${this.context}:${subContext}`, {
      level: this.level
    })
  }
}

export default Logger
