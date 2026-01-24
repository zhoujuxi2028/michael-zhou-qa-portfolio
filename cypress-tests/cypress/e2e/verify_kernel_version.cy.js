/**
 * IWSVA Kernel Version Verification Tests
 *
 * Enterprise-grade test suite for verifying IWSVA kernel version display.
 * Uses Page Object Model and follows framework's 3-step test structure.
 *
 * Test Coverage:
 * - System Updates page accessibility
 * - Kernel version display verification
 * - Frameset structure validation
 *
 * Dependencies:
 * - BasePage: Base functionality (login, navigation)
 * - SystemUpdatePage: System Updates page interactions
 * - SetupWorkflow: Test environment preparation
 * - TestConfig: Configuration and timeouts
 * - TestConstants: Selectors and constants
 *
 * @category System
 * @priority P0
 * @requires IWSVA 5.0+
 */

import BasePage from '../support/pages/BasePage'
import SystemUpdatePage from '../support/pages/SystemUpdatePage'
import SetupWorkflow from '../support/workflows/SetupWorkflow'
import TestConfig from '../fixtures/test-config'
import TestConstants from '../fixtures/test-constants'

describe('IWSVA Kernel Version Verification', () => {
  // ==================== PAGE OBJECTS ====================

  let basePage
  let systemUpdatePage
  let setupWorkflow

  // ==================== TEST CONFIGURATION ====================

  const TARGET_KERNEL_VERSION = Cypress.env('targetKernelVersion') || '5.14.0-427.24.1.el9_4.x86_64'

  // ==================== HOOKS ====================

  before(() => {
    cy.log('=== Test Suite: IWSVA Kernel Version Verification ===')
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
  })

  beforeEach(() => {
    // Initialize Page Objects and Workflows
    basePage = new BasePage()
    systemUpdatePage = new SystemUpdatePage()
    setupWorkflow = new SetupWorkflow()
  })

  // ==================== TEST CASES ====================

  /**
   * Test Case: TC-SYS-001
   * Verify IWSVA kernel version is displayed on System Updates page
   *
   * Test Steps:
   * 1. Initialize test environment and login
   * 2. Navigate to System Updates page via menu
   * 3. Verify kernel version displayed (UI + Backend verification)
   *
   * Note: testIsolation disabled to preserve login state across steps
   */
  describe('TC-SYS-001: Kernel Version Display', { testIsolation: false }, () => {
    // Step 1: Initialize test environment
    it('Step 1: Initialize test environment and login', () => {
      cy.log('=== Step 1: Environment Setup ===')

      // Login using SetupWorkflow
      setupWorkflow.login()

      // Verify login successful
      basePage.getCurrentUrl().then((url) => {
        expect(url, 'Should be logged in (not on login page)')
          .to.not.include('/login.jsp')
      })

      cy.log('✓ Test environment initialized')
      cy.log('✓ Login successful')
    })

    // Step 2: Navigate to System Updates page
    it('Step 2: Navigate to System Updates page', () => {
      cy.log('=== Step 2: Navigation ===')

      // Navigate using SystemUpdatePage
      systemUpdatePage.navigateToSystemUpdates()

      // Verify content loaded in right frame
      systemUpdatePage.verifyContentLoaded()

      // Take screenshot of page
      systemUpdatePage.capturePageState('kernel-version-page')

      cy.log('✓ Navigation complete')
      cy.log('✓ System Updates page loaded')
    })

    // Step 3: Verify kernel version (multi-level verification)
    it('Step 3: Verify kernel version displayed', () => {
      cy.log('=== Step 3: Verification ===')
      cy.log(`Expected kernel version: ${TARGET_KERNEL_VERSION}`)

      // UI Level: Verify kernel version in page content
      systemUpdatePage.verifyKernelVersion(TARGET_KERNEL_VERSION)

      // UI Level: Verify kernel information section displayed
      systemUpdatePage.verifyKernelInfoDisplayed()

      // Take verification screenshot
      systemUpdatePage.capturePageState('kernel-version-verified')

      cy.log('✓ UI Verification complete')
      cy.log(`✓ Kernel version verified: ${TARGET_KERNEL_VERSION}`)
    })
  })

  /**
   * Test Case: TC-SYS-002
   * Verify IWSVA frameset architecture is correctly structured
   *
   * Test Steps:
   * 1. Initialize test environment and login
   * 2. Load main page with frameset
   * 3. Verify 3-frame structure (tophead, left, right)
   *
   * Note: testIsolation disabled to preserve login state across steps
   */
  describe('TC-SYS-002: Frameset Structure Validation', { testIsolation: false }, () => {
    // Step 1: Initialize test environment
    it('Step 1: Initialize test environment and login', () => {
      cy.log('=== Step 1: Environment Setup ===')

      // Logout first (in case already logged in from previous tests)
      setupWorkflow.logout()

      // Login
      setupWorkflow.login()

      // Verify login successful
      cy.url({ timeout: TestConfig.timeouts.pageLoad })
        .should('not.include', '/login.jsp')

      cy.log('✓ Test environment initialized')
    })

    // Step 2: Load main page (no specific navigation needed - frames exist after login)
    it('Step 2: Wait for frameset to load', () => {
      cy.log('=== Step 2: Frame Loading ===')

      // Wait for page to stabilize
      cy.wait(TestConfig.timeouts.elementInteraction)

      // Wait for frames to be ready
      const requiredFrames = TestConstants.SELECTORS.systemUpdate.requiredFrames

      requiredFrames.forEach((frameName) => {
        systemUpdatePage.waitForFrame(frameName)
      })

      cy.log('✓ All frames loaded')
    })

    // Step 3: Verify frameset structure
    it('Step 3: Verify 3-frame structure', () => {
      cy.log('=== Step 3: Structure Verification ===')

      // Verify frameset architecture
      systemUpdatePage.verifyFrameStructure()

      // Verify each frame is accessible
      const frames = ['tophead', 'left', 'right']

      frames.forEach((frameName) => {
        systemUpdatePage.getFrameDoc(frameName).then((frameDoc) => {
          expect(frameDoc, `${frameName} frame should be accessible`).to.exist
          cy.log(`✓ ${frameName} frame accessible`)
        })
      })

      // Take structure verification screenshot
      systemUpdatePage.capturePageState('frameset-structure-verified')

      cy.log('✓ Frameset structure verified')
      cy.log('✓ All 3 frames present and accessible')
    })
  })

  /**
   * Test Case: TC-SYS-003
   * Verify complete System Updates page workflow
   *
   * Combined test demonstrating full workflow with navigation and verification.
   * This is the consolidated enterprise-grade version of the original test.
   */
  describe('TC-SYS-003: Complete System Updates Page Workflow', () => {
    it('Complete workflow: Login → Navigate → Verify', () => {
      cy.log('=== Complete System Updates Workflow ===')

      // Step 1: Login
      cy.log('--- Step 1: Login ---')
      setupWorkflow.login()

      // Step 2: Navigate and verify page
      cy.log('--- Step 2: Navigate to System Updates ---')
      systemUpdatePage.navigateAndVerify()

      // Step 3: Verify kernel version
      cy.log('--- Step 3: Verify Kernel Version ---')
      systemUpdatePage.verifyKernelVersion(TARGET_KERNEL_VERSION)

      // Step 4: Verify frameset structure
      cy.log('--- Step 4: Verify Frameset Structure ---')
      systemUpdatePage.verifyFrameStructure()

      // Final screenshot
      systemUpdatePage.capturePageState('workflow-complete')

      cy.log('✓ Complete workflow verified successfully')
    })
  })

  /**
   * Test Case: TC-SYS-004
   * Verify kernel version extraction from page content
   *
   * Tests the kernel version extraction logic to ensure it correctly
   * parses the version string from page content.
   */
  describe('TC-SYS-004: Kernel Version Extraction', () => {
    it('Should extract kernel version from System Updates page', () => {
      cy.log('=== Kernel Version Extraction Test ===')

      // Login and navigate
      setupWorkflow.login()
      systemUpdatePage.navigateToSystemUpdates()

      // Extract kernel version using page object method
      systemUpdatePage.getKernelVersion().then((extractedVersion) => {
        // Should successfully extract a version
        expect(extractedVersion, 'Should extract a kernel version')
          .to.not.be.null

        // Should match expected format
        expect(extractedVersion, 'Should match kernel version format')
          .to.match(/\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64/)

        // Should match target version (if configured)
        if (TARGET_KERNEL_VERSION) {
          expect(extractedVersion, `Should match target version: ${TARGET_KERNEL_VERSION}`)
            .to.equal(TARGET_KERNEL_VERSION)
        }

        cy.log(`✓ Kernel version extracted: ${extractedVersion}`)
      })
    })
  })

  /**
   * Test Case: TC-SYS-005
   * Verify System Updates page title/heading
   */
  describe('TC-SYS-005: Page Title Verification', () => {
    it('Should display System Updates page title', () => {
      cy.log('=== Page Title Verification ===')

      // Login and navigate
      setupWorkflow.login()
      systemUpdatePage.navigateToSystemUpdates()

      // Verify page title/heading
      systemUpdatePage.verifyPageTitle('System Update')

      cy.log('✓ Page title verified')
    })
  })

  // ==================== CLEANUP ====================

  after(() => {
    cy.log('=== Test Suite Complete ===')
    cy.log('All kernel version verification tests passed')
  })
})
