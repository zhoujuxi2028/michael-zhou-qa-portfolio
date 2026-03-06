/**
 * Cleanup Workflow
 *
 * Handles test cleanup and environment restoration for IWSVA Update tests.
 * Includes logout, state restoration, and test data cleanup.
 *
 * @class CleanupWorkflow
 */

import BasePage from '../pages/BasePage'
import ManualUpdatePage from '../pages/ManualUpdatePage'
import SchedulePage from '../pages/SchedulePage'
import ProxyPage from '../pages/ProxyPage'
import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'

class CleanupWorkflow {
  constructor() {
    this.basePage = new BasePage()
    this.manualUpdatePage = new ManualUpdatePage()
    this.schedulePage = new SchedulePage()
    this.proxyPage = new ProxyPage()
  }

  /**
   * Basic cleanup - logout and clear session
   */
  basicCleanup() {
    cy.log('=== Cleanup: Basic ===')

    this.basePage.logout()

    cy.log('✓ Basic cleanup complete')
  }

  /**
   * Clear all cookies and local storage
   */
  clearSessionData() {
    cy.log('=== Cleanup: Session Data ===')

    cy.clearCookies()
    cy.clearLocalStorage()

    cy.log('✓ Session data cleared')
  }

  /**
   * Reset schedule to default settings
   */
  resetSchedule() {
    cy.log('=== Cleanup: Reset Schedule ===')

    this.schedulePage.navigate()
    this.schedulePage.resetToDefaults()

    cy.log('✓ Schedule reset to defaults')
  }

  /**
   * Clear proxy configuration
   */
  clearProxy() {
    cy.log('=== Cleanup: Clear Proxy ===')

    this.proxyPage.navigate()
    this.proxyPage.disableProxy()

    cy.log('✓ Proxy configuration cleared')
  }

  /**
   * Remove lock files if any exist
   * Ensures no update operations are locked
   */
  removeLockFiles() {
    cy.log('=== Cleanup: Remove Lock Files ===')

    const componentIds = ComponentRegistry.getComponentIds()

    componentIds.forEach(componentId => {
      cy.task('removeLockFile', { componentId }).then(removed => {
        if (removed) {
          cy.log(`✓ Lock file removed for ${componentId}`)
        }
      })
    })

    cy.log('✓ Lock files cleanup complete')
  }

  /**
   * Clean up temporary test files
   * Removes test-created files, backups, etc.
   */
  cleanupTestFiles() {
    cy.log('=== Cleanup: Test Files ===')

    // Clean up test artifacts
    cy.task('cleanupTestArtifacts').then(result => {
      if (result.success) {
        cy.log(`✓ Cleaned up ${result.filesRemoved} test files`)
      } else {
        cy.log(`! Cleanup failed: ${result.error}`)
      }
    })

    cy.log('✓ Test files cleanup complete')
  }

  /**
   * Restore component to specific version
   * Used to reset test environment to known state
   * @param {string} componentId - Component ID
   * @param {string} targetVersion - Version to restore to
   */
  restoreComponentVersion(componentId, targetVersion) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Cleanup: Restore ${component.name} to ${targetVersion} ===`)

    // This would typically use a downgrade utility
    cy.task('downgradeComponent', {
      componentId,
      targetVersion
    }).then(result => {
      if (result.success) {
        cy.log(`✓ Component restored to ${targetVersion}`)
      } else {
        cy.log(`! Restore failed: ${result.error}`)
      }
    })

    cy.log('✓ Component version restoration complete')
  }

  /**
   * Restore all components to baseline versions
   * @param {object} baselineVersions - Map of componentId to version
   */
  restoreAllVersions(baselineVersions) {
    cy.log('=== Cleanup: Restore All Component Versions ===')

    Object.keys(baselineVersions).forEach(componentId => {
      const version = baselineVersions[componentId]
      cy.log(`Restoring ${componentId} to ${version}`)

      cy.task('downgradeComponent', {
        componentId,
        targetVersion: version
      }).then(result => {
        if (result.success) {
          cy.log(`✓ ${componentId}: ${version}`)
        } else {
          cy.log(`! ${componentId} restore failed`)
        }
      })
    })

    cy.log('✓ All versions restored')
  }

  /**
   * Clean up backup directories
   * Removes test-created backup directories
   */
  cleanupBackups() {
    cy.log('=== Cleanup: Backup Directories ===')

    cy.task('cleanupBackups').then(result => {
      if (result.success) {
        cy.log(`✓ Cleaned up ${result.backupsRemoved} backup directories`)
      } else {
        cy.log(`! Backup cleanup failed: ${result.error}`)
      }
    })

    cy.log('✓ Backup cleanup complete')
  }

  /**
   * Reset INI file to default state
   * Restores default configuration in intscan.ini
   */
  resetINIFile() {
    cy.log('=== Cleanup: Reset INI File ===')

    cy.task('resetINI').then(result => {
      if (result.success) {
        cy.log('✓ INI file reset to defaults')
      } else {
        cy.log(`! INI reset failed: ${result.error}`)
      }
    })

    cy.log('✓ INI file reset complete')
  }

  /**
   * Clean up log files
   * Archives or removes test-generated log entries
   * @param {boolean} archive - True to archive, false to delete
   */
  cleanupLogs(archive = true) {
    cy.log('=== Cleanup: Log Files ===')

    if (archive) {
      cy.task('archiveLogs').then(result => {
        if (result.success) {
          cy.log(`✓ Logs archived to ${result.archivePath}`)
        } else {
          cy.log(`! Log archive failed: ${result.error}`)
        }
      })
    } else {
      cy.task('clearLogs').then(result => {
        if (result.success) {
          cy.log('✓ Logs cleared')
        } else {
          cy.log(`! Log clear failed: ${result.error}`)
        }
      })
    }

    cy.log('✓ Log cleanup complete')
  }

  /**
   * Verify environment is clean
   * Checks that cleanup was successful
   * @returns {Cypress.Chainable<boolean>} True if environment is clean
   */
  verifyEnvironmentClean() {
    cy.log('=== Cleanup: Verify Environment Clean ===')

    const checks = {
      noLockFiles: false,
      noTempFiles: false,
      noActiveUpdates: false,
    }

    // Check no lock files exist
    cy.task('checkAnyLockFiles').then(anyLockFiles => {
      checks.noLockFiles = !anyLockFiles

      if (checks.noLockFiles) {
        cy.log('✓ No lock files present')
      } else {
        cy.log('✗ Lock files still exist')
      }
    })

    // Check no temp files
    cy.task('checkTempFiles').then(tempFilesExist => {
      checks.noTempFiles = !tempFilesExist

      if (checks.noTempFiles) {
        cy.log('✓ No temp files present')
      } else {
        cy.log('! Temp files still exist')
      }
    })

    // Check no active updates
    cy.task('checkActiveUpdates').then(activeUpdates => {
      checks.noActiveUpdates = !activeUpdates

      if (checks.noActiveUpdates) {
        cy.log('✓ No active updates')
      } else {
        cy.log('✗ Active updates detected')
      }
    })

    const allClean = Object.values(checks).every(check => check === true)

    if (allClean) {
      cy.log('✓ Environment is clean')
    } else {
      cy.log('! Environment not fully clean')
    }

    return cy.wrap(allClean)
  }

  /**
   * Complete cleanup workflow
   * Performs all cleanup steps in correct order
   * @param {object} options - Cleanup options
   */
  completeCleanup(options = {}) {
    const opts = {
      logout: true,
      clearSession: true,
      resetSchedule: false,
      clearProxy: false,
      removeLockFiles: true,
      cleanupTestFiles: true,
      cleanupBackups: false,
      cleanupLogs: false,
      resetINI: false,
      restoreVersions: false,
      baselineVersions: null,
      verify: true,
      ...options
    }

    cy.log('========================================')
    cy.log('=== Complete Cleanup Workflow ===')
    cy.log('========================================')

    // Remove lock files first
    if (opts.removeLockFiles) {
      this.removeLockFiles()
    }

    // Clean up test files
    if (opts.cleanupTestFiles) {
      this.cleanupTestFiles()
    }

    // Clean up backups
    if (opts.cleanupBackups) {
      this.cleanupBackups()
    }

    // Clean up logs
    if (opts.cleanupLogs) {
      this.cleanupLogs(true) // Archive by default
    }

    // Reset schedule
    if (opts.resetSchedule) {
      this.resetSchedule()
    }

    // Clear proxy
    if (opts.clearProxy) {
      this.clearProxy()
    }

    // Reset INI file
    if (opts.resetINI) {
      this.resetINIFile()
    }

    // Restore component versions
    if (opts.restoreVersions && opts.baselineVersions) {
      this.restoreAllVersions(opts.baselineVersions)
    }

    // Clear session and logout
    if (opts.clearSession) {
      this.clearSessionData()
    }

    if (opts.logout) {
      this.basicCleanup()
    }

    // Verify cleanup
    if (opts.verify) {
      this.verifyEnvironmentClean()
    }

    cy.log('========================================')
    cy.log('=== Cleanup Workflow Complete ===')
    cy.log('========================================')

    return cy.wrap({ cleanupComplete: true })
  }

  /**
   * Cleanup after successful test
   * Light cleanup - just logout and clear session
   */
  cleanupAfterSuccess() {
    cy.log('=== Cleanup: After Success ===')

    this.clearSessionData()
    this.basicCleanup()

    cy.log('✓ Success cleanup complete')
  }

  /**
   * Cleanup after failed test
   * More thorough cleanup including lock files and temp data
   */
  cleanupAfterFailure() {
    cy.log('=== Cleanup: After Failure ===')

    // Remove any lock files
    this.removeLockFiles()

    // Clean up test files
    this.cleanupTestFiles()

    // Clear session
    this.clearSessionData()

    // Logout
    this.basicCleanup()

    cy.log('✓ Failure cleanup complete')
  }

  /**
   * Emergency cleanup
   * Most thorough cleanup when test environment is in unknown state
   */
  emergencyCleanup() {
    cy.log('========================================')
    cy.log('=== EMERGENCY CLEANUP ===')
    cy.log('========================================')

    // Clear everything
    this.completeCleanup({
      logout: true,
      clearSession: true,
      resetSchedule: true,
      clearProxy: true,
      removeLockFiles: true,
      cleanupTestFiles: true,
      cleanupBackups: true,
      cleanupLogs: false, // Keep logs for debugging
      resetINI: false, // Keep current INI state
      verify: true
    })

    cy.log('✓ Emergency cleanup complete')
  }

  /**
   * Cleanup for specific component after test
   * @param {string} componentId - Component ID
   */
  cleanupComponent(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Cleanup: ${component.name} ===`)

    // Remove lock file for this component
    cy.task('removeLockFile', { componentId })

    // Clean up component-specific test files
    cy.task('cleanupComponentFiles', { componentId })

    cy.log(`✓ ${component.name} cleanup complete`)
  }

  /**
   * Restore from snapshot
   * Restores environment to previously saved snapshot
   * @param {object} snapshot - State snapshot from SetupWorkflow
   */
  restoreFromSnapshot(snapshot) {
    cy.log('=== Cleanup: Restore from Snapshot ===')

    if (!snapshot) {
      cy.log('! No snapshot provided')
      return
    }

    cy.log(`Restoring snapshot from: ${snapshot.timestamp}`)

    // Restore schedule
    if (snapshot.scheduleConfig) {
      this.schedulePage.navigate()
      this.schedulePage.configureSchedule(snapshot.scheduleConfig)
    }

    // Restore proxy
    if (snapshot.proxyConfig) {
      this.proxyPage.navigate()

      if (snapshot.proxyConfig.enabled) {
        this.proxyPage.configureBasicProxy(snapshot.proxyConfig)
      } else {
        this.proxyPage.disableProxy()
      }
    }

    // Restore versions (if available)
    if (snapshot.versions) {
      this.restoreAllVersions(snapshot.versions)
    }

    cy.log('✓ Snapshot restoration complete')
  }

  /**
   * Take final screenshot for debugging
   * @param {string} testName - Test name for screenshot
   */
  captureFailureState(testName) {
    cy.log(`=== Capturing Failure State: ${testName} ===`)

    // Screenshot current page
    this.basePage.takeScreenshot(`failure-${testName}-${Date.now()}`)

    // Capture console logs
    cy.task('captureConsoleLogs', { testName })

    // Capture current URL
    cy.url().then(url => {
      cy.log(`Failed at URL: ${url}`)
    })

    cy.log('✓ Failure state captured')
  }
}

export default CleanupWorkflow
