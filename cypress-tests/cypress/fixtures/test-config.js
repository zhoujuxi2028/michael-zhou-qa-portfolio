/**
 * Test Configuration
 *
 * Test-specific configuration constants and settings.
 * These values can be overridden via environment variables or cypress.env.json
 *
 * @module TestConfig
 */

const TestConfig = {
  // ==================== TIMEOUTS ====================

  timeouts: {
    // Page load timeouts
    pageLoad: 60000, // 60 seconds
    pageLoadShort: 30000, // 30 seconds
    pageLoadLong: 120000, // 2 minutes

    // Command timeouts
    defaultCommand: 10000, // 10 seconds
    elementVisible: 15000, // 15 seconds
    elementInteraction: 5000, // 5 seconds

    // Update operation timeouts (by component category)
    patternUpdate: 600000, // 10 minutes
    engineUpdate: 720000, // 12 minutes
    updateAll: 1800000, // 30 minutes
    rollback: 360000, // 6 minutes

    // Network timeouts
    apiRequest: 30000, // 30 seconds
    apiRequestLong: 60000, // 60 seconds
    downloadTimeout: 600000, // 10 minutes

    // Verification timeouts
    iniFileUpdate: 30000, // 30 seconds
    logFileUpdate: 20000, // 20 seconds
    serviceRestart: 60000, // 60 seconds
    lockFileRemoval: 30000, // 30 seconds
  },

  // ==================== RETRIES ====================

  retries: {
    // Test execution retries
    testRetries: 2, // Retry failed tests twice
    interactiveRetries: 0, // No retries in interactive mode

    // Operation retries
    updateRetry: 1, // Retry update once on failure
    apiRetry: 3, // Retry API calls 3 times
    loginRetry: 2, // Retry login twice

    // Verification retries
    verificationRetry: 5, // Retry verification checks
    pollInterval: 2000, // 2 seconds between retries
  },

  // ==================== URLS & PATHS ====================

  urls: {
    // Admin interface URLs (relative to baseUrl)
    loginPage: '/login.jsp',
    manualUpdatePage: '/jsp/manual_update.jsp',
    updateProgressPage: '/jsp/AU_Update.jsp',
    updateAllPage: '/jsp/AU_Update_All.jsp',
    schedulePage: '/jsp/update.jsp',
    proxyPage: '/jsp/update_proxy.jsp',

    // Frame URLs
    mainFrame: 'main',
    navFrame: 'nav',
    contentFrame: 'content',
  },

  paths: {
    // Backend file paths (on IWSVA server)
    iniFile: '/opt/trend/iwsva/intscan.ini',
    logFile: '/var/log/trend/iwsva/update.log',
    auditLog: '/var/log/trend/iwsva/audit.log',
    patternDir: '/opt/trend/iwsva/pattern/',
    engineDir: '/opt/trend/iwsva/engine/',
    backupDir: '/opt/trend/iwsva/backup/patterns/',
    lockFileDir: '/opt/trend/iwsva/',

    // Local report paths
    reportDir: 'reports/',
    screenshotDir: 'reports/screenshots/',
    videoDir: 'cypress/videos/',
    tempDir: 'cypress/temp/',
  },

  // ==================== TEST EXECUTION ====================

  execution: {
    // Browser settings
    browser: 'chrome',
    browserArgs: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    headless: true, // Run headless in CI

    // Video settings
    video: false, // Disable video by default (enable for debugging)
    videoCompression: 32,
    videoUploadOnPasses: false,

    // Screenshot settings
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,

    // Test isolation
    testIsolation: true,
    clearCookiesBetweenTests: true,
  },

  // ==================== VERIFICATION ====================

  verification: {
    // Verification levels
    verifyUI: true,
    verifyBackend: true,
    verifyLogs: true,
    verifyBusiness: true,

    // Backend verification methods
    sshEnabled: true, // Use SSH for backend verification
    sshHost: Cypress.env('sshHost') || '10.206.201.9',
    sshPort: Cypress.env('sshPort') || 22,

    // Log verification
    logTailLines: 100, // Number of log lines to check
    logSearchPattern: 'Update.*successful', // Success pattern regex

    // INI file verification
    iniEncoding: 'utf-8',
    iniParseOptions: {
      nativeType: true,
      keepQuotes: false,
    },
  },

  // ==================== DATA MANAGEMENT ====================

  data: {
    // Test data location
    fixturesDir: 'cypress/fixtures/',
    componentRegistry: 'cypress/fixtures/ComponentRegistry.js',
    testScenarios: 'cypress/fixtures/test-scenarios.json',
    testVersions: 'cypress/fixtures/component-test-versions.json',
    testUsers: 'cypress/fixtures/test-users.json',

    // Test data refresh
    refreshBeforeRun: false, // Refresh test data before each run
    cacheTestData: true, // Cache loaded test data
  },

  // ==================== REPORTING ====================

  reporting: {
    // Report formats
    formats: ['json', 'html', 'junit'],

    // Mochawesome reporter settings
    mochawesome: {
      reportDir: 'reports/mochawesome',
      overwrite: false,
      html: true,
      json: true,
      timestamp: 'yyyy-mm-dd_HH-MM-ss',
    },

    // JUnit reporter settings
    junit: {
      mochaFile: 'reports/junit/test-results-[hash].xml',
      toConsole: false,
      attachments: true,
    },

    // Dashboard reporting
    dashboardEnabled: false, // Enable Cypress Dashboard
    recordKey: Cypress.env('CYPRESS_RECORD_KEY'),
  },

  // ==================== PERFORMANCE ====================

  performance: {
    // Performance thresholds
    patternUpdateMax: 600000, // 10 minutes max
    engineUpdateMax: 720000, // 12 minutes max
    pageLoadMax: 5000, // 5 seconds max

    // Resource usage thresholds
    cpuUsageMax: 80, // 80% max CPU
    memoryUsageMax: 4096, // 4GB max memory

    // Monitoring
    enableMonitoring: true,
    monitorInterval: 5000, // 5 seconds
  },

  // ==================== ENVIRONMENT ====================

  environment: {
    // Current environment
    env: Cypress.env('testEnv') || 'test',

    // Environment-specific settings
    dev: {
      baseUrl: 'https://dev-iwsva.local:8443',
      strictMode: false,
    },
    test: {
      baseUrl: Cypress.env('baseUrl') || 'https://10.206.201.9:8443',
      strictMode: true,
    },
    staging: {
      baseUrl: 'https://staging-iwsva.local:8443',
      strictMode: true,
    },
  },

  // ==================== FEATURE FLAGS ====================

  features: {
    // Enable/disable features
    enableBusinessVerification: true,
    enablePerformanceMonitoring: true,
    enableLogVerification: true,
    enableBackendVerification: true,

    // Experimental features
    experimentalDataDrivenTests: true,
    experimentalParallelExecution: false,
    experimentalVisualRegression: false,
  },

  // ==================== SECURITY ====================

  security: {
    // SSL/TLS settings
    strictSSL: false, // Disable strict SSL for self-signed certs
    acceptInsecureCerts: true,

    // Authentication
    csrfProtection: true, // Handle CSRF tokens
    sessionTimeout: 1800000, // 30 minutes

    // Sensitive data
    maskSensitiveData: true, // Mask passwords in logs/screenshots
    sensitiveFields: ['password', 'token', 'secret', 'key'],
  },

  // ==================== DEBUG ====================

  debug: {
    // Debug mode
    enabled: Cypress.env('DEBUG') === 'true',
    verbose: false,

    // Logging
    logLevel: 'info', // info, debug, warn, error
    logCommands: true, // Log all Cypress commands
    logAPI: true, // Log API calls
    logVerification: true, // Log verification steps

    // Pause on failure
    pauseOnFailure: false,
    openDevTools: false,
  },
}

// Export configuration
module.exports = TestConfig

// For ES6 imports
export default TestConfig

// Helper function to get nested config values
TestConfig.get = function (path, defaultValue = null) {
  return path.split('.').reduce((obj, key) => {
    return obj && obj[key] !== undefined ? obj[key] : defaultValue
  }, this)
}

// Helper function to override config values
TestConfig.set = function (path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((obj, key) => {
    if (!obj[key]) obj[key] = {}
    return obj[key]
  }, this)
  target[lastKey] = value
}

// Helper to merge environment-specific config
TestConfig.mergeEnv = function (envName) {
  if (this.environment[envName]) {
    Object.assign(this, this.environment[envName])
  }
  return this
}
