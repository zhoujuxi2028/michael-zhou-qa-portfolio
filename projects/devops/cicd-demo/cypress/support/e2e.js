/**
 * Cypress E2E Support File
 *
 * This file is processed before every E2E test file.
 * It's a great place to put global configuration and behavior.
 *
 * Interview Talking Points:
 * - Support files allow global test configuration
 * - Can set up hooks that run before/after all tests
 * - Import custom commands and plugins
 */

// Import custom commands
import './commands'

// Global before hook - runs once before all tests
before(() => {
  // Use console.log instead of cy.log in global hooks
  console.log('Starting test suite execution')
  console.log(`Environment: ${Cypress.env('environment') || 'default'}`)
})

// Global after hook - runs once after all tests
after(() => {
  // Use console.log instead of cy.log in global hooks
  console.log('Test suite execution completed')
})

// Before each test hook
beforeEach(() => {
  // Interview Point: "We clear cookies/storage before each test for isolation"
  cy.clearCookies()
  cy.clearLocalStorage()
})

// After each test hook
afterEach(function() {
  // Interview Point: "We take screenshots on failure for debugging"
  if (this.currentTest.state === 'failed') {
    cy.screenshot(`failed-${this.currentTest.title}`)
  }
})

// Uncaught exception handler
// Interview Point: "We handle expected exceptions to prevent test failures"
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the test from failing
  // Only if it's an expected error

  // Example: Ignore specific errors
  if (err.message.includes('ResizeObserver')) {
    return false
  }

  // Let other errors fail the test
  return true
})

// Custom console log to reduce noise in CI
if (Cypress.config('isInteractive') === false) {
  // Running in CI - suppress some console output
  console.log('Running in CI mode')
}

// Interview Point: "We configure global timeout handling for CI stability"
Cypress.config('defaultCommandTimeout', 10000)
Cypress.config('requestTimeout', 10000)
