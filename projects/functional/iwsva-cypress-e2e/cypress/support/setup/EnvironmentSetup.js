/**
 * Environment Setup
 *
 * Handles environment preparation and initialization for IWSVA Update tests.
 * Manages system prerequisites, service status, and environment configuration.
 *
 * @class EnvironmentSetup
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class EnvironmentSetup {
  /**
   * Verify base environment prerequisites
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyPrerequisites() {
    cy.log('=== Verifying Environment Prerequisites ===')

    const checks = {
      baseUrl: false,
      credentials: false,
      directories: false,
      services: false
    }

    // Check base URL
    const baseUrl = Cypress.config('baseUrl')
    if (baseUrl) {
      checks.baseUrl = true
      cy.log(`✓ Base URL: ${baseUrl}`)
    } else {
      cy.log('✗ Base URL not configured')
    }

    // Check credentials
    const username = Cypress.env('username')
    const password = Cypress.env('password')

    if (username && password) {
      checks.credentials = true
      cy.log(`✓ Credentials configured for: ${username}`)
    } else {
      cy.log('✗ Credentials not configured')
    }

    // Check required directories exist
    cy.task('verifyDirectories', TestConfig.paths).then(result => {
      checks.directories = result.allExist
      if (result.allExist) {
        cy.log('✓ Required directories exist')
      } else {
        cy.log(`✗ Missing directories: ${result.missing.join(', ')}`)
      }
    })

    // Check services running
    cy.task('checkAllServices').then(result => {
      checks.services = result.allRunning
      if (result.allRunning) {
        cy.log('✓ All services running')
      } else {
        cy.log(`! Some services not running: ${result.notRunning.join(', ')}`)
      }
    })

    const allChecksPassed = Object.values(checks).every(check => check === true)

    cy.log(`Prerequisites check: ${allChecksPassed ? 'PASSED' : 'FAILED'}`)

    return cy.wrap({ passed: allChecksPassed, checks })
  }

  /**
   * Initialize test environment
   * @param {object} options - Initialization options
   * @returns {Cypress.Chainable<object>} Initialization result
   */
  static initialize(options = {}) {
    const opts = {
      verifyPrerequisites: true,
      createBackupDir: true,
      clearTempFiles: true,
      verifyServices: true,
      setupLogging: true,
      ...options
    }

    cy.log('========================================')
    cy.log('=== Initializing Test Environment ===')
    cy.log('========================================')

    // Verify prerequisites
    if (opts.verifyPrerequisites) {
      EnvironmentSetup.verifyPrerequisites().then(result => {
        if (!result.passed) {
          throw new Error('Environment prerequisites not met')
        }
      })
    }

    // Create backup directory
    if (opts.createBackupDir) {
      cy.task('createDirectory', TestConfig.paths.backupDir).then(() => {
        cy.log('✓ Backup directory ready')
      })
    }

    // Clear temp files
    if (opts.clearTempFiles) {
      cy.task('clearDirectory', TestConfig.paths.tempDir).then(() => {
        cy.log('✓ Temp directory cleared')
      })
    }

    // Verify services
    if (opts.verifyServices) {
      EnvironmentSetup.verifyAllServices()
    }

    // Setup logging
    if (opts.setupLogging) {
      cy.task('initializeLogging', {
        logDir: TestConfig.paths.logDir,
        level: 'info'
      }).then(() => {
        cy.log('✓ Logging initialized')
      })
    }

    cy.log('✓ Environment initialization complete')

    return cy.wrap({ initialized: true })
  }

  /**
   * Verify all required services are running
   * @returns {Cypress.Chainable<object>} Service status
   */
  static verifyAllServices() {
    cy.log('=== Verifying Services ===')

    const engines = ComponentRegistry.getEngines()
    const serviceStatuses = {}

    engines.forEach(engine => {
      cy.task('checkServiceStatus', { componentId: engine.id }).then(isRunning => {
        serviceStatuses[engine.id] = isRunning

        if (isRunning) {
          cy.log(`✓ ${engine.name} service: RUNNING`)
        } else {
          cy.log(`✗ ${engine.name} service: STOPPED`)
        }
      })
    })

    return cy.wrap(serviceStatuses)
  }

  /**
   * Start required services
   * @param {string[]} componentIds - Service component IDs (optional, defaults to all engines)
   * @returns {Cypress.Chainable<object>} Start result
   */
  static startServices(componentIds = null) {
    cy.log('=== Starting Services ===')

    const engines = componentIds
      ? componentIds.map(id => ComponentRegistry.getComponent(id))
      : ComponentRegistry.getEngines()

    const results = {}

    engines.forEach(engine => {
      if (engine.category === TestConstants.CATEGORIES.ENGINE) {
        cy.task('startService', { componentId: engine.id }).then(result => {
          results[engine.id] = result.success

          if (result.success) {
            cy.log(`✓ Started ${engine.name} service`)
          } else {
            cy.log(`✗ Failed to start ${engine.name}: ${result.error}`)
          }
        })
      }
    })

    return cy.wrap(results)
  }

  /**
   * Stop specified services
   * @param {string[]} componentIds - Service component IDs
   * @returns {Cypress.Chainable<object>} Stop result
   */
  static stopServices(componentIds) {
    cy.log('=== Stopping Services ===')

    const results = {}

    componentIds.forEach(componentId => {
      const component = ComponentRegistry.getComponent(componentId)

      if (component.category === TestConstants.CATEGORIES.ENGINE) {
        cy.task('stopService', { componentId }).then(result => {
          results[componentId] = result.success

          if (result.success) {
            cy.log(`✓ Stopped ${component.name} service`)
          } else {
            cy.log(`✗ Failed to stop ${component.name}: ${result.error}`)
          }
        })
      }
    })

    return cy.wrap(results)
  }

  /**
   * Restart specified services
   * @param {string[]} componentIds - Service component IDs
   * @returns {Cypress.Chainable<object>} Restart result
   */
  static restartServices(componentIds) {
    cy.log('=== Restarting Services ===')

    const results = {}

    componentIds.forEach(componentId => {
      const component = ComponentRegistry.getComponent(componentId)

      if (component.category === TestConstants.CATEGORIES.ENGINE) {
        cy.task('restartService', { componentId }).then(result => {
          results[componentId] = result.success

          if (result.success) {
            cy.log(`✓ Restarted ${component.name} service`)
          } else {
            cy.log(`✗ Failed to restart ${component.name}: ${result.error}`)
          }
        })
      }
    })

    return cy.wrap(results)
  }

  /**
   * Create required directories
   * @returns {Cypress.Chainable<object>} Creation result
   */
  static createDirectories() {
    cy.log('=== Creating Required Directories ===')

    const directories = [
      TestConfig.paths.backupDir,
      TestConfig.paths.tempDir,
      TestConfig.paths.logDir,
      TestConfig.paths.reportDir
    ]

    const results = {}

    directories.forEach(dir => {
      cy.task('createDirectory', dir).then(result => {
        results[dir] = result.success

        if (result.success) {
          cy.log(`✓ Created: ${dir}`)
        } else {
          cy.log(`✗ Failed: ${dir}`)
        }
      })
    })

    return cy.wrap(results)
  }

  /**
   * Verify file system permissions
   * @returns {Cypress.Chainable<object>} Permission check result
   */
  static verifyPermissions() {
    cy.log('=== Verifying File Permissions ===')

    const paths = [
      TestConfig.paths.iniFile,
      TestConfig.paths.backupDir,
      TestConfig.paths.tempDir
    ]

    const permissions = {}

    paths.forEach(path => {
      cy.task('checkPermissions', { path }).then(result => {
        permissions[path] = {
          readable: result.readable,
          writable: result.writable,
          executable: result.executable
        }

        if (result.readable && result.writable) {
          cy.log(`✓ ${path}: Read/Write OK`)
        } else {
          cy.log(`✗ ${path}: Insufficient permissions`)
        }
      })
    })

    return cy.wrap(permissions)
  }

  /**
   * Check disk space availability
   * @param {number} requiredMB - Required space in MB
   * @returns {Cypress.Chainable<object>} Disk space check result
   */
  static checkDiskSpace(requiredMB = 1024) {
    cy.log(`=== Checking Disk Space (required: ${requiredMB}MB) ===`)

    return cy.task('checkDiskSpace', { path: TestConfig.paths.backupDir }).then(result => {
      const availableMB = Math.floor(result.available / (1024 * 1024))

      if (availableMB >= requiredMB) {
        cy.log(`✓ Disk space: ${availableMB}MB available`)
        return cy.wrap({ sufficient: true, available: availableMB })
      } else {
        cy.log(`✗ Disk space: Only ${availableMB}MB available`)
        return cy.wrap({ sufficient: false, available: availableMB })
      }
    })
  }

  /**
   * Verify network connectivity
   * @returns {Cypress.Chainable<boolean>} True if network available
   */
  static verifyNetworkConnectivity() {
    cy.log('=== Verifying Network Connectivity ===')

    const baseUrl = Cypress.config('baseUrl')

    return cy.request({
      url: baseUrl,
      failOnStatusCode: false,
      timeout: TestConfig.timeouts.defaultCommand
    }).then(response => {
      if (response.status < 500) {
        cy.log(`✓ Network connectivity OK (status: ${response.status})`)
        return cy.wrap(true)
      } else {
        cy.log(`✗ Network connectivity issue (status: ${response.status})`)
        return cy.wrap(false)
      }
    })
  }

  /**
   * Setup test data directories
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static setupTestDataDirectories() {
    cy.log('=== Setting Up Test Data Directories ===')

    const testDirs = [
      `${TestConfig.paths.tempDir}/test-patterns`,
      `${TestConfig.paths.tempDir}/test-engines`,
      `${TestConfig.paths.backupDir}/pattern-backups`,
      `${TestConfig.paths.backupDir}/engine-backups`
    ]

    const results = {}

    testDirs.forEach(dir => {
      cy.task('createDirectory', dir).then(result => {
        results[dir] = result.success
      })
    })

    cy.log('✓ Test data directories created')

    return cy.wrap(results)
  }

  /**
   * Verify INI file exists and is readable
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyINIFile() {
    cy.log('=== Verifying INI File ===')

    return cy.task('verifyFile', { path: TestConfig.paths.iniFile }).then(result => {
      if (result.exists && result.readable) {
        cy.log(`✓ INI file: ${TestConfig.paths.iniFile}`)
        return cy.wrap({ valid: true, path: TestConfig.paths.iniFile })
      } else {
        cy.log(`✗ INI file not accessible: ${TestConfig.paths.iniFile}`)
        return cy.wrap({ valid: false, path: TestConfig.paths.iniFile })
      }
    })
  }

  /**
   * Create backup of current INI file
   * @returns {Cypress.Chainable<string>} Backup file path
   */
  static backupINIFile() {
    cy.log('=== Creating INI Backup ===')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${TestConfig.paths.backupDir}/intscan_${timestamp}.ini`

    return cy.task('copyFile', {
      source: TestConfig.paths.iniFile,
      destination: backupPath
    }).then(result => {
      if (result.success) {
        cy.log(`✓ INI backed up to: ${backupPath}`)
        return cy.wrap(backupPath)
      } else {
        cy.log(`✗ INI backup failed: ${result.error}`)
        throw new Error('Failed to backup INI file')
      }
    })
  }

  /**
   * Reset environment to clean state
   * @returns {Cypress.Chainable<object>} Reset result
   */
  static resetEnvironment() {
    cy.log('========================================')
    cy.log('=== Resetting Environment ===')
    cy.log('========================================')

    // Clear temp directory
    cy.task('clearDirectory', TestConfig.paths.tempDir)

    // Remove lock files
    cy.task('removeAllLockFiles')

    // Clear test logs
    cy.task('clearTestLogs')

    cy.log('✓ Environment reset complete')

    return cy.wrap({ reset: true })
  }

  /**
   * Complete environment setup workflow
   * @param {object} options - Setup options
   * @returns {Cypress.Chainable<object>} Setup result
   */
  static completeSetup(options = {}) {
    const opts = {
      verify: true,
      initialize: true,
      createDirectories: true,
      verifyServices: true,
      checkDiskSpace: true,
      backupINI: true,
      ...options
    }

    cy.log('========================================')
    cy.log('=== Complete Environment Setup ===')
    cy.log('========================================')

    const result = {
      prerequisites: null,
      initialized: false,
      servicesOK: false,
      diskSpaceOK: false,
      iniBackup: null
    }

    // Verify prerequisites
    if (opts.verify) {
      EnvironmentSetup.verifyPrerequisites().then(prereqResult => {
        result.prerequisites = prereqResult
      })
    }

    // Initialize environment
    if (opts.initialize) {
      EnvironmentSetup.initialize().then(initResult => {
        result.initialized = initResult.initialized
      })
    }

    // Create directories
    if (opts.createDirectories) {
      EnvironmentSetup.createDirectories()
    }

    // Verify services
    if (opts.verifyServices) {
      EnvironmentSetup.verifyAllServices().then(services => {
        result.servicesOK = Object.values(services).every(status => status === true)
      })
    }

    // Check disk space
    if (opts.checkDiskSpace) {
      EnvironmentSetup.checkDiskSpace(1024).then(diskResult => {
        result.diskSpaceOK = diskResult.sufficient
      })
    }

    // Backup INI
    if (opts.backupINI) {
      EnvironmentSetup.backupINIFile().then(backupPath => {
        result.iniBackup = backupPath
      })
    }

    cy.log('========================================')
    cy.log('=== Environment Setup Complete ===')
    cy.log('========================================')

    return cy.wrap(result)
  }
}

export default EnvironmentSetup
