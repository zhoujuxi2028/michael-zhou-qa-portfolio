/**
 * Pattern Downgrade Tasks
 *
 * Implements 3-step pattern downgrade process for IWSVA:
 * Step 1: Modify update server configuration (intscan.ini)
 * Step 2: Execute downgrade command (getupdate)
 * Step 3: Verify version (getupdate INFO)
 *
 * @module patternDowngrade
 */

const sshClient = require('./sshClient')
const ini = require('ini')

/**
 * Step 1: Modify INI configuration to allow HTTP update server
 * @param {object} sshConfig - SSH connection configuration
 * @param {string} iniPath - Path to intscan.ini (default: /etc/iscan/intscan.ini)
 * @returns {Promise<object>} Modification result
 */
async function modifyINIConfig(sshConfig, iniPath = '/etc/iscan/intscan.ini') {
  console.log('========================================')
  console.log('=== Step 1: Modify INI Configuration ===')
  console.log('========================================')
  console.log(`INI file: ${iniPath}`)

  try {
    // Read current INI content
    console.log('[1/4] Reading current INI file...')
    const currentContent = await sshClient.readRemoteFile(sshConfig, iniPath)
    console.log('✓ INI file read successfully')

    // Parse INI
    console.log('[2/4] Parsing INI content...')
    const config = ini.parse(currentContent)

    // Store original value
    const originalUseSSL = config.registration?.['/use_ssl']
    console.log(`Current /use_ssl value: ${originalUseSSL}`)

    // Modify /use_ssl to "no"
    console.log('[3/4] Modifying /use_ssl to "no"...')
    if (!config.registration) {
      config.registration = {}
    }
    config.registration['/use_ssl'] = 'no'

    // Write back
    console.log('[4/4] Writing modified INI file...')
    const newContent = ini.stringify(config)
    await sshClient.writeRemoteFile(sshConfig, iniPath, newContent)

    console.log('✓ INI configuration modified successfully')
    console.log('========================================')

    return {
      success: true,
      iniPath: iniPath,
      originalValue: originalUseSSL,
      newValue: 'no',
      backupPath: `${iniPath}.backup`
    }
  } catch (error) {
    console.error('✗ Failed to modify INI configuration:', error.message)
    throw error
  }
}

/**
 * Step 2: Execute pattern downgrade command
 * @param {object} sshConfig - SSH connection configuration
 * @param {string} componentId - Component ID (e.g., 'PTN')
 * @param {string} updateServerUrl - Old version update server URL
 * @returns {Promise<object>} Downgrade result
 */
async function executeDowngrade(sshConfig, componentId, updateServerUrl) {
  console.log('========================================')
  console.log('=== Step 2: Execute Downgrade Command ===')
  console.log('========================================')
  console.log(`Component: ${componentId}`)
  console.log(`Update Server: ${updateServerUrl}`)

  try {
    // Build command
    const command = `su iscan -c "/usr/iwss/bin/getupdate f${componentId} ${updateServerUrl}"`
    console.log(`Command: ${command}`)

    // Execute command
    console.log('[1/2] Executing downgrade command...')
    const result = await sshClient.executeSSHCommand(sshConfig, command)

    // Parse output for version
    console.log('[2/2] Parsing command output...')
    const output = result.stdout + result.stderr

    // Look for success message and version
    // Expected: "Virus Pattern forced update Successful (version 6.593.00)"
    const successMatch = output.match(/forced update Successful/i)
    const versionMatch = output.match(/version\s+([\d.]+)/i)

    if (successMatch && versionMatch) {
      const newVersion = versionMatch[1]
      console.log(`✓ Downgrade successful: ${newVersion}`)
      console.log('========================================')

      return {
        success: true,
        componentId: componentId,
        version: newVersion,
        output: output,
        command: command
      }
    } else {
      console.error('✗ Downgrade command output unexpected:')
      console.error(output)

      return {
        success: false,
        componentId: componentId,
        output: output,
        error: 'Downgrade output did not contain success message'
      }
    }
  } catch (error) {
    console.error('✗ Failed to execute downgrade:', error.message)
    throw error
  }
}

/**
 * Step 3: Verify component version
 * @param {object} sshConfig - SSH connection configuration
 * @param {string} componentId - Component ID (e.g., 'PTN')
 * @param {string} expectedVersion - Expected version (optional)
 * @returns {Promise<object>} Verification result
 */
async function verifyVersion(sshConfig, componentId, expectedVersion = null) {
  console.log('========================================')
  console.log('=== Step 3: Verify Component Version ===')
  console.log('========================================')
  console.log(`Component: ${componentId}`)
  if (expectedVersion) {
    console.log(`Expected version: ${expectedVersion}`)
  }

  try {
    // Execute getupdate INFO command
    const command = '/usr/iwss/bin/getupdate INFO'
    console.log(`Command: ${command}`)

    console.log('[1/2] Querying current version...')
    const result = await sshClient.executeSSHCommand(sshConfig, command)

    // Parse output for component version
    console.log('[2/2] Parsing version information...')
    const output = result.stdout

    // Look for component version line
    // Expected: "Virus Pattern   v6.593.00"
    const componentNameMap = {
      'PTN': 'Virus Pattern',
      'SPYWARE': 'Spyware Pattern',
      'BOT': 'Bot Pattern',
      'ITP': 'IntelliTrap Pattern',
      'ITE': 'IntelliTrap Exception',
      'ICRCAGENT': 'Smart Scan Agent',
      'ENG': 'Virus Scan Engine',
      'ATSEENG': 'ATSE Scan Engine',
      'TMUFEENG': 'URL Filtering Engine'
    }

    const componentName = componentNameMap[componentId] || componentId
    const versionRegex = new RegExp(`${componentName}\\s+v?([\\d.]+)`, 'i')
    const versionMatch = output.match(versionRegex)

    if (versionMatch) {
      const actualVersion = versionMatch[1]
      console.log(`✓ Current version: ${actualVersion}`)

      // Check against expected version if provided
      if (expectedVersion) {
        const isMatch = actualVersion === expectedVersion
        console.log(isMatch ? '✓ Version matches expected' : '✗ Version mismatch')
        console.log('========================================')

        return {
          success: true,
          verified: isMatch,
          componentId: componentId,
          actualVersion: actualVersion,
          expectedVersion: expectedVersion,
          output: output
        }
      } else {
        console.log('========================================')
        return {
          success: true,
          verified: true,
          componentId: componentId,
          actualVersion: actualVersion,
          output: output
        }
      }
    } else {
      console.error('✗ Could not find version in output')
      console.error('Full output:', output)

      return {
        success: false,
        verified: false,
        componentId: componentId,
        output: output,
        error: 'Version not found in output'
      }
    }
  } catch (error) {
    console.error('✗ Failed to verify version:', error.message)
    throw error
  }
}

/**
 * Restore INI configuration to original state
 * @param {object} sshConfig - SSH connection configuration
 * @param {string} iniPath - Path to intscan.ini
 * @param {string} originalValue - Original /use_ssl value
 * @returns {Promise<object>} Restore result
 */
async function restoreINIConfig(sshConfig, iniPath = '/etc/iscan/intscan.ini', originalValue = 'yes') {
  console.log('========================================')
  console.log('=== Restore INI Configuration ===')
  console.log('========================================')

  try {
    // Read current INI
    const currentContent = await sshClient.readRemoteFile(sshConfig, iniPath)
    const config = ini.parse(currentContent)

    // Restore /use_ssl
    if (!config.registration) {
      config.registration = {}
    }
    config.registration['/use_ssl'] = originalValue

    // Write back
    const newContent = ini.stringify(config)
    await sshClient.writeRemoteFile(sshConfig, iniPath, newContent)

    console.log(`✓ INI configuration restored: /use_ssl = ${originalValue}`)
    console.log('========================================')

    return {
      success: true,
      iniPath: iniPath,
      restoredValue: originalValue
    }
  } catch (error) {
    console.error('✗ Failed to restore INI configuration:', error.message)
    throw error
  }
}

/**
 * Complete 3-step downgrade process
 * @param {object} sshConfig - SSH connection configuration
 * @param {string} componentId - Component ID
 * @param {string} targetVersion - Target version to downgrade to
 * @param {string} updateServerUrl - Old version update server URL
 * @param {object} options - Additional options
 * @returns {Promise<object>} Complete downgrade result
 */
async function downgradePattern(sshConfig, componentId, targetVersion, updateServerUrl, options = {}) {
  console.log('========================================')
  console.log(`=== Complete Downgrade: ${componentId} to ${targetVersion} ===`)
  console.log('========================================')

  const iniPath = options.iniPath || '/etc/iscan/intscan.ini'
  const restoreINI = options.restoreINI !== false // Default: true

  let modifyResult, downgradeResult, verifyResult

  try {
    // Step 1: Modify INI
    modifyResult = await modifyINIConfig(sshConfig, iniPath)

    // Step 2: Execute downgrade
    downgradeResult = await executeDowngrade(sshConfig, componentId, updateServerUrl)

    if (!downgradeResult.success) {
      throw new Error(`Downgrade failed: ${downgradeResult.error}`)
    }

    // Step 3: Verify version
    verifyResult = await verifyVersion(sshConfig, componentId, targetVersion)

    // Restore INI if requested
    if (restoreINI && modifyResult.originalValue) {
      console.log('\n[Final] Restoring INI configuration...')
      await restoreINIConfig(sshConfig, iniPath, modifyResult.originalValue)
    }

    console.log('\n========================================')
    console.log('=== Downgrade Complete ===')
    console.log(`Component: ${componentId}`)
    console.log(`Version: ${verifyResult.actualVersion}`)
    console.log(`Verified: ${verifyResult.verified ? 'YES' : 'NO'}`)
    console.log('========================================')

    return {
      success: true,
      componentId: componentId,
      targetVersion: targetVersion,
      actualVersion: verifyResult.actualVersion,
      verified: verifyResult.verified,
      steps: {
        modifyINI: modifyResult,
        downgrade: downgradeResult,
        verify: verifyResult
      }
    }
  } catch (error) {
    console.error('\n========================================')
    console.error('=== Downgrade Failed ===')
    console.error(`Error: ${error.message}`)
    console.error('========================================')

    // Attempt to restore INI even on failure
    if (restoreINI && modifyResult?.originalValue) {
      try {
        await restoreINIConfig(sshConfig, iniPath, modifyResult.originalValue)
      } catch (restoreError) {
        console.error('Failed to restore INI:', restoreError.message)
      }
    }

    throw error
  }
}

module.exports = {
  modifyINIConfig,
  executeDowngrade,
  verifyVersion,
  restoreINIConfig,
  downgradePattern
}
