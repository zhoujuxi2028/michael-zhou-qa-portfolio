/**
 * Pattern Downgrade Example
 *
 * This example demonstrates the 3-step pattern downgrade process:
 * Step 1: Modify update server configuration (intscan.ini)
 * Step 2: Execute downgrade command (getupdate)
 * Step 3: Verify version (getupdate INFO)
 *
 * Usage:
 *   npx cypress run --spec "cypress/e2e/examples/downgrade-ptn-example.cy.js"
 */

describe('Pattern Downgrade Example', () => {
  // Configuration
  const COMPONENT_ID = 'PTN'
  const TARGET_VERSION = '6.593.00'
  const UPDATE_SERVER_URL = 'http://10.204.151.56/au/IWSVA5.0/old/'
  const INI_PATH = '/etc/iscan/intscan.ini'

  before(() => {
    cy.log('========================================')
    cy.log('=== Pattern Downgrade Example ===')
    cy.log('========================================')
    cy.log(`Component: ${COMPONENT_ID}`)
    cy.log(`Target Version: ${TARGET_VERSION}`)
    cy.log(`Update Server: ${UPDATE_SERVER_URL}`)
  })

  describe('Method 1: Complete Downgrade (Single Task)', () => {
    it('should downgrade PTN using single task', () => {
      cy.task('downgradePattern', {
        componentId: COMPONENT_ID,
        targetVersion: TARGET_VERSION,
        updateServerUrl: UPDATE_SERVER_URL,
        options: {
          iniPath: INI_PATH,
          restoreINI: true // Automatically restore INI after downgrade
        }
      }).then((result) => {
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('componentId', COMPONENT_ID)
        expect(result).to.have.property('actualVersion', TARGET_VERSION)
        expect(result).to.have.property('verified', true)

        cy.log('✓ Complete downgrade successful')
        cy.log(`Version: ${result.actualVersion}`)
      })
    })
  })

  describe('Method 2: Step-by-Step Downgrade (Separate Tasks)', () => {
    let modifyResult

    it('Step 1: Modify INI configuration', () => {
      cy.task('modifyINIConfig', { iniPath: INI_PATH }).then((result) => {
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('newValue', 'no')

        modifyResult = result
        cy.log('✓ INI configuration modified')
        cy.log(`Original /use_ssl: ${result.originalValue}`)
        cy.log(`New /use_ssl: ${result.newValue}`)
      })
    })

    it('Step 2: Execute downgrade command', () => {
      cy.task('executeDowngrade', {
        componentId: COMPONENT_ID,
        updateServerUrl: UPDATE_SERVER_URL
      }).then((result) => {
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('componentId', COMPONENT_ID)
        expect(result).to.have.property('version')

        cy.log('✓ Downgrade command executed')
        cy.log(`New version: ${result.version}`)
        cy.log(`Output: ${result.output}`)
      })
    })

    it('Step 3: Verify component version', () => {
      cy.task('verifyComponentVersion', {
        componentId: COMPONENT_ID,
        expectedVersion: TARGET_VERSION
      }).then((result) => {
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('verified', true)
        expect(result).to.have.property('actualVersion', TARGET_VERSION)

        cy.log('✓ Version verified')
        cy.log(`Actual version: ${result.actualVersion}`)
        cy.log(`Expected version: ${result.expectedVersion}`)
      })
    })

    it('Step 4: Restore INI configuration', () => {
      cy.task('restoreINIConfig', {
        iniPath: INI_PATH,
        originalValue: modifyResult.originalValue
      }).then((result) => {
        expect(result).to.have.property('success', true)

        cy.log('✓ INI configuration restored')
        cy.log(`Restored /use_ssl: ${result.restoredValue}`)
      })
    })
  })

  describe('Utility Tasks', () => {
    it('should test SSH connection', () => {
      cy.task('testSSHConnection').then((connected) => {
        expect(connected).to.be.true
        cy.log('✓ SSH connection successful')
      })
    })

    it('should read remote INI file', () => {
      cy.task('readRemoteFile', { filePath: INI_PATH }).then((content) => {
        expect(content).to.be.a('string')
        expect(content).to.include('[registration]')

        cy.log('✓ INI file read successfully')
        cy.log(`Content length: ${content.length} bytes`)
      })
    })

    it('should execute SSH command', () => {
      cy.task('executeSSHCommand', {
        command: 'whoami'
      }).then((result) => {
        expect(result).to.have.property('success', true)
        expect(result).to.have.property('stdout')

        cy.log('✓ SSH command executed')
        cy.log(`Output: ${result.stdout.trim()}`)
      })
    })
  })
})
