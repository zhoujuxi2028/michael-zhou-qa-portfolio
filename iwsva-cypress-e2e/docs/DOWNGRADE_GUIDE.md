# IWSVA Pattern Downgrade Guide

This guide explains how to downgrade IWSVA components (patterns and engines) using the automated downgrade system.

## Overview

The downgrade system implements a **3-step process** based on IWSVA's official downgrade procedure:

1. **Step 1**: Modify INI configuration (`/etc/iscan/intscan.ini`) to allow HTTP update server
2. **Step 2**: Execute downgrade command (`getupdate f<COMPONENT> <URL>`)
3. **Step 3**: Verify component version (`getupdate INFO`)

## Prerequisites

### 1. SSH Access

You need SSH access to the IWSVA server:
- Root or sudo privileges
- SSH credentials (password or private key)

### 2. Old Version Update Server

A web server hosting old component versions:
- Example: `http://10.204.151.56/au/IWSVA5.0/old/`
- Must be accessible from IWSVA server
- Must contain the target version files

### 3. Configuration

Update `cypress.env.json` with SSH credentials:

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "111111",
  "ssh": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root",
    "password": "your-ssh-password"
  },
  "downgrade": {
    "updateServerUrl": "http://10.204.151.56/au/IWSVA5.0/old/",
    "iniPath": "/etc/iscan/intscan.ini"
  }
}
```

**Security Note**: Never commit `cypress.env.json` with actual credentials.

## Usage

### Method 1: Complete Downgrade (Recommended)

Use the single `downgradePattern` task for a complete 3-step process:

```javascript
cy.task('downgradePattern', {
  componentId: 'PTN',
  targetVersion: '6.593.00',
  updateServerUrl: 'http://10.204.151.56/au/IWSVA5.0/old/',
  options: {
    iniPath: '/etc/iscan/intscan.ini',
    restoreINI: true  // Automatically restore INI after downgrade
  }
}).then((result) => {
  expect(result.success).to.be.true
  expect(result.actualVersion).to.equal('6.593.00')
  expect(result.verified).to.be.true
})
```

**Features:**
- ✅ Complete automation
- ✅ Automatic INI restoration
- ✅ Built-in verification
- ✅ Error handling with rollback

### Method 2: Step-by-Step Downgrade

Execute each step manually for more control:

```javascript
// Step 1: Modify INI configuration
cy.task('modifyINIConfig', {
  iniPath: '/etc/iscan/intscan.ini'
}).then((result) => {
  cy.log(`Original /use_ssl: ${result.originalValue}`)
})

// Step 2: Execute downgrade command
cy.task('executeDowngrade', {
  componentId: 'PTN',
  updateServerUrl: 'http://10.204.151.56/au/IWSVA5.0/old/'
}).then((result) => {
  cy.log(`Downgraded to: ${result.version}`)
})

// Step 3: Verify version
cy.task('verifyComponentVersion', {
  componentId: 'PTN',
  expectedVersion: '6.593.00'
}).then((result) => {
  expect(result.verified).to.be.true
})

// Step 4: Restore INI (important!)
cy.task('restoreINIConfig', {
  iniPath: '/etc/iscan/intscan.ini',
  originalValue: 'yes'
})
```

## Available Tasks

### Pattern Downgrade Tasks

#### `downgradePattern`

Complete 3-step downgrade process.

**Parameters:**
```javascript
{
  componentId: string,      // Component ID (e.g., 'PTN', 'SPYWARE')
  targetVersion: string,     // Target version (e.g., '6.593.00')
  updateServerUrl: string,   // Old version update server URL
  options: {
    iniPath: string,        // INI file path (default: '/etc/iscan/intscan.ini')
    restoreINI: boolean     // Auto-restore INI (default: true)
  }
}
```

**Returns:**
```javascript
{
  success: boolean,
  componentId: string,
  targetVersion: string,
  actualVersion: string,
  verified: boolean,
  steps: {
    modifyINI: object,
    downgrade: object,
    verify: object
  }
}
```

#### `modifyINIConfig`

Modify INI configuration to allow HTTP update server.

**Parameters:**
```javascript
{
  iniPath: string  // INI file path (optional)
}
```

**Returns:**
```javascript
{
  success: boolean,
  iniPath: string,
  originalValue: string,  // Original /use_ssl value
  newValue: string,       // New value ('no')
  backupPath: string      // Backup file path
}
```

#### `executeDowngrade`

Execute getupdate command to downgrade component.

**Parameters:**
```javascript
{
  componentId: string,       // Component ID
  updateServerUrl: string    // Update server URL
}
```

**Returns:**
```javascript
{
  success: boolean,
  componentId: string,
  version: string,    // New version
  output: string,     // Command output
  command: string     // Executed command
}
```

#### `verifyComponentVersion`

Verify component version using getupdate INFO.

**Parameters:**
```javascript
{
  componentId: string,         // Component ID
  expectedVersion: string      // Expected version (optional)
}
```

**Returns:**
```javascript
{
  success: boolean,
  verified: boolean,           // True if version matches expected
  componentId: string,
  actualVersion: string,
  expectedVersion: string,
  output: string              // getupdate INFO output
}
```

#### `restoreINIConfig`

Restore INI configuration to original state.

**Parameters:**
```javascript
{
  iniPath: string,        // INI file path (optional)
  originalValue: string   // Original /use_ssl value
}
```

**Returns:**
```javascript
{
  success: boolean,
  iniPath: string,
  restoredValue: string
}
```

### SSH Utility Tasks

#### `testSSHConnection`

Test SSH connection to IWSVA server.

**Returns:** `boolean`

#### `executeSSHCommand`

Execute arbitrary SSH command.

**Parameters:**
```javascript
{
  command: string  // Shell command to execute
}
```

**Returns:**
```javascript
{
  success: boolean,
  exitCode: number,
  stdout: string,
  stderr: string,
  command: string
}
```

#### `readRemoteFile`

Read remote file content via SSH.

**Parameters:**
```javascript
{
  filePath: string  // Remote file path
}
```

**Returns:** `string` (file content)

#### `writeRemoteFile`

Write content to remote file via SSH.

**Parameters:**
```javascript
{
  filePath: string,  // Remote file path
  content: string    // Content to write
}
```

**Returns:**
```javascript
{
  success: boolean,
  filePath: string,
  backupPath: string  // Backup file path
}
```

## Supported Components

### Patterns
- **PTN** - Virus Pattern
- **SPYWARE** - Spyware Pattern
- **BOT** - Bot Pattern
- **ITP** - IntelliTrap Pattern
- **ITE** - IntelliTrap Exception
- **ICRCAGENT** - Smart Scan Agent

### Engines
- **ENG** - Virus Scan Engine
- **ATSEENG** - ATSE Scan Engine
- **TMUFEENG** - URL Filtering Engine

**Note**: Component IDs are used in the getupdate command (e.g., `fPTN`, `fENG`).

## Example Test

Complete example test demonstrating downgrade usage:

```javascript
describe('PTN Downgrade Test', () => {
  const COMPONENT_ID = 'PTN'
  const TARGET_VERSION = '6.593.00'
  const UPDATE_SERVER_URL = 'http://10.204.151.56/au/IWSVA5.0/old/'

  it('should downgrade PTN to old version', () => {
    cy.task('downgradePattern', {
      componentId: COMPONENT_ID,
      targetVersion: TARGET_VERSION,
      updateServerUrl: UPDATE_SERVER_URL,
      options: { restoreINI: true }
    }).then((result) => {
      expect(result.success).to.be.true
      expect(result.actualVersion).to.equal(TARGET_VERSION)
      expect(result.verified).to.be.true

      cy.log('✓ PTN downgraded successfully')
      cy.log(`Version: ${result.actualVersion}`)
    })
  })
})
```

Run the test:
```bash
cd cypress-tests
npx cypress run --spec "cypress/e2e/examples/downgrade-ptn-example.cy.js"
```

## Files Modified

### Created Files
1. `cypress/tasks/sshClient.js` - SSH connection utilities
2. `cypress/tasks/patternDowngrade.js` - Downgrade task implementations
3. `cypress/tasks/index.js` - Task registration
4. `cypress/e2e/examples/downgrade-ptn-example.cy.js` - Example test

### Modified Files
1. `cypress.config.js` - Task registration
2. `cypress.env.json.example` - SSH configuration example

## Technical Details

### Step 1: INI Modification

**File**: `/etc/iscan/intscan.ini`

**Change**:
```ini
[registration]
/use_ssl = no  # Changed from 'yes' to 'no'
```

**Reason**: IWSVA checks AU (Automatic Update) server protocol. By default, HTTPS is required. Setting to 'no' allows HTTP update servers for old versions.

### Step 2: Downgrade Command

**Command Format**:
```bash
su iscan -c "/usr/iwss/bin/getupdate f<COMPONENT> <UPDATE_SERVER_URL>"
```

**Example**:
```bash
su iscan -c "/usr/iwss/bin/getupdate fPTN http://10.204.151.56/au/IWSVA5.0/old/"
```

**Expected Output**:
```
Virus Pattern forced update Successful (version 6.593.00)
```

**Explanation**:
- `su iscan -c` - Execute as 'iscan' user
- `/usr/iwss/bin/getupdate` - IWSVA update utility
- `f<COMPONENT>` - Force update flag (e.g., `fPTN`)
- `<UPDATE_SERVER_URL>` - HTTP server hosting old versions

### Step 3: Version Verification

**Command**:
```bash
/usr/iwss/bin/getupdate INFO
```

**Example Output**:
```
Virus Pattern   v6.593.00
Spyware Pattern v2.5.100
...
```

**Parsing**: Extract version number using regex matching.

## Troubleshooting

### SSH Connection Failed

**Error**: `Connection refused` or `Authentication failed`

**Solutions**:
1. Check SSH credentials in `cypress.env.json`
2. Verify SSH service is running on IWSVA server
3. Check firewall rules (port 22)
4. Test SSH manually: `ssh root@10.206.201.9`

### INI File Not Found

**Error**: `Failed to read file /etc/iscan/intscan.ini`

**Solutions**:
1. Verify file path (may be `/etc/iscan/initscan.ini` on some systems)
2. Check file permissions
3. Use SSH to manually verify: `ssh root@server "cat /etc/iscan/intscan.ini"`

### Downgrade Command Failed

**Error**: Downgrade output does not contain "Successful"

**Solutions**:
1. Check update server is accessible: `curl http://10.204.151.56/au/IWSVA5.0/old/`
2. Verify target version exists on update server
3. Check IWSVA logs: `/var/log/iscan/logserver.log`
4. Ensure no update is currently in progress (check lock files)

### Version Verification Failed

**Error**: Version not found in getupdate INFO output

**Solutions**:
1. Component name mismatch - check ComponentRegistry mapping
2. Run command manually to see actual output format
3. Update regex pattern in `verifyVersion()` if needed

### INI Restoration Failed

**Error**: Failed to restore original /use_ssl value

**Solutions**:
1. Restore manually from backup: `cp /etc/iscan/intscan.ini.backup /etc/iscan/intscan.ini`
2. Edit manually: `vi /etc/iscan/intscan.ini` and set `/use_ssl = yes`

## Security Considerations

1. **Credentials**: Never commit `cypress.env.json` with real credentials
2. **SSH Keys**: Use SSH keys instead of passwords when possible
3. **INI Restoration**: Always restore `/use_ssl = yes` after downgrade
4. **Backup**: INI file is automatically backed up before modification
5. **Audit**: All SSH commands are logged for audit trail

## Best Practices

1. **Always restore INI**: Use `restoreINI: true` option
2. **Verify version**: Always check verification result
3. **Error handling**: Wrap tasks in try-catch for error handling
4. **Test SSH first**: Use `testSSHConnection()` before running downgrade
5. **Sequential execution**: Don't run multiple downgrades in parallel
6. **Update server stability**: Ensure update server is always available

## Integration with Existing Tests

Use downgrade in test setup:

```javascript
describe('Normal Update - PTN', () => {
  before('Downgrade to old version', () => {
    cy.task('downgradePattern', {
      componentId: 'PTN',
      targetVersion: '6.593.00',
      updateServerUrl: Cypress.env('downgrade').updateServerUrl,
      options: { restoreINI: true }
    })
  })

  it('Step 1: Initialize test environment', () => {
    // Test setup...
  })

  it('Step 2: Trigger update', () => {
    // Execute update...
  })

  it('Step 3: Verify update', () => {
    // Verify new version...
  })
})
```

## Reference

### Component Name Mapping

| Component ID | Component Name | getupdate Command |
|--------------|----------------|-------------------|
| PTN | Virus Pattern | `fPTN` |
| SPYWARE | Spyware Pattern | `fSPYWARE` |
| BOT | Bot Pattern | `fBOT` |
| ITP | IntelliTrap Pattern | `fITP` |
| ITE | IntelliTrap Exception | `fITE` |
| ICRCAGENT | Smart Scan Agent | `fICRCAGENT` |
| ENG | Virus Scan Engine | `fENG` |
| ATSEENG | ATSE Scan Engine | `fATSEENG` |
| TMUFEENG | URL Filtering Engine | `fTMUFEENG` |

### File Locations

| File | Path | Purpose |
|------|------|---------|
| INI Config | `/etc/iscan/intscan.ini` | Main configuration |
| getupdate | `/usr/iwss/bin/getupdate` | Update utility |
| Patterns | `/opt/trend/iwsva/pattern/` | Pattern files |
| Engines | `/opt/trend/iwsva/engine/` | Engine binaries |
| Logs | `/var/log/iscan/` | IWSVA logs |

## Support

For issues or questions:
1. Check logs: `cypress/screenshots/` and `cypress/videos/`
2. Review IWSVA logs: `/var/log/iscan/logserver.log`
3. Refer to example test: `cypress/e2e/examples/downgrade-ptn-example.cy.js`
4. Check project documentation: `CLAUDE.md`, `README.md`

## Version History

- **v1.0.0** (2025-01-23) - Initial implementation
  - 3-step downgrade process
  - SSH task utilities
  - Complete automation with error handling
