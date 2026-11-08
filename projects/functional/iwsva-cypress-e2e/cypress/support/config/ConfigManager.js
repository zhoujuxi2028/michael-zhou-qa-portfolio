/**
 * Enterprise Framework - Configuration Manager
 *
 * Purpose: Centralized configuration management system
 * Features:
 * - Load configuration from cypress.env.json
 * - Support for environment-specific configs
 * - Nested path access (e.g., 'components.PTN.timeout')
 * - Component registry integration
 *
 * Usage:
 * ConfigManager.initialize()
 * const baseUrl = ConfigManager.get('baseUrl')
 * const component = ConfigManager.getComponent('PTN')
 */

class ConfigManager {
  static config = null
  static initialized = false

  /**
   * Initialize configuration manager
   * Loads configuration from Cypress.env() and fixtures
   */
  static initialize() {
    if (this.initialized) {
      return
    }

    // Load base configuration from Cypress.env()
    this.config = {
      // Environment
      env: Cypress.env('ENV') || 'dev',

      // IWSVA connection
      baseUrl: Cypress.env('baseUrl') || 'https://10.206.201.9:8443',
      username: Cypress.env('username'),
      password: Cypress.env('password'),

      // SSH configuration
      ssh: {
        host: Cypress.env('sshHost') || Cypress.env('baseUrl')?.replace(/https?:\/\//, '').split(':')[0],
        port: Cypress.env('sshPort') || 22,
        user: Cypress.env('sshUser') || 'root',
        password: Cypress.env('sshPassword'),
        privateKeyPath: Cypress.env('sshPrivateKeyPath')
      },

      // Logging configuration
      logging: {
        level: Cypress.env('LOG_LEVEL') || 'INFO',
        persistLogs: Cypress.env('PERSIST_LOGS') !== false
      },

      // Timeouts
      timeouts: {
        updateCompletion: 600000, // 10 minutes
        pageLoad: 30000,          // 30 seconds
        frameLoad: 5000,          // 5 seconds
        sshCommand: 30000         // 30 seconds
      },

      // IWSVA paths
      paths: {
        iniFile: '/opt/trend/iwsva/intscan.ini',
        logFile: '/var/log/trend/iwsva/update.log',
        patternDir: '/opt/trend/iwsva/pattern/',
        lockDir: '/opt/trend/iwsva/',
        backupDir: '/opt/trend/iwsva/backup/'
      },

      // Component versions (can be overridden from env)
      componentVersions: Cypress.env('componentVersions') || {}
    }

    this.initialized = true
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'ssh.host')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value
   */
  static get(path, defaultValue = null) {
    if (!this.initialized) {
      this.initialize()
    }

    const keys = path.split('.')
    let value = this.config

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return defaultValue
      }
    }

    return value
  }

  /**
   * Get component configuration from ComponentRegistry
   * @param {string} componentId - Component ID (e.g., 'PTN')
   * @returns {object} Component configuration
   */
  static getComponent(componentId) {
    // This will be loaded from ComponentRegistry.js once created
    // For now, return a basic structure
    const ComponentRegistry = this._getComponentRegistry()
    return ComponentRegistry[componentId] || null
  }

  /**
   * Get component registry
   * @private
   */
  static _getComponentRegistry() {
    // Will be replaced with actual ComponentRegistry import
    // For now, return a minimal structure
    return {
      PTN: {
        id: 'PTN',
        name: 'Virus Pattern',
        category: 'Pattern',
        iniSection: 'Pattern-Update',
        iniVersionKey: 'Version',
        lockFile: '.patupdate',
        patternFiles: ['lpt$vpn.988', 'ssapi.dll'],
        backupPath: this.get('paths.backupDir') + 'patterns/',
        timeout: 600000
      }
    }
  }

  /**
   * Get environment name
   * @returns {string} Environment name (dev/staging/prod)
   */
  static getEnvironment() {
    return this.get('env', 'dev')
  }

  /**
   * Check if configuration value exists
   * @param {string} path - Dot-separated path
   * @returns {boolean} True if value exists
   */
  static has(path) {
    return this.get(path) !== null
  }

  /**
   * Get all configuration
   * @returns {object} Complete configuration object
   */
  static getAll() {
    if (!this.initialized) {
      this.initialize()
    }
    return { ...this.config }
  }

  /**
   * Validate required configuration
   * @throws {Error} If required configuration is missing
   */
  static validate() {
    if (!this.initialized) {
      this.initialize()
    }

    const required = [
      'baseUrl',
      'username',
      'password'
    ]

    const missing = required.filter(key => !this.get(key))

    if (missing.length > 0) {
      throw new Error(
        `Missing required configuration: ${missing.join(', ')}. ` +
        'Please ensure cypress.env.json is properly configured.'
      )
    }

    return true
  }

  /**
   * Reset configuration (mainly for testing)
   */
  static reset() {
    this.config = null
    this.initialized = false
  }
}

export default ConfigManager
