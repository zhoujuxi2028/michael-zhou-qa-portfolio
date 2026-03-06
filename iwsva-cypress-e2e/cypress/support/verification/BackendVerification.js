/**
 * Backend Verification
 *
 * Handles backend state verification for IWSVA Update tests.
 * Verifies INI files, file system state, lock files, and component files.
 *
 * @class BackendVerification
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import TestConfig from '../../fixtures/test-config'
import TestConstants from '../../fixtures/test-constants'

class BackendVerification {
  /**
   * Verify component version in INI file
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyINIVersion(componentId, expectedVersion) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backend Verification: INI Version (${component.name}) ===`)

    return cy.task('readINI', {
      componentId: componentId,
      key: component.iniKey
    }).then(actualVersion => {
      const passed = actualVersion === expectedVersion

      if (passed) {
        cy.log(`✓ INI version match: ${actualVersion}`)
      } else {
        cy.log(`✗ INI version mismatch: expected ${expectedVersion}, got ${actualVersion}`)
      }

      return cy.wrap({
        check: 'iniVersion',
        componentId,
        expected: expectedVersion,
        actual: actualVersion,
        passed
      })
    })
  }

  /**
   * Verify component timestamp in INI file
   * @param {string} componentId - Component ID
   * @param {object} options - Verification options
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyINITimestamp(componentId, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      maxAgeMinutes: 5, // Timestamp should be within last 5 minutes
      ...options
    }

    cy.log(`=== Backend Verification: INI Timestamp (${component.name}) ===`)

    return cy.task('readINI', {
      componentId: componentId,
      key: component.iniTimeKey
    }).then(timestamp => {
      const timestampDate = new Date(timestamp)
      const now = new Date()
      const ageMinutes = (now - timestampDate) / (1000 * 60)

      const passed = ageMinutes <= opts.maxAgeMinutes

      if (passed) {
        cy.log(`✓ Timestamp is recent: ${timestamp} (${ageMinutes.toFixed(1)} minutes ago)`)
      } else {
        cy.log(`✗ Timestamp is old: ${timestamp} (${ageMinutes.toFixed(1)} minutes ago)`)
      }

      return cy.wrap({
        check: 'iniTimestamp',
        componentId,
        timestamp,
        ageMinutes,
        passed
      })
    })
  }

  /**
   * Verify complete INI entry for component
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyINIEntry(componentId, expectedVersion) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backend Verification: Complete INI Entry (${component.name}) ===`)

    const checks = []

    // Verify version
    BackendVerification.verifyINIVersion(componentId, expectedVersion).then(versionCheck => {
      checks.push(versionCheck)
    })

    // Verify timestamp
    BackendVerification.verifyINITimestamp(componentId).then(timestampCheck => {
      checks.push(timestampCheck)
    })

    const allPassed = checks.every(check => check.passed)

    cy.log(`INI Entry verification: ${allPassed ? 'PASSED' : 'FAILED'}`)

    return cy.wrap({
      componentId,
      checks,
      passed: allPassed
    })
  }

  /**
   * Verify lock file status
   * @param {string} componentId - Component ID
   * @param {boolean} shouldExist - Expected lock file existence
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyLockFile(componentId, shouldExist = false) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backend Verification: Lock File (${component.name}) ===`)
    cy.log(`Expected: ${shouldExist ? 'EXISTS' : 'REMOVED'}`)

    return cy.task('checkLockFile', { componentId }).then(exists => {
      const passed = exists === shouldExist

      if (passed) {
        cy.log(`✓ Lock file status correct: ${exists ? 'EXISTS' : 'REMOVED'}`)
      } else {
        cy.log(`✗ Lock file status incorrect: ${exists ? 'EXISTS' : 'REMOVED'}`)
      }

      return cy.wrap({
        check: 'lockFile',
        componentId,
        expected: shouldExist,
        actual: exists,
        passed
      })
    })
  }

  /**
   * Verify component files exist
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyComponentFiles(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backend Verification: Component Files (${component.name}) ===`)

    return cy.task('verifyComponentFiles', { componentId }).then(result => {
      const passed = result.exists && result.fileCount > 0

      if (passed) {
        cy.log(`✓ Component files exist (${result.fileCount} files)`)
        result.files.forEach(file => {
          cy.log(`  - ${file}`)
        })
      } else {
        cy.log(`✗ Component files missing or incomplete`)
      }

      return cy.wrap({
        check: 'componentFiles',
        componentId,
        fileCount: result.fileCount,
        files: result.files,
        passed
      })
    })
  }

  /**
   * Verify backup exists for component
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyBackupExists(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backend Verification: Backup Exists (${component.name}) ===`)

    return cy.task('verifyBackup', { componentId }).then(result => {
      const passed = result.exists

      if (passed) {
        cy.log(`✓ Backup exists: ${result.backupPath}`)
      } else {
        cy.log(`✗ Backup not found`)
      }

      return cy.wrap({
        check: 'backupExists',
        componentId,
        backupPath: result.backupPath,
        passed
      })
    })
  }

  /**
   * Verify pattern file integrity
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyPatternIntegrity(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    if (component.category !== TestConstants.CATEGORIES.PATTERN) {
      cy.log(`! ${component.name} is not a pattern component`)
      return cy.wrap({ check: 'patternIntegrity', passed: false, skipped: true })
    }

    cy.log(`=== Backend Verification: Pattern Integrity (${component.name}) ===`)

    return cy.task('verifyPatternIntegrity', { componentId }).then(result => {
      const passed = result.valid && result.checksum !== null

      if (passed) {
        cy.log(`✓ Pattern files valid (checksum: ${result.checksum})`)
      } else {
        cy.log(`✗ Pattern files invalid or corrupted`)
      }

      return cy.wrap({
        check: 'patternIntegrity',
        componentId,
        checksum: result.checksum,
        valid: result.valid,
        passed
      })
    })
  }

  /**
   * Verify engine DLL exists and is valid
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyEngineDLL(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    if (component.category !== TestConstants.CATEGORIES.ENGINE) {
      cy.log(`! ${component.name} is not an engine component`)
      return cy.wrap({ check: 'engineDLL', passed: false, skipped: true })
    }

    cy.log(`=== Backend Verification: Engine DLL (${component.name}) ===`)

    return cy.task('verifyEngineFiles', { componentId }).then(result => {
      const passed = result.exists && result.valid

      if (passed) {
        cy.log(`✓ Engine DLL valid: ${result.dllPath}`)
      } else {
        cy.log(`✗ Engine DLL missing or invalid`)
      }

      return cy.wrap({
        check: 'engineDLL',
        componentId,
        dllPath: result.dllPath,
        version: result.version,
        passed
      })
    })
  }

  /**
   * Verify file permissions
   * @param {string} componentId - Component ID
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyFilePermissions(componentId) {
    const component = ComponentRegistry.getComponent(componentId)

    cy.log(`=== Backend Verification: File Permissions (${component.name}) ===`)

    return cy.task('checkComponentPermissions', { componentId }).then(result => {
      const passed = result.readable && result.writable

      if (passed) {
        cy.log(`✓ File permissions correct (r:${result.readable} w:${result.writable})`)
      } else {
        cy.log(`✗ File permissions incorrect (r:${result.readable} w:${result.writable})`)
      }

      return cy.wrap({
        check: 'filePermissions',
        componentId,
        readable: result.readable,
        writable: result.writable,
        passed
      })
    })
  }

  /**
   * Verify disk space usage after update
   * @param {number} beforeBytes - Disk usage before update
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyDiskSpaceUsage(beforeBytes) {
    cy.log(`=== Backend Verification: Disk Space Usage ===`)

    return cy.task('checkDiskSpace', { path: TestConfig.paths.backupDir }).then(result => {
      const afterBytes = result.used
      const deltaBytes = afterBytes - beforeBytes
      const deltaMB = (deltaBytes / (1024 * 1024)).toFixed(2)

      cy.log(`Disk usage change: ${deltaMB}MB`)

      const passed = result.available > (100 * 1024 * 1024) // At least 100MB available

      if (passed) {
        cy.log(`✓ Sufficient disk space (${(result.available / (1024 * 1024)).toFixed(0)}MB available)`)
      } else {
        cy.log(`✗ Low disk space (${(result.available / (1024 * 1024)).toFixed(0)}MB available)`)
      }

      return cy.wrap({
        check: 'diskSpaceUsage',
        before: beforeBytes,
        after: afterBytes,
        delta: deltaBytes,
        availableMB: (result.available / (1024 * 1024)).toFixed(0),
        passed
      })
    })
  }

  /**
   * Complete backend verification for component
   * @param {string} componentId - Component ID
   * @param {string} expectedVersion - Expected version
   * @param {object} options - Verification options
   * @returns {Cypress.Chainable<object>} Complete verification result
   */
  static verifyComplete(componentId, expectedVersion, options = {}) {
    const component = ComponentRegistry.getComponent(componentId)
    const opts = {
      verifyINI: true,
      verifyLockFile: true,
      verifyFiles: true,
      verifyBackup: false,
      verifyIntegrity: true,
      verifyPermissions: true,
      ...options
    }

    cy.log(`========================================`)
    cy.log(`=== Complete Backend Verification: ${component.name} ===`)
    cy.log(`========================================`)

    const checks = []

    // Verify INI entry
    if (opts.verifyINI) {
      BackendVerification.verifyINIEntry(componentId, expectedVersion).then(check => {
        checks.push(check)
      })
    }

    // Verify lock file removed
    if (opts.verifyLockFile) {
      BackendVerification.verifyLockFile(componentId, false).then(check => {
        checks.push(check)
      })
    }

    // Verify component files exist
    if (opts.verifyFiles) {
      BackendVerification.verifyComponentFiles(componentId).then(check => {
        checks.push(check)
      })
    }

    // Verify backup (if required)
    if (opts.verifyBackup) {
      BackendVerification.verifyBackupExists(componentId).then(check => {
        checks.push(check)
      })
    }

    // Verify file integrity
    if (opts.verifyIntegrity) {
      if (component.category === TestConstants.CATEGORIES.PATTERN) {
        BackendVerification.verifyPatternIntegrity(componentId).then(check => {
          checks.push(check)
        })
      } else if (component.category === TestConstants.CATEGORIES.ENGINE) {
        BackendVerification.verifyEngineDLL(componentId).then(check => {
          checks.push(check)
        })
      }
    }

    // Verify file permissions
    if (opts.verifyPermissions) {
      BackendVerification.verifyFilePermissions(componentId).then(check => {
        checks.push(check)
      })
    }

    const allPassed = checks.every(check => check.passed || check.skipped)

    cy.log(`========================================`)
    cy.log(`=== Backend Verification: ${allPassed ? 'PASSED' : 'FAILED'} ===`)
    cy.log(`========================================`)

    return cy.wrap({
      componentId,
      componentName: component.name,
      checks,
      passed: allPassed
    })
  }

  /**
   * Verify INI file is readable
   * @returns {Cypress.Chainable<boolean>} True if readable
   */
  static verifyINIReadable() {
    cy.log(`=== Verifying INI File Readable ===`)

    return cy.task('verifyFile', { path: TestConfig.paths.iniFile }).then(result => {
      if (result.exists && result.readable) {
        cy.log(`✓ INI file is readable`)
        return cy.wrap(true)
      } else {
        cy.log(`✗ INI file not readable`)
        return cy.wrap(false)
      }
    })
  }

  /**
   * Read all INI entries
   * @returns {Cypress.Chainable<object>} All INI entries
   */
  static readAllINIEntries() {
    cy.log(`=== Reading All INI Entries ===`)

    const entries = {}
    const componentIds = ComponentRegistry.getComponentIds()

    componentIds.forEach(componentId => {
      const component = ComponentRegistry.getComponent(componentId)

      cy.task('readINI', {
        componentId: componentId,
        key: component.iniKey
      }).then(version => {
        entries[componentId] = {
          version: version,
          iniKey: component.iniKey
        }
      })
    })

    return cy.wrap(entries)
  }

  /**
   * Verify no orphaned lock files
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyNoOrphanedLockFiles() {
    cy.log(`=== Verifying No Orphaned Lock Files ===`)

    return cy.task('checkAnyLockFiles').then(anyLockFiles => {
      const passed = !anyLockFiles

      if (passed) {
        cy.log(`✓ No orphaned lock files`)
      } else {
        cy.log(`✗ Orphaned lock files detected`)
      }

      return cy.wrap({
        check: 'noOrphanedLockFiles',
        passed
      })
    })
  }

  /**
   * Verify backup directory structure
   * @returns {Cypress.Chainable<object>} Verification result
   */
  static verifyBackupStructure() {
    cy.log(`=== Verifying Backup Directory Structure ===`)

    return cy.task('verifyDirectory', {
      path: TestConfig.paths.backupDir
    }).then(result => {
      const passed = result.exists && result.writable

      if (passed) {
        cy.log(`✓ Backup directory structure valid`)
      } else {
        cy.log(`✗ Backup directory structure invalid`)
      }

      return cy.wrap({
        check: 'backupStructure',
        path: TestConfig.paths.backupDir,
        exists: result.exists,
        writable: result.writable,
        passed
      })
    })
  }

  // ==================== SYSTEM INFORMATION VERIFICATION ====================

  /**
   * Verify kernel version via SSH
   * Executes 'uname -r' command on IWSVA server and validates against expected version.
   *
   * @param {string} expectedVersion - Expected kernel version (e.g., '5.14.0-427.24.1.el9_4.x86_64')
   * @param {object} options - Verification options
   * @param {boolean} options.strict - Strict version matching (default: true)
   * @returns {Cypress.Chainable<object>} Verification result
   *
   * @example
   * BackendVerification.verifyKernelVersion('5.14.0-427.24.1.el9_4.x86_64')
   *   .then(check => {
   *     expect(check.passed).to.be.true
   *     cy.log(`✓ Backend: Kernel version = ${check.actual}`)
   *   })
   */
  static verifyKernelVersion(expectedVersion, options = {}) {
    const opts = {
      strict: true, // Strict version matching by default
      ...options
    }

    cy.log(`=== Backend Verification: Kernel Version ===`)
    cy.log(`Expected: ${expectedVersion}`)

    return cy.task('executeSSHCommand', {
      command: 'uname -r'
    }).then(result => {
      const actualVersion = result.stdout.trim()

      // Determine if versions match
      let passed
      if (opts.strict) {
        // Exact match
        passed = actualVersion === expectedVersion
      } else {
        // Partial match (contains expected version)
        passed = actualVersion.includes(expectedVersion) || expectedVersion.includes(actualVersion)
      }

      // Logging
      if (passed) {
        cy.log(`✓ Kernel version match: ${actualVersion}`)
      } else {
        cy.log(`✗ Kernel version mismatch`)
        cy.log(`  Expected: ${expectedVersion}`)
        cy.log(`  Actual:   ${actualVersion}`)
      }

      return cy.wrap({
        check: 'kernelVersion',
        expected: expectedVersion,
        actual: actualVersion,
        passed: passed,
        source: 'backend',
        command: 'uname -r',
        details: `SSH command executed: ${result.command}`
      })
    })
  }

  /**
   * Verify OS release information via SSH
   * Reads /etc/os-release file to get OS details.
   *
   * @returns {Cypress.Chainable<object>} Verification result with OS info
   *
   * @example
   * BackendVerification.verifyOSRelease().then(check => {
   *   cy.log(`OS: ${check.name} ${check.version}`)
   * })
   */
  static verifyOSRelease() {
    cy.log(`=== Backend Verification: OS Release Info ===`)

    return cy.task('executeSSHCommand', {
      command: 'cat /etc/os-release'
    }).then(result => {
      const output = result.stdout
      const osInfo = {}

      // Parse os-release file
      output.split('\n').forEach(line => {
        const match = line.match(/^([A-Z_]+)=(.+)$/)
        if (match) {
          const key = match[1]
          let value = match[2]
          // Remove quotes
          value = value.replace(/^["']|["']$/g, '')
          osInfo[key] = value
        }
      })

      cy.log(`✓ OS: ${osInfo.NAME || 'Unknown'}`)
      cy.log(`✓ Version: ${osInfo.VERSION || 'Unknown'}`)

      return cy.wrap({
        check: 'osRelease',
        passed: true,
        name: osInfo.NAME,
        version: osInfo.VERSION,
        versionId: osInfo.VERSION_ID,
        prettyName: osInfo.PRETTY_NAME,
        raw: osInfo
      })
    })
  }

  /**
   * Verify system uptime via SSH
   * Gets system uptime information.
   *
   * @returns {Cypress.Chainable<object>} Verification result with uptime
   */
  static verifySystemUptime() {
    cy.log(`=== Backend Verification: System Uptime ===`)

    return cy.task('executeSSHCommand', {
      command: 'uptime -p'
    }).then(result => {
      const uptime = result.stdout.trim()

      cy.log(`✓ System uptime: ${uptime}`)

      return cy.wrap({
        check: 'systemUptime',
        passed: true,
        uptime: uptime
      })
    })
  }

  /**
   * Complete system information verification
   * Verifies kernel version, OS release, and system uptime.
   *
   * @param {string} expectedKernelVersion - Expected kernel version (optional)
   * @param {object} options - Verification options
   * @returns {Cypress.Chainable<object>} Complete verification result
   *
   * @example
   * BackendVerification.verifySystemInfo('5.14.0-427.24.1.el9_4.x86_64')
   *   .then(result => {
   *     expect(result.passed).to.be.true
   *   })
   */
  static verifySystemInfo(expectedKernelVersion = null, options = {}) {
    cy.log(`========================================`)
    cy.log(`=== Backend: System Information ===`)
    cy.log(`========================================`)

    let kernelCheck, osCheck, uptimeCheck

    // Chain all verification steps properly
    const verifyChain = expectedKernelVersion
      ? this.verifyKernelVersion(expectedKernelVersion, options)
      : cy.task('executeSSHCommand', { command: 'uname -r' }).then(result => {
          const kernelVersion = result.stdout.trim()
          cy.log(`Kernel version: ${kernelVersion}`)
          return cy.wrap({
            check: 'kernelVersion',
            actual: kernelVersion,
            passed: true
          })
        })

    return verifyChain.then(check => {
      kernelCheck = check

      // Verify OS release
      return this.verifyOSRelease()
    }).then(check => {
      osCheck = check

      // Verify system uptime
      return this.verifySystemUptime()
    }).then(check => {
      uptimeCheck = check

      // Combine all checks
      const checks = [kernelCheck, osCheck, uptimeCheck]
      const allPassed = checks.every(c => c.passed)

      cy.log(`========================================`)
      cy.log(`=== System Info: ${allPassed ? 'PASSED' : 'FAILED'} ===`)
      cy.log(`========================================`)

      return cy.wrap({
        checks,
        passed: allPassed,
        kernelVersion: kernelCheck.actual,
        osName: osCheck.name,
        osVersion: osCheck.version
      })
    })
  }
}

export default BackendVerification
