/**
 * Test Constants
 *
 * Reusable constants for IWSVA Update module testing.
 * Includes selectors, messages, status codes, and common values.
 *
 * @module TestConstants
 */

const TestConstants = {
  // ==================== UPDATE MODES ====================

  UPDATE_MODES: {
    NORMAL: 'NORMAL',
    FORCED: 'FORCED',
    ROLLBACK: 'ROLLBACK',
    UPDATE_ALL: 'UPDATE_ALL',
  },

  // ==================== COMPONENT CATEGORIES ====================

  CATEGORIES: {
    PATTERN: 'pattern',
    ENGINE: 'engine',
  },

  // ==================== UPDATE STATUS ====================

  UPDATE_STATUS: {
    IDLE: 'idle',
    CHECKING: 'checking',
    DOWNLOADING: 'downloading',
    INSTALLING: 'installing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    UP_TO_DATE: 'up_to_date',
  },

  // ==================== TEST PRIORITIES ====================

  PRIORITIES: {
    P0: 'P0', // Critical - must pass
    P1: 'P1', // High - important functionality
    P2: 'P2', // Medium - secondary features
    P3: 'P3', // Low - nice to have
  },

  // ==================== UI SELECTORS ====================

  SELECTORS: {
    // Login page
    login: {
      usernameInput: 'input[name="username"]',
      passwordInput: 'input[name="password"]',
      loginButton: 'input[type="submit"]',
      errorMessage: '.error-message',
    },

    // Manual Update page
    manualUpdate: {
      // Component radio buttons
      componentRadio: (componentId) => `input[name="UpdateType"][value="${componentId}"]`,
      selectedComponent: 'input[name="UpdateType"]:checked',

      // Action buttons
      updateButton: 'input[name="updatebtn"]',
      rollbackButton: 'input[name="rollbackbtn"]',
      updateAllButton: 'input[name="updateallbtn"]',
      refreshButton: 'input[name="refreshbtn"]',

      // Version display
      versionCell: (componentId) => `td[data-component="${componentId}"] .version`,
      timestampCell: (componentId) => `td[data-component="${componentId}"] .timestamp`,

      // Status indicators
      statusMessage: '#statusMessage',
      progressBar: '.progress-bar',
      updateStatus: '#updateStatus',

      // Table elements
      componentTable: 'table#componentTable',
      componentRow: (componentId) => `tr[data-component="${componentId}"]`,

      // Help and info
      helpIcon: '.help-icon',
      infoTooltip: '.tooltip',
    },

    // Update Progress page
    updateProgress: {
      progressBar: '#progressBar',
      statusText: '#statusText',
      percentage: '#percentage',
      backButton: 'input[value="Back"]',
      completionMessage: '.completion-message',
      errorMessage: '.error-message',
    },

    // Schedule page
    schedule: {
      enableCheckbox: 'input[name="enableSchedule"]',
      frequencySelect: 'select[name="frequency"]',
      timeInput: 'input[name="time"]',
      saveButton: 'input[name="save"]',
    },

    // Proxy page
    proxy: {
      enableCheckbox: 'input[name="enableProxy"]',
      serverInput: 'input[name="proxyServer"]',
      portInput: 'input[name="proxyPort"]',
      usernameInput: 'input[name="proxyUsername"]',
      passwordInput: 'input[name="proxyPassword"]',
      saveButton: 'input[name="save"]',
      testButton: 'input[name="test"]',
    },

    // Confirmation dialogs
    dialog: {
      confirmButton: 'button.confirm',
      cancelButton: 'button.cancel',
      closeButton: 'button.close',
      dialogMessage: '.dialog-message',
    },

    // Common elements
    common: {
      loadingSpinner: '.spinner',
      successMessage: '.success-message',
      errorMessage: '.error-message',
      warningMessage: '.warning-message',
      infoMessage: '.info-message',
    },
  },

  // ==================== EXPECTED MESSAGES ====================

  MESSAGES: {
    // Success messages
    success: {
      updateComplete: 'Update completed successfully',
      updateInProgress: 'Update is in progress',
      rollbackComplete: 'Rollback completed successfully',
      upToDate: 'already up-to-date',
      noUpdateAvailable: 'No update available',
    },

    // Error messages
    errors: {
      networkError: 'Unable to connect to update server',
      timeout: 'Update operation timed out',
      diskSpace: 'Insufficient disk space',
      permission: 'Permission denied',
      concurrent: 'Component is currently updating',
      noBackup: 'No backup version available',
      rollbackRestricted: 'cannot be rolled back',
      authFailed: 'Authentication failed',
      sessionExpired: 'Session has expired',
      invalidVersion: 'Invalid version',
      checksumMismatch: 'Checksum verification failed',
    },

    // Warning messages
    warnings: {
      restartRequired: 'Service restart required',
      backupNotFound: 'Backup version not found',
      updateInProgress: 'Update already in progress',
    },

    // Confirmation messages
    confirmations: {
      forcedUpdate: 'Force update even though already up-to-date?',
      rollback: 'Are you sure you want to rollback?',
      updateAll: 'Update all components?',
      cancel: 'Cancel the operation?',
    },
  },

  // ==================== HTTP STATUS CODES ====================

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TIMEOUT: 408,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  },

  // ==================== FILE PATTERNS ====================

  FILE_PATTERNS: {
    patternFile: /^lpt\$vpn\.\d+$/,
    engineFile: /^tmeng\.dll$/,
    lockFile: /^\.[a-z]+update$/,
    iniFile: /^intscan\.ini$/,
    logFile: /^update\.log$/,
    backupDir: /^backup_\d{8}_\d{6}$/,
  },

  // ==================== REGEX PATTERNS ====================

  REGEX: {
    // Version patterns
    patternVersion: /^\d+\.\d+\.\d+$/,
    engineVersion: /^\d+\.\d+\.\d+$/,

    // Log patterns
    logTimestamp: /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/,
    logSuccess: /Update.*successful/i,
    logError: /Error|Failed|Exception/i,

    // INI file patterns
    iniSection: /^\[([^\]]+)\]$/,
    iniKeyValue: /^([^=]+)=(.*)$/,

    // IP address
    ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,

    // File size
    fileSize: /^\d+(\.\d+)?\s*(B|KB|MB|GB)$/i,
  },

  // ==================== ERROR TYPES ====================

  ERROR_TYPES: {
    NETWORK: 'network',
    RESOURCE: 'resource',
    STATE: 'state',
    PERMISSION: 'permission',
    VALIDATION: 'validation',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown',
  },

  // ==================== INI FILE KEYS ====================

  INI_KEYS: {
    patterns: {
      PTN: { version: 'Version', time: 'Version_utime' },
      SPYWARE: { version: 'spywarever', time: 'spyware_utime' },
      BOT: { version: 'botver', time: 'bot_utime' },
      ITP: { version: 'intellitrapver', time: 'intellitrap_utime' },
      ITE: { version: 'intellitrapexpver', time: 'intellitrapexp_utime' },
      SPAM: { version: 'spam', time: 'spam_utime' },
      ICRCAGENT: { version: 'icrcagent_ver', time: 'icrcagent_utime' },
      TMSA: { version: 'tmsa_ver', time: 'tmsa_utime' },
      DPIPTN: { version: 'dpi_ptn_ver', time: 'dpi_ptn_utime' },
    },
    engines: {
      ENG: { version: 'EngineVersion', time: 'Engine_utime' },
      ATSEENG: { version: 'ATSEEngineVersion', time: 'ATSEEngine_utime' },
      TMUFEENG: { version: 'url_eng_ver', time: 'url_eng_utime' },
    },
    section: 'Pattern-Update',
  },

  // ==================== TIME FORMATS ====================

  TIME_FORMATS: {
    logTimestamp: 'YYYY-MM-DD HH:mm:ss',
    iniTimestamp: 'YYYY-MM-DD HH:mm:ss',
    displayTimestamp: 'MM/DD/YYYY hh:mm A',
    isoTimestamp: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  },

  // ==================== COMPONENT IDS ====================

  COMPONENT_IDS: {
    PATTERNS: ['PTN', 'SPYWARE', 'BOT', 'ITP', 'ITE', 'SPAM', 'ICRCAGENT', 'TMSA', 'DPIPTN'],
    ENGINES: ['ENG', 'ATSEENG', 'TMUFEENG'],
    ALL: ['PTN', 'SPYWARE', 'BOT', 'ITP', 'ITE', 'SPAM', 'ICRCAGENT', 'TMSA', 'DPIPTN', 'ENG', 'ATSEENG', 'TMUFEENG'],
    CRITICAL: ['PTN', 'ENG'], // P0 components
    ROLLBACK_RESTRICTED: ['TMUFEENG'], // Cannot rollback
    REQUIRES_RESTART: ['ENG', 'ATSEENG', 'TMUFEENG'], // Service restart needed
  },

  // ==================== TEST DATA ====================

  TEST_DATA: {
    defaultTimeout: 10000,
    updateTimeout: 600000,
    longTimeout: 1800000,

    sampleVersions: {
      pattern: '18.501.00',
      engine: '21.0.1235',
    },

    sampleTimestamps: {
      recent: '2025-01-22 10:30:00',
      old: '2025-01-20 08:00:00',
    },
  },

  // ==================== VERIFICATION KEYS ====================

  VERIFICATION: {
    levels: {
      UI: 'ui',
      BACKEND: 'backend',
      LOGS: 'logs',
      BUSINESS: 'business',
    },

    expectations: {
      versionChanged: true,
      timestampUpdated: true,
      lockFileRemoved: true,
      logEntryCreated: true,
      serviceRunning: true,
      noErrors: true,
    },
  },

  // ==================== PERFORMANCE THRESHOLDS ====================

  PERFORMANCE: {
    patternUpdateMax: 600, // 10 minutes in seconds
    engineUpdateMax: 720, // 12 minutes
    updateAllMax: 1800, // 30 minutes
    rollbackMax: 360, // 6 minutes

    pageLoadMax: 5, // 5 seconds
    apiCallMax: 10, // 10 seconds

    cpuMax: 80, // 80%
    memoryMax: 4096, // 4GB in MB
  },

  // ==================== API ENDPOINTS ====================

  API: {
    checkUpdate: '/api/update/check',
    performUpdate: '/api/update/perform',
    rollback: '/api/update/rollback',
    updateAll: '/api/update/all',
    getStatus: '/api/update/status',
    getVersion: '/api/update/version',
    getLog: '/api/update/log',
  },

  // ==================== COMMON VALUES ====================

  COMMON: {
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    refresh: 'Refresh',
    update: 'Update',
    rollback: 'Rollback',
  },
}

// Export constants
module.exports = TestConstants

// For ES6 imports
export default TestConstants

// Helper functions

/**
 * Get selector by path
 * @param {string} path - Dot-notation path (e.g., 'manualUpdate.updateButton')
 * @returns {string|function} Selector or selector function
 */
TestConstants.getSelector = function (path) {
  return path.split('.').reduce((obj, key) => obj[key], this.SELECTORS)
}

/**
 * Get message by path
 * @param {string} path - Dot-notation path (e.g., 'success.updateComplete')
 * @returns {string} Message text
 */
TestConstants.getMessage = function (path) {
  return path.split('.').reduce((obj, key) => obj[key], this.MESSAGES)
}

/**
 * Check if component requires restart
 * @param {string} componentId - Component ID
 * @returns {boolean} True if restart required
 */
TestConstants.requiresRestart = function (componentId) {
  return this.COMPONENT_IDS.REQUIRES_RESTART.includes(componentId)
}

/**
 * Check if component can rollback
 * @param {string} componentId - Component ID
 * @returns {boolean} True if rollback supported
 */
TestConstants.canRollback = function (componentId) {
  return !this.COMPONENT_IDS.ROLLBACK_RESTRICTED.includes(componentId)
}

/**
 * Check if component is critical (P0)
 * @param {string} componentId - Component ID
 * @returns {boolean} True if critical
 */
TestConstants.isCritical = function (componentId) {
  return this.COMPONENT_IDS.CRITICAL.includes(componentId)
}
