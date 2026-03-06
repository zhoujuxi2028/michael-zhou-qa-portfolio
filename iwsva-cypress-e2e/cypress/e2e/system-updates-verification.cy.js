/**
 * IWSVA System Updates Page Verification
 *
 * Optimized enterprise-grade test suite for verifying IWSVA kernel version display.
 * Uses Page Object Model and follows framework's best practices.
 *
 * Test Coverage:
 * - System Updates page accessibility
 * - Kernel version display verification (UI)
 * - Kernel version verification via SSH (Backend)
 * - Frameset structure validation
 * - Complete system information retrieval
 *
 * Verification Levels:
 * - UI Level: Page content verification
 * - Backend Level: SSH command execution (uname -r, cat /etc/os-release, uptime -p)
 *
 * Test Structure:
 * - TC-SYS-001: Page Display and Navigation (2 tests)
 * - TC-SYS-002: Kernel Version Verification (3 tests)
 * - TC-SYS-003: Frameset Architecture Validation (3 tests)
 *
 * Optimization Highlights:
 * - Single login per suite (before hook)
 * - Shared navigation (beforeEach hook)
 * - Consolidated SSH calls (4 → 2)
 * - Removed redundant tests
 * - Fixed testIsolation:false usage
 * - Proper cleanup (after hook)
 *
 * Dependencies:
 * - BasePage: Base functionality (login, navigation)
 * - SystemUpdatePage: System Updates page interactions
 * - SetupWorkflow: Test environment preparation
 * - BackendVerification: SSH-based backend verification
 * - TestConfig: Configuration and timeouts
 * - TestConstants: Selectors and constants
 *
 * @category System
 * @priority P0
 * @requires IWSVA 5.0+
 * @requires SSH access to IWSVA server (for backend verification)
 */

import BasePage from '../support/pages/BasePage'
import SystemUpdatePage from '../support/pages/SystemUpdatePage'
import SetupWorkflow from '../support/workflows/SetupWorkflow'
import BackendVerification from '../support/verification/BackendVerification'
import TestConfig from '../fixtures/test-config'
import TestConstants from '../fixtures/test-constants'

describe('IWSVA System Updates Page Verification', { testIsolation: false }, () => {
  // ==================== PAGE OBJECTS ====================

  let basePage
  let systemUpdatePage
  let setupWorkflow

  // ==================== TEST CONFIGURATION ====================

  const TARGET_KERNEL_VERSION = Cypress.env('targetKernelVersion') || '5.14.0-427.24.1.el9_4.x86_64'

  // ==================== SUITE SETUP ====================

  /**
   * Suite setup: Validate credentials and login once for all tests
   */
  before('Suite setup: Validate and login', () => {
    cy.log('=== IWSVA System Updates Verification ===')
    cy.log(`Target Kernel Version: ${TARGET_KERNEL_VERSION}`)

    // Validate credentials are configured
    const username = Cypress.env('username')
    const password = Cypress.env('password')

    if (!username || !password) {
      throw new Error(
        'Credentials not found! Please create cypress.env.json with username and password. ' +
        'Copy cypress.env.json.example and configure with actual credentials.'
      )
    }

    // Initialize Page Objects and Workflows
    basePage = new BasePage()
    systemUpdatePage = new SystemUpdatePage()
    setupWorkflow = new SetupWorkflow()

    // Login once, all tests share the session
    setupWorkflow.login()

    // Verify login successful
    basePage.getCurrentUrl().then((url) => {
      expect(url, 'Should be logged in (not on login page)')
        .to.not.include('/login.jsp')
    })

    cy.log('✓ Suite setup complete')
    cy.log('✓ Login successful')
  })

  /**
   * Suite cleanup: Logout and clear session
   */
  after('Suite cleanup', () => {
    cy.log('=== Suite Cleanup ===')

    if (setupWorkflow) {
      setupWorkflow.logout()
    }

    cy.clearCookies()
    cy.clearLocalStorage()

    cy.log('=== Test Suite Complete ===')
    cy.log('All kernel version verification tests passed')
  })


  /**
   * Capture failure state after each test
   */
  afterEach('Capture failure state', function() {
    if (this.currentTest.state === 'failed') {
      const testTitle = this.currentTest.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      cy.screenshot(`failure-${testTitle}`)
    }
  })

  // ==================== TEST CASES ====================

  /**
   * Test Case: TC-SYS-001
   * Page Display and Navigation
   *
   * Verifies System Updates page loads correctly and displays kernel information.
   * Consolidates page title verification and UI display checks.
   */
  describe('TC-SYS-001: Page Display and Navigation', () => {

    beforeEach('Navigate to System Updates', () => {
      systemUpdatePage.navigateToSystemUpdates()
      cy.wait(TestConfig.timeouts.elementInteraction)
    })

    it('Should load System Updates page with correct title', () => {
      cy.log('=== TC-SYS-001 Test 1: Page Load and Title ===')

      // Verify page loaded
      systemUpdatePage.verifyContentLoaded()

      // Verify page title (consolidated from TC-SYS-005)
      systemUpdatePage.verifyPageTitle('System Update')

      // Verify kernel info section exists
      systemUpdatePage.verifyKernelInfoDisplayed()

      // Take screenshot
      systemUpdatePage.capturePageState('page-loaded')

      cy.log('✓ Page loaded with correct title')
      cy.log('✓ Kernel info section displayed')
    })

    it('Should display kernel version on page', () => {
      cy.log('=== TC-SYS-001 Test 2: Kernel Version Display ===')
      cy.log(`Expected kernel version: ${TARGET_KERNEL_VERSION}`)

      // UI Level: Verify kernel version in page content
      systemUpdatePage.verifyKernelVersion(TARGET_KERNEL_VERSION)

      // Extract and validate kernel version (consolidated from TC-SYS-004)
      systemUpdatePage.getKernelVersion().then((extractedVersion) => {
        // Should successfully extract a version
        expect(extractedVersion, 'Should extract a kernel version')
          .to.not.be.null

        // Should match expected format
        expect(extractedVersion, 'Should match kernel version format')
          .to.match(/\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64/)

        // Should match target version
        expect(extractedVersion, `Should match target version: ${TARGET_KERNEL_VERSION}`)
          .to.equal(TARGET_KERNEL_VERSION)

        cy.log(`✓ Kernel version extracted: ${extractedVersion}`)
        cy.log(`✓ UI verification complete`)
      })
    })
  })

  /**
   * Test Case: TC-SYS-002
   * Kernel Version Verification
   *
   * Verifies kernel version extraction logic and backend verification via SSH.
   * Consolidates multiple SSH calls into efficient tests.
   */
  describe('TC-SYS-002: Kernel Version Verification', () => {

    // Navigate only for UI tests (Test 1 & 2)
    // Test 3 is backend-only (SSH) and doesn't need page navigation
    beforeEach('Navigate for UI tests', function() {
      const isBackendOnly = this.currentTest.title.includes('complete system information')

      if (!isBackendOnly) {
        systemUpdatePage.navigateToSystemUpdates()
        cy.wait(TestConfig.timeouts.elementInteraction)
      }
    })

    it('Should extract kernel version using regex', () => {
      cy.log('=== TC-SYS-002 Test 1: Regex Extraction ===')

      systemUpdatePage.getRightFrameContent().then((content) => {
        const kernelPattern = /(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)/
        const match = content.match(kernelPattern)

        expect(match, 'Should match kernel version pattern').to.not.be.null
        expect(match[1], 'Should extract correct version').to.equal(TARGET_KERNEL_VERSION)

        cy.log(`✓ Kernel version extracted via regex: ${match[1]}`)
      })
    })

    it('Should verify kernel version matches backend (SSH)', () => {
      cy.log('=== TC-SYS-002 Test 2: Backend Verification ===')
      cy.log(`Expected: ${TARGET_KERNEL_VERSION}`)

      // Backend verification via SSH (uname -r)
      BackendVerification.verifyKernelVersion(TARGET_KERNEL_VERSION, {
        strict: true
      }).then(check => {
        expect(check.passed, 'Backend kernel version should match').to.be.true
        expect(check.actual, 'Actual version should match expected').to.equal(TARGET_KERNEL_VERSION)

        cy.log(`✓ Backend: Kernel version = ${check.actual}`)
        cy.log(`✓ Command: ${check.command}`)
        cy.log(`✓ Source: ${check.source}`)
      })
    })

    it('Should retrieve complete system information (SSH)', () => {
      cy.log('=== TC-SYS-002 Test 3: Complete System Info ===')
      cy.log('Consolidated verification: kernel + OS + uptime')

      // Complete system info verification (consolidated from TC-SYS-006)
      // This replaces 4 separate tests with a single SSH session
      BackendVerification.verifySystemInfo(TARGET_KERNEL_VERSION).then(result => {
        // Verify all checks passed
        expect(result.passed, 'All system info checks should pass').to.be.true

        // Verify kernel version
        expect(result.kernelVersion, 'Kernel version should match')
          .to.equal(TARGET_KERNEL_VERSION)

        // Verify OS information exists
        expect(result.osName, 'OS name should exist').to.exist
        expect(result.osVersion, 'OS version should exist').to.exist

        // Verify system uptime check
        const uptimeCheck = result.checks.find(c => c.check === 'systemUptime')
        expect(uptimeCheck.passed, 'System uptime check should pass').to.be.true

        // Log all system information
        cy.log('=== System Information Retrieved ===')
        cy.log(`Kernel Version: ${result.kernelVersion}`)
        cy.log(`OS Name: ${result.osName}`)
        cy.log(`OS Version: ${result.osVersion}`)

        // Log individual check results
        result.checks.forEach(check => {
          cy.log(`✓ ${check.check}: ${check.passed ? 'PASSED' : 'FAILED'}`)
        })

        cy.log('✓ Complete system information verified')
        cy.log('✓ SSH calls optimized (4 tests → 1 test)')
      })
    })
  })

  /**
   * Test Case: TC-SYS-003
   * Frameset Architecture Validation
   *
   * Verifies IWSVA's legacy 3-frame structure and frame accessibility.
   * Uses TestConstants for frame names (fixes hardcoded values).
   */
  describe('TC-SYS-003: Frameset Architecture Validation', () => {

    beforeEach('Wait for frames to be ready', () => {
      // Wait for frames to stabilize after login
      cy.wait(TestConfig.timeouts.elementInteraction)
    })

    it('Should validate 3-frame structure', () => {
      cy.log('=== TC-SYS-003 Test 1: Frame Structure ===')

      // Verify frameset architecture
      systemUpdatePage.verifyFrameStructure()

      // Use TestConstants (fixes line 211 hardcoded values)
      const requiredFrames = TestConstants.SELECTORS.systemUpdate.requiredFrames

      cy.window().then((win) => {
        const frames = win.document.querySelectorAll('frame, iframe')
        expect(frames.length, '3-frame structure should exist').to.equal(3)

        const frameNames = Array.from(frames).map(f => f.getAttribute('name'))
        requiredFrames.forEach(frameName => {
          expect(frameNames, `${frameName} frame should exist`).to.include(frameName)
          cy.log(`✓ ${frameName} frame exists`)
        })
      })

      cy.log('✓ 3-frame structure validated')
    })

    it('Should access each frame and verify content', () => {
      cy.log('=== TC-SYS-003 Test 2: Frame Accessibility ===')

      const requiredFrames = TestConstants.SELECTORS.systemUpdate.requiredFrames

      requiredFrames.forEach((frameName) => {
        systemUpdatePage.getFrameDoc(frameName).then((frameDoc) => {
          expect(frameDoc, `${frameName} frame should be accessible`).to.exist
          expect(frameDoc.body, `${frameName} frame should have body`).to.exist

          cy.log(`✓ ${frameName} frame accessible`)
        })
      })

      cy.log('✓ All frames accessible')
    })

    it('Should verify frame navigation works correctly', () => {
      cy.log('=== TC-SYS-003 Test 3: Frame Navigation ===')

      // Verify left frame has navigation links
      systemUpdatePage.getFrameDoc('left').then((frameDoc) => {
        const links = frameDoc.getElementsByTagName('a')
        expect(links.length, 'Left frame should have navigation links')
          .to.be.greaterThan(0)

        cy.log(`✓ Left frame has ${links.length} navigation links`)
      })

      // Verify right frame has content
      systemUpdatePage.getRightFrameContent().then((content) => {
        expect(content.length, 'Right frame should have content')
          .to.be.greaterThan(100)

        cy.log(`✓ Right frame has content (${content.length} characters)`)
      })

      // Take final screenshot
      systemUpdatePage.capturePageState('frameset-verified')

      cy.log('✓ Frame navigation verified')
      cy.log('✓ Frameset architecture validation complete')
    })
  })
})
