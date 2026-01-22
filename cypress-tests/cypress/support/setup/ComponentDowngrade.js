/**
 * Component Downgrade
 *
 * Utility for downgrading components to specific versions for testing.
 * Supports both pattern and engine downgrades with backup and rollback.
 *
 * @class ComponentDowngrade
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import ComponentVersions from '../../fixtures/component-test-versions.json'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class ComponentDowngrade {
  /**
   * Downgrade component to specific version
   * @param {string} componentId - Component ID
   * @param {string} targetVersion - Target version to downgrade to
   * @param {object} options - Downgrade options
   * @returns {Cypress.Chainable<object>} Downgrade result
   */
  static downgradeToVersion(componentId, targetVersion, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      createBackup: true,
      verifyAfter: true,
      updateINI: true,
      restartService: false,
      ...options
    }

    cy.log(`========================================`)
    cy.log(`=== Downgrading ${component.name} to ${targetVersion} ===`)
    cy.log(`========================================`)

    // Get current version for backup reference
    let currentVersion
    cy.task('readINI', {
      componentId: componentId,
      key: component.iniKey
    }).then(version => {
      currentVersion = version
      cy.log(`Current version: ${currentVersion}`)
      cy.log(`Target version: ${targetVersion}`)
    })

    // Create backup if requested
    if (opts.createBackup) {
      ComponentDowngrade.backupComponent(componentId).then(backupPath => {
        cy.log(`✓ Backup created: ${backupPath}`)
      })
    }

    // Perform downgrade
    cy.task('downgradeComponent', {
      componentId: componentId,
      targetVersion: targetVersion,
      componentCategory: component.category
    }).then(result => {
      if (!result.success) {
        cy.log(`✗ Downgrade failed: ${result.error}`)
        throw new Error(`Downgrade failed for ${componentId}`)
      }

      cy.log(`✓ Component files downgraded`)

      // Update INI file
      if (opts.updateINI) {
        cy.task('writeINI', {
          componentId: componentId,
          key: component.iniKey,
          value: targetVersion
        }).then(iniResult => {
          if (iniResult.success) {
            cy.log(`✓ INI updated: ${component.iniKey}=${targetVersion}`)
          } else {
            cy.log(`✗ INI update failed`)
          }
        })

        // Update timestamp
        const timestamp = new Date().toISOString()
        cy.task('writeINI', {
          componentId: componentId,
          key: component.iniTimeKey,
          value: timestamp
        })
      }

      // Restart service if required
      if (opts.restartService && component.requiresRestart) {
        cy.task('restartService', { componentId }).then(restartResult => {
          if (restartResult.success) {
            cy.log(`✓ Service restarted`)
          } else {
            cy.log(`! Service restart failed`)
          }
        })
      }

      // Verify downgrade
      if (opts.verifyAfter) {
        ComponentDowngrade.verifyVersion(componentId, targetVersion).then(verified => {
          if (verified) {
            cy.log(`✓ Version verified: ${targetVersion}`)
          } else {
            cy.log(`✗ Version verification failed`)
          }
        })
      }

      cy.log(`========================================`)
      cy.log(`=== Downgrade Complete: ${component.name} ===`)
      cy.log(`========================================`)

      return cy.wrap({
        success: true,
        componentId: componentId,
        componentName: component.name,
        fromVersion: currentVersion,
        toVersion: targetVersion
      })
    })
  }

  /**
   * Downgrade component to previous version
   * Uses version data from component-test-versions.json
   * @param {string} componentId - Component ID
   * @param {object} options - Downgrade options
   * @returns {Cypress.Chainable<object>} Downgrade result
   */
  static downgradeToPrevious(componentId, options = {}) {
    const versionData = ComponentVersions[componentId]

    if (!versionData || !versionData.previous) {
      throw new Error(`No previous version defined for ${componentId}`)
    }

    cy.log(`Downgrading ${componentId} to previous version: ${versionData.previous}`)

    return ComponentDowngrade.downgradeToVersion(componentId, versionData.previous, options)
  }

  /**
   * Downgrade to specific test version
   * @param {string} componentId - Component ID
   * @param {string} versionKey - Version key ('current', 'available', 'previous', 'oldest')
   * @param {object} options - Downgrade options
   * @returns {Cypress.Chainable<object>} Downgrade result
   */
  static downgradeToTestVersion(componentId, versionKey, options = {}) {
    const versionData = ComponentVersions[componentId]

    if (!versionData || !versionData[versionKey]) {
      throw new Error(`Version key "${versionKey}" not found for ${componentId}`)
    }

    const targetVersion = versionData[versionKey]

    cy.log(`Downgrading ${componentId} to ${versionKey} version: ${targetVersion}`)

    return ComponentDowngrade.downgradeToVersion(componentId, targetVersion, options)
  }

  /**
   * Backup component files
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<string>} Backup directory path
   */
  static backupComponent(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backing Up ${component.name} ===`)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = `${TestConfig.paths.backupDir}/${componentId}_${timestamp}`

    return cy.task('backupComponent', {
      componentId: componentId,
      backupDir: backupDir,
      category: component.category
    }).then(result => {
      if (result.success) {
        cy.log(`✓ Backup created: ${backupDir}`)
        cy.log(`Files backed up: ${result.fileCount}`)
        return cy.wrap(backupDir)
      } else {
        cy.log(`✗ Backup failed: ${result.error}`)
        throw new Error(`Backup failed for ${componentId}`)
      }
    })
  }

  /**
   * Restore component from backup
   * @param {string} componentId - Component ID
   * @param {string} backupDir - Backup directory path
   * @param {object} options - Restore options
   * @returns {Cypress.Chainable<object>} Restore result
   */
  static restoreFromBackup(componentId, backupDir, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      updateINI: true,
      restartService: false,
      ...options
    }

    cy.log(`=== Restoring ${component.name} from Backup ===`)
    cy.log(`Backup: ${backupDir}`)

    return cy.task('restoreComponent', {
      componentId: componentId,
      backupDir: backupDir,
      category: component.category
    }).then(result => {
      if (result.success) {
        cy.log(`✓ Component restored from backup`)
        cy.log(`Files restored: ${result.fileCount}`)

        // Update INI if requested
        if (opts.updateINI && result.version) {
          cy.task('writeINI', {
            componentId: componentId,
            key: component.iniKey,
            value: result.version
          })
        }

        // Restart service if required
        if (opts.restartService && component.requiresRestart) {
          cy.task('restartService', { componentId })
        }

        return cy.wrap({
          success: true,
          componentId: componentId,
          backupDir: backupDir,
          version: result.version
        })
      } else {
        cy.log(`✗ Restore failed: ${result.error}`)
        throw new Error(`Restore failed for ${componentId}`)
      }
    })
  }

  /**
   * Verify component version
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version
   * @returns {Cypress.Chainable<boolean>} True if version matches
   */
  static verifyVersion(componentId, expectedVersion) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`Verifying ${component.name} version: ${expectedVersion}`)

    return cy.task('readINI', {
      componentId: componentId,
      key: component.iniKey
    }).then(actualVersion => {
      if (actualVersion === expectedVersion) {
        cy.log(`✓ Version match: ${actualVersion}`)
        return cy.wrap(true)
      } else {
        cy.log(`✗ Version mismatch: expected ${expectedVersion}, got ${actualVersion}`)
        return cy.wrap(false)
      }
    })
  }

  /**
   * Downgrade multiple components
   * @param {object} versionMap - Map of componentId to targetVersion
   * @param {object} options - Downgrade options
   * @returns {Cypress.Chainable<object[]>} Downgrade results
   */
  static downgradeBatch(versionMap, options = {}) {
    cy.log(`=== Batch Downgrade: ${Object.keys(versionMap).length} components ===`)

    const results = []

    Object.keys(versionMap).forEach(componentId => {
      const targetVersion = versionMap[componentId]

      ComponentDowngrade.downgradeToVersion(componentId, targetVersion, options).then(result => {
        results.push(result)
      })
    })

    cy.log(`✓ Batch downgrade complete`)

    return cy.wrap(results)
  }

  /**
   * Downgrade all components to specific versions
   * Uses 'previous' version from test data
   * @param {string[]} componentIds - Component IDs (optional, defaults to all)
   * @param {object} options - Downgrade options
   * @returns {Cypress.Chainable<object[]>} Downgrade results
   */
  static downgradeAllToPrevious(componentIds = null, options = {}) {
    const components = componentIds || ComponentRegistry.getComponentIds()

    cy.log(`=== Downgrading All Components to Previous Versions ===`)

    const results = []

    components.forEach(componentId => {
      const versionData = ComponentVersions[componentId]

      if (versionData && versionData.previous) {
        ComponentDowngrade.downgradeToVersion(componentId, versionData.previous, options).then(result => {
          results.push(result)
        })
      } else {
        cy.log(`! No previous version for ${componentId}`)
      }
    })

    return cy.wrap(results)
  }

  /**
   * Create baseline environment
   * Sets all components to known 'baseline' versions for testing
   * @param {object} options - Setup options
   * @returns {Cypress.Chainable<object>} Baseline setup result
   */
  static createBaseline(options = {}) {
    cy.log(`========================================`)
    cy.log(`=== Creating Baseline Environment ===`)
    cy.log(`========================================`)

    const opts = {
      useOldestVersions: false,
      createBackups: true,
      ...options
    }

    const versionKey = opts.useOldestVersions ? 'oldest' : 'previous'

    const componentIds = ComponentRegistry.getComponentIds()
    const baseline = {}

    // Build version map
    componentIds.forEach(componentId => {
      const versionData = ComponentVersions[componentId]

      if (versionData && versionData[versionKey]) {
        baseline[componentId] = versionData[versionKey]
      }
    })

    cy.log(`Baseline versions:`, baseline)

    // Perform batch downgrade
    return ComponentDowngrade.downgradeBatch(baseline, {
      createBackup: opts.createBackups,
      verifyAfter: true,
      updateINI: true
    }).then(results => {
      cy.log(`✓ Baseline environment created`)
      cy.log(`Components configured: ${results.length}`)

      return cy.wrap({
        baseline: baseline,
        results: results
      })
    })
  }

  /**
   * Get available versions for component
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Available versions
   */
  static getAvailableVersions(componentId) {
    const versionData = ComponentVersions[componentId]

    if (!versionData) {
      cy.log(`! No version data for ${componentId}`)
      return cy.wrap({})
    }

    cy.log(`Available versions for ${componentId}:`, versionData)

    return cy.wrap(versionData)
  }

  /**
   * Check if downgrade is possible
   * @param {string} componentId - Component ID
   * @param {string} targetVersion - Target version
   * @returns {Cypress.Chainable<boolean>} True if downgrade possible
   */
  static canDowngrade(componentId, targetVersion) {
    const component = ComponentRegistry.getComponent(componentId)

    // Check if target version exists in test data
    return cy.task('checkVersionAvailable', {
      componentId: componentId,
      version: targetVersion,
      category: component.category
    }).then(available => {
      if (available) {
        cy.log(`✓ Downgrade to ${targetVersion} is possible`)
        return cy.wrap(true)
      } else {
        cy.log(`✗ Version ${targetVersion} not available`)
        return cy.wrap(false)
      }
    })
  }

  /**
   * List all backups for component
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<string[]>} Array of backup directories
   */
  static listBackups(componentId) {
    cy.log(`=== Listing Backups for ${componentId} ===`)

    return cy.task('listBackups', {
      componentId: componentId,
      backupDir: TestConfig.paths.backupDir
    }).then(backups => {
      cy.log(`Found ${backups.length} backups`)
      backups.forEach(backup => {
        cy.log(`- ${backup}`)
      })

      return cy.wrap(backups)
    })
  }

  /**
   * Delete old backups
   * @param {string} componentId - Component ID (optional, deletes all if not specified)
   * @param {number} keepLast - Number of recent backups to keep
   * @returns {Cypress.Chainable<object>} Deletion result
   */
  static cleanupBackups(componentId = null, keepLast = 3) {
    cy.log(`=== Cleaning Up Backups (keeping last ${keepLast}) ===`)

    return cy.task('cleanupBackups', {
      componentId: componentId,
      backupDir: TestConfig.paths.backupDir,
      keepLast: keepLast
    }).then(result => {
      cy.log(`✓ Deleted ${result.deleted} old backups`)
      cy.log(`Kept ${result.kept} recent backups`)

      return cy.wrap(result)
    })
  }
}

export default ComponentDowngrade
