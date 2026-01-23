/**
 * SSH Client for IWSVA Operations
 *
 * Provides SSH connection and command execution for IWSVA server operations.
 * Used for component downgrade, version checking, and configuration updates.
 *
 * @module sshClient
 */

const { Client } = require('ssh2')
const fs = require('fs')

/**
 * Execute SSH command on IWSVA server
 * @param {object} config - SSH configuration
 * @param {string} config.host - Server host
 * @param {number} config.port - SSH port (default: 22)
 * @param {string} config.username - SSH username
 * @param {string} config.password - SSH password (optional)
 * @param {string} config.privateKey - SSH private key path (optional)
 * @param {string} command - Command to execute
 * @returns {Promise<object>} Command result
 */
function executeSSHCommand(config, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let output = ''
    let errorOutput = ''

    conn.on('ready', () => {
      console.log(`[SSH] Connected to ${config.host}`)
      console.log(`[SSH] Executing: ${command}`)

      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end()
          return reject(err)
        }

        stream.on('close', (code, signal) => {
          console.log(`[SSH] Command completed with code: ${code}`)
          conn.end()

          resolve({
            success: code === 0,
            exitCode: code,
            stdout: output,
            stderr: errorOutput,
            command: command
          })
        })

        stream.on('data', (data) => {
          const text = data.toString()
          output += text
          console.log(`[SSH] STDOUT: ${text}`)
        })

        stream.stderr.on('data', (data) => {
          const text = data.toString()
          errorOutput += text
          console.log(`[SSH] STDERR: ${text}`)
        })
      })
    })

    conn.on('error', (err) => {
      console.error(`[SSH] Connection error:`, err)
      reject(err)
    })

    // Prepare connection config
    const connectionConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username
    }

    // Use private key or password
    if (config.privateKey) {
      if (fs.existsSync(config.privateKey)) {
        connectionConfig.privateKey = fs.readFileSync(config.privateKey)
      } else {
        connectionConfig.privateKey = config.privateKey
      }
    } else if (config.password) {
      connectionConfig.password = config.password
    } else {
      return reject(new Error('SSH authentication requires either privateKey or password'))
    }

    conn.connect(connectionConfig)
  })
}

/**
 * Read file content via SSH
 * @param {object} config - SSH configuration
 * @param {string} filePath - Remote file path
 * @returns {Promise<string>} File content
 */
async function readRemoteFile(config, filePath) {
  const command = `cat "${filePath}"`
  const result = await executeSSHCommand(config, command)

  if (!result.success) {
    throw new Error(`Failed to read file ${filePath}: ${result.stderr}`)
  }

  return result.stdout
}

/**
 * Write content to remote file via SSH
 * @param {object} config - SSH configuration
 * @param {string} filePath - Remote file path
 * @param {string} content - Content to write
 * @returns {Promise<object>} Write result
 */
async function writeRemoteFile(config, filePath, content) {
  // Escape content for shell
  const escapedContent = content.replace(/'/g, "'\\''")

  // Create backup first
  const backupCommand = `cp "${filePath}" "${filePath}.backup"`
  await executeSSHCommand(config, backupCommand)

  // Write content
  const command = `echo '${escapedContent}' > "${filePath}"`
  const result = await executeSSHCommand(config, command)

  if (!result.success) {
    throw new Error(`Failed to write file ${filePath}: ${result.stderr}`)
  }

  return {
    success: true,
    filePath: filePath,
    backupPath: `${filePath}.backup`
  }
}

/**
 * Test SSH connection
 * @param {object} config - SSH configuration
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(config) {
  try {
    const result = await executeSSHCommand(config, 'echo "Connection test"')
    return result.success
  } catch (error) {
    console.error('[SSH] Connection test failed:', error)
    return false
  }
}

module.exports = {
  executeSSHCommand,
  readRemoteFile,
  writeRemoteFile,
  testConnection
}
