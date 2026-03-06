/**
 * Component Factory
 *
 * Factory class for creating component-specific handlers and configurations.
 * Uses Factory Pattern to dynamically create handlers based on component type.
 *
 * @class ComponentFactory
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConstants from '../../fixtures/test-constants'
import TestConfig from '../../fixtures/test-config'

class ComponentFactory {
  /**
   * Create component handler
   * Returns a handler object with component-specific methods and properties
   * @param {string} componentId - Component ID
   * @returns {object} Component handler
   */
  static createHandler(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    if (!component) {
      throw new Error(`Component not found: ${componentId}`)
    }

    // Base handler properties
    const handler = {
      id: component.id,
      name: component.name,
      category: component.category,
      iniKey: component.iniKey,
      iniTimeKey: component.iniTimeKey,
      canRollback: component.canRollback,
      requiresRestart: component.requiresRestart,
      updateTimeout: component.updateTimeout,
      priority: component.priority,

      /**
       * Get update timeout for this component
       * @returns {number} Timeout in milliseconds
       */
      getUpdateTimeout() {
        return this.updateTimeout || TestConfig.timeouts.patternUpdate
      },

      /**
       * Get rollback timeout for this component
       * @returns {number} Timeout in milliseconds
       */
      getRollbackTimeout() {
        return TestConfig.timeouts.rollback
      },

      /**
       * Check if component can be rolled back
       * @returns {boolean} True if rollback supported
       */
      isRollbackSupported() {
        return this.canRollback === true
      },

      /**
       * Check if component requires service restart
       * @returns {boolean} True if restart required
       */
      requiresServiceRestart() {
        return this.requiresRestart === true
      },

      /**
       * Get component INI keys
       * @returns {object} INI keys {version, time}
       */
      getINIKeys() {
        return {
          version: this.iniKey,
          time: this.iniTimeKey
        }
      },

      /**
       * Get expected INI section
       * @returns {string} INI section name
       */
      getINISection() {
        return TestConstants.INI_KEYS.section
      },

      /**
       * Check if component is a pattern
       * @returns {boolean} True if pattern
       */
      isPattern() {
        return this.category === TestConstants.CATEGORIES.PATTERN
      },

      /**
       * Check if component is an engine
       * @returns {boolean} True if engine
       */
      isEngine() {
        return this.category === TestConstants.CATEGORIES.ENGINE
      },

      /**
       * Get component priority
       * @returns {string} Priority (P0, P1, P2)
       */
      getPriority() {
        return this.priority || TestConstants.PRIORITIES.P2
      },

      /**
       * Check if component is critical (P0)
       * @returns {boolean} True if critical
       */
      isCritical() {
        return this.priority === TestConstants.PRIORITIES.P0
      },

      /**
       * Get component display name
       * @returns {string} Display name
       */
      getDisplayName() {
        return this.name
      },

      /**
       * Get component identifier
       * @returns {string} Component ID
       */
      getIdentifier() {
        return this.id
      },

      /**
       * Get selector for component radio button
       * @returns {string} CSS selector
       */
      getRadioSelector() {
        return TestConstants.SELECTORS.manualUpdate.componentRadio(this.id)
      },

      /**
       * Get selector for component row
       * @returns {string} CSS selector
       */
      getRowSelector() {
        return TestConstants.SELECTORS.manualUpdate.componentRow(this.id)
      },

      /**
       * Get selector for version cell
       * @returns {string} CSS selector
       */
      getVersionSelector() {
        return TestConstants.SELECTORS.manualUpdate.versionCell(this.id)
      },

      /**
       * Get selector for timestamp cell
       * @returns {string} CSS selector
       */
      getTimestampSelector() {
        return TestConstants.SELECTORS.manualUpdate.timestampCell(this.id)
      },

      /**
       * Create test scenario configuration
       * @param {string} mode - Update mode ('normal', 'forced', 'rollback')
       * @param {object} overrides - Configuration overrides
       * @returns {object} Test scenario configuration
       */
      createScenario(mode, overrides = {}) {
        const scenario = {
          componentId: this.id,
          componentName: this.name,
          mode: mode,
          timeout: this.getUpdateTimeout(),
          requiresRestart: this.requiresRestart,
          canRollback: this.canRollback,
          priority: this.priority,
          ...overrides
        }

        return scenario
      },

      /**
       * Create verification configuration
       * @param {string} expectedVersion - Expected version after update
       * @returns {object} Verification configuration
       */
      createVerificationConfig(expectedVersion) {
        return {
          componentId: this.id,
          expectedVersion: expectedVersion,
          iniKey: this.iniKey,
          iniTimeKey: this.iniTimeKey,
          requiresRestart: this.requiresRestart,
          canRollback: this.canRollback
        }
      },

      /**
       * Log component information
       */
      logInfo() {
        cy.log(`Component: ${this.name} (${this.id})`)
        cy.log(`Category: ${this.category}`)
        cy.log(`Priority: ${this.priority}`)
        cy.log(`Can Rollback: ${this.canRollback}`)
        cy.log(`Requires Restart: ${this.requiresRestart}`)
        cy.log(`Update Timeout: ${this.getUpdateTimeout()}ms`)
      }
    }

    // Add category-specific methods
    if (handler.isPattern()) {
      Object.assign(handler, ComponentFactory.createPatternMethods(component))
    } else if (handler.isEngine()) {
      Object.assign(handler, ComponentFactory.createEngineMethods(component))
    }

    return handler
  }

  /**
   * Create pattern-specific methods
   * @param {object} component - Component metadata
   * @returns {object} Pattern-specific methods
   */
  static createPatternMethods(component) {
    return {
      /**
       * Get pattern file pattern
       * @returns {RegExp} File pattern regex
       */
      getFilePattern() {
        return TestConstants.FILE_PATTERNS.patternFile
      },

      /**
       * Get expected file count
       * @returns {number} Expected number of pattern files
       */
      getExpectedFileCount() {
        // Patterns typically have 1-3 main files
        return 1
      },

      /**
       * Verify pattern file exists
       * @returns {Cypress.Chainable<boolean>} True if files exist
       */
      verifyFilesExist() {
        return cy.task('verifyPatternFiles', {
          componentId: this.id
        })
      }
    }
  }

  /**
   * Create engine-specific methods
   * @param {object} component - Component metadata
   * @returns {object} Engine-specific methods
   */
  static createEngineMethods(component) {
    return {
      /**
       * Get engine file pattern
       * @returns {RegExp} File pattern regex
       */
      getFilePattern() {
        return TestConstants.FILE_PATTERNS.engineFile
      },

      /**
       * Verify engine service is running
       * @returns {Cypress.Chainable<boolean>} True if service running
       */
      verifyServiceRunning() {
        return cy.task('checkServiceStatus', {
          componentId: this.id
        })
      },

      /**
       * Get restart command
       * @returns {string} Service restart command
       */
      getRestartCommand() {
        return `service ${this.id.toLowerCase()} restart`
      },

      /**
       * Verify engine DLL exists
       * @returns {Cypress.Chainable<boolean>} True if DLL exists
       */
      verifyDLLExists() {
        return cy.task('verifyEngineFiles', {
          componentId: this.id
        })
      }
    }
  }

  /**
   * Create handlers for multiple components
   * @param {string[]} componentIds - Array of component IDs
   * @returns {object[]} Array of component handlers
   */
  static createHandlers(componentIds) {
    return componentIds.map(componentId => {
      return ComponentFactory.createHandler(componentId)
    })
  }

  /**
   * Create handlers for all patterns
   * @returns {object[]} Array of pattern handlers
   */
  static createAllPatternHandlers() {
    const patterns = ComponentRegistry.getPatterns()
    return patterns.map(component => {
      return ComponentFactory.createHandler(component.id)
    })
  }

  /**
   * Create handlers for all engines
   * @returns {object[]} Array of engine handlers
   */
  static createAllEngineHandlers() {
    const engines = ComponentRegistry.getEngines()
    return engines.map(component => {
      return ComponentFactory.createHandler(component.id)
    })
  }

  /**
   * Create handlers for all components
   * @returns {object[]} Array of all handlers
   */
  static createAllHandlers() {
    const componentIds = ComponentRegistry.getComponentIds()
    return ComponentFactory.createHandlers(componentIds)
  }

  /**
   * Create handlers by priority
   * @param {string} priority - Priority level ('P0', 'P1', 'P2')
   * @returns {object[]} Array of handlers with specified priority
   */
  static createHandlersByPriority(priority) {
    const components = ComponentRegistry.getByPriority(priority)
    return components.map(component => {
      return ComponentFactory.createHandler(component.id)
    })
  }

  /**
   * Create handlers for rollback-supported components
   * @returns {object[]} Array of handlers that support rollback
   */
  static createRollbackHandlers() {
    const components = ComponentRegistry.getRollbackSupported()
    return components.map(component => {
      return ComponentFactory.createHandler(component.id)
    })
  }

  /**
   * Create handlers for restart-required components
   * @returns {object[]} Array of handlers that require restart
   */
  static createRestartRequiredHandlers() {
    const componentIds = TestConstants.COMPONENT_IDS.REQUIRES_RESTART
    return ComponentFactory.createHandlers(componentIds)
  }

  /**
   * Create handler from scenario
   * @param {object} scenario - Test scenario
   * @returns {object} Component handler
   */
  static createHandlerFromScenario(scenario) {
    if (!scenario.componentId) {
      throw new Error('Scenario must have componentId')
    }

    const handler = ComponentFactory.createHandler(scenario.componentId)

    // Enhance handler with scenario-specific data
    handler.scenario = scenario

    return handler
  }

  /**
   * Get handler for critical components (P0)
   * @returns {object[]} Array of critical component handlers
   */
  static getCriticalHandlers() {
    return ComponentFactory.createHandlersByPriority(TestConstants.PRIORITIES.P0)
  }

  /**
   * Validate component exists
   * @param {string} componentId - Component ID
   * @returns {boolean} True if component exists
   */
  static validateComponent(componentId) {
    try {
      ComponentRegistry.getComponent(componentId)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get handler for component or throw error
   * @param {string} componentId - Component ID
   * @returns {object} Component handler
   */
  static getHandler(componentId) {
    if (!ComponentFactory.validateComponent(componentId)) {
      throw new Error(`Invalid component: ${componentId}`)
    }

    return ComponentFactory.createHandler(componentId)
  }
}

export default ComponentFactory
