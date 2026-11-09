const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Base URL for the application under test
    baseUrl: 'https://jsonplaceholder.typicode.com',

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Video and screenshot settings for CI/CD
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',

    // Timeouts
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,

    // Retry configuration for CI/CD stability
    retries: {
      runMode: 2,      // Retry twice in CI
      openMode: 0      // No retries in interactive mode
    },

    // Test isolation
    testIsolation: true,

    // Reporter configuration for CI/CD
    reporter: 'spec',  // Simple built-in reporter (sufficient for demo)

    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config
    },

    // Environment-specific settings
    env: {
      apiUrl: 'https://jsonplaceholder.typicode.com',
      environment: 'staging'
    },

    // Spec pattern
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'
  }
})
