/**
 * Cypress Tasks Index
 *
 * Centralized registration of all Cypress tasks for IWSVA testing.
 *
 * @module tasks
 */

const sshClient = require('./sshClient')
const patternDowngrade = require('./patternDowngrade')

/**
 * Get SSH config from Cypress environment
 * @param {object} config - Cypress config object
 * @returns {object} SSH configuration
 */
function getSSHConfig(config) {
  return {
    host: config.env.ssh?.host || config.env.baseUrl?.replace(/^https?:\/\//, '').split(':')[0],
    port: config.env.ssh?.port || 22,
    username: config.env.ssh?.username || config.env.username || 'root',
    password: config.env.ssh?.password || config.env.password,
    privateKey: config.env.ssh?.privateKey
  }
}

/**
 * Register all Cypress tasks
 * @param {object} on - Cypress plugin events
 * @param {object} config - Cypress configuration
 */
function registerTasks(on, config) {
  // Get SSH config once
  const sshConfig = getSSHConfig(config)

  on('task', {
    // ==================== SSH Tasks ====================

    /**
     * Test SSH connection
     */
    testSSHConnection() {
      return sshClient.testConnection(sshConfig)
    },

    /**
     * Execute SSH command
     * @param {string} command - Command to execute
     */
    executeSSHCommand({ command }) {
      return sshClient.executeSSHCommand(sshConfig, command)
    },

    /**
     * Read remote file via SSH
     * @param {string} filePath - Remote file path
     */
    readRemoteFile({ filePath }) {
      return sshClient.readRemoteFile(sshConfig, filePath)
    },

    /**
     * Write remote file via SSH
     * @param {string} filePath - Remote file path
     * @param {string} content - Content to write
     */
    writeRemoteFile({ filePath, content }) {
      return sshClient.writeRemoteFile(sshConfig, filePath, content)
    },

    // ==================== Pattern Downgrade Tasks ====================

    /**
     * Step 1: Modify INI configuration
     * @param {string} iniPath - Path to intscan.ini (optional)
     */
    modifyINIConfig({ iniPath }) {
      return patternDowngrade.modifyINIConfig(sshConfig, iniPath)
    },

    /**
     * Step 2: Execute downgrade command
     * @param {string} componentId - Component ID (e.g., 'PTN')
     * @param {string} updateServerUrl - Old version update server URL
     */
    executeDowngrade({ componentId, updateServerUrl }) {
      return patternDowngrade.executeDowngrade(sshConfig, componentId, updateServerUrl)
    },

    /**
     * Step 3: Verify component version
     * @param {string} componentId - Component ID
     * @param {string} expectedVersion - Expected version (optional)
     */
    verifyComponentVersion({ componentId, expectedVersion }) {
      return patternDowngrade.verifyVersion(sshConfig, componentId, expectedVersion)
    },

    /**
     * Restore INI configuration
     * @param {string} iniPath - Path to intscan.ini (optional)
     * @param {string} originalValue - Original /use_ssl value
     */
    restoreINIConfig({ iniPath, originalValue }) {
      return patternDowngrade.restoreINIConfig(sshConfig, iniPath, originalValue)
    },

    /**
     * Complete 3-step downgrade process
     * @param {string} componentId - Component ID
     * @param {string} targetVersion - Target version
     * @param {string} updateServerUrl - Old version update server URL
     * @param {object} options - Additional options
     */
    downgradePattern({ componentId, targetVersion, updateServerUrl, options }) {
      return patternDowngrade.downgradePattern(
        sshConfig,
        componentId,
        targetVersion,
        updateServerUrl,
        options || {}
      )
    },

    // ==================== Existing Tasks ====================

    /**
     * Write to file (existing task)
     */
    writeToFile({ filename, content }) {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.join(__dirname, '..', '..', filename)
      fs.writeFileSync(filePath, content, 'utf8')
      return null
    },

    /**
     * Log message (existing task)
     */
    log(message) {
      console.log(message)
      return null
    }
  })
}

module.exports = registerTasks
