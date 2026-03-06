/**
 * Component Registry
 *
 * Centralized configuration for all IWSVA update components.
 * This registry contains metadata for 9 components (6 patterns + 3 engines).
 *
 * Usage:
 *   import ComponentRegistry from '../fixtures/ComponentRegistry'
 *   const component = ComponentRegistry.getComponent('PTN')
 *   const allPatterns = ComponentRegistry.getPatterns()
 *
 * @module ComponentRegistry
 */

class ComponentRegistry {
  /**
   * Component metadata configuration
   * Each component contains:
   * - id: Unique component identifier
   * - name: Display name
   * - category: 'pattern' or 'engine'
   * - iniSection: INI file section name
   * - iniKey: Version key in INI file
   * - iniTimeKey: Timestamp key in INI file
   * - lockFile: Lock file name during update
   * - updateTimeout: Maximum update duration (ms)
   * - canRollback: Whether rollback is supported
   * - requiresRestart: Whether service restart is needed
   * - priority: Test priority (for scheduling)
   */
  static components = {
    // ==================== PATTERNS ====================

    PTN: {
      id: 'PTN',
      name: 'Virus Pattern',
      displayName: 'Virus Pattern',
      category: 'pattern',
      type: 'pattern',
      iniSection: 'Pattern-Update',
      iniKey: 'Version',
      iniTimeKey: 'Version_utime',
      lockFile: '.patupdate',
      lockPath: '/opt/trend/iwsva/.patupdate',
      patternPath: '/opt/trend/iwsva/pattern/',
      backupPath: '/opt/trend/iwsva/backup/patterns/',
      updateTimeout: 600000, // 10 minutes
      downloadTimeout: 480000, // 8 minutes
      canRollback: true,
      requiresRestart: false,
      requiresConfirmation: false,
      priority: 'P0', // Critical component
      testVersions: {
        old: '18.500.00',
        new: '18.501.00',
        rollback: '18.499.00'
      },
      description: 'Main virus pattern file for virus scanning',
      notes: 'Most critical pattern, updated daily'
    },

    SPYWARE: {
      id: 'SPYWARE',
      name: 'Spyware Pattern',
      displayName: 'Spyware Pattern',
      category: 'pattern',
      type: 'pattern',
      iniSection: 'Pattern-Update',
      iniKey: 'spywarever',
      iniTimeKey: 'spyware_utime',
      lockFile: '.spywareupdate',
      lockPath: '/opt/trend/iwsva/.spywareupdate',
      patternPath: '/opt/trend/iwsva/pattern/spyware/',
      backupPath: '/opt/trend/iwsva/backup/patterns/spyware/',
      updateTimeout: 480000, // 8 minutes
      downloadTimeout: 360000, // 6 minutes
      canRollback: true,
      requiresRestart: false,
      requiresConfirmation: false,
      priority: 'P1',
      testVersions: {
        old: '2.5.100',
        new: '2.5.101',
        rollback: '2.5.99'
      },
      description: 'Spyware detection pattern',
      notes: 'Updated regularly for spyware threats'
    },

    BOT: {
      id: 'BOT',
      name: 'Bot Pattern',
      displayName: 'Bot Pattern',
      category: 'pattern',
      type: 'pattern',
      iniSection: 'Pattern-Update',
      iniKey: 'botver',
      iniTimeKey: 'bot_utime',
      lockFile: '.botupdate',
      lockPath: '/opt/trend/iwsva/.botupdate',
      patternPath: '/opt/trend/iwsva/pattern/bot/',
      backupPath: '/opt/trend/iwsva/backup/patterns/bot/',
      updateTimeout: 420000, // 7 minutes
      downloadTimeout: 300000, // 5 minutes
      canRollback: true,
      requiresRestart: false,
      requiresConfirmation: false,
      priority: 'P1',
      testVersions: {
        old: '1.2.300',
        new: '1.2.301',
        rollback: '1.2.299'
      },
      description: 'Bot network detection pattern',
      notes: 'Detects botnet command and control'
    },

    ITP: {
      id: 'ITP',
      name: 'IntelliTrap Pattern',
      displayName: 'IntelliTrap Pattern',
      category: 'pattern',
      type: 'pattern',
      iniSection: 'Pattern-Update',
      iniKey: 'intellitrapver',
      iniTimeKey: 'intellitrap_utime',
      lockFile: '.itrappupdate',
      lockPath: '/opt/trend/iwsva/.itrappupdate',
      patternPath: '/opt/trend/iwsva/pattern/intellitrap/',
      backupPath: '/opt/trend/iwsva/backup/patterns/intellitrap/',
      updateTimeout: 420000, // 7 minutes
      downloadTimeout: 300000, // 5 minutes
      canRollback: true,
      requiresRestart: false,
      requiresConfirmation: false,
      priority: 'P2',
      testVersions: {
        old: '3.1.200',
        new: '3.1.201',
        rollback: '3.1.199'
      },
      description: 'IntelliTrap exception pattern',
      notes: 'Machine learning based detection'
    },

    ITE: {
      id: 'ITE',
      name: 'IntelliTrap Exception',
      displayName: 'IntelliTrap Exception Pattern',
      category: 'pattern',
      type: 'pattern',
      iniSection: 'Pattern-Update',
      iniKey: 'intellitrapexpver',
      iniTimeKey: 'intellitrapexp_utime',
      lockFile: '.itrapeupdate',
      lockPath: '/opt/trend/iwsva/.itrapeupdate',
      patternPath: '/opt/trend/iwsva/pattern/intellitrap_exception/',
      backupPath: '/opt/trend/iwsva/backup/patterns/intellitrap_exception/',
      updateTimeout: 360000, // 6 minutes
      downloadTimeout: 240000, // 4 minutes
      canRollback: true,
      requiresRestart: false,
      requiresConfirmation: false,
      priority: 'P2',
      testVersions: {
        old: '1.0.50',
        new: '1.0.51',
        rollback: '1.0.49'
      },
      description: 'IntelliTrap exception list',
      notes: 'Whitelist for IntelliTrap detections'
    },

    ICRCAGENT: {
      id: 'ICRCAGENT',
      name: 'Smart Scan Agent',
      displayName: 'Smart Scan Agent Pattern',
      category: 'pattern',
      type: 'pattern',
      iniSection: 'Pattern-Update',
      iniKey: 'icrcagent_ver',
      iniTimeKey: 'icrcagent_utime',
      lockFile: '.icrcagentupdate',
      lockPath: '/opt/trend/iwsva/.icrcagentupdate',
      patternPath: '/opt/trend/iwsva/pattern/icrc/',
      backupPath: '/opt/trend/iwsva/backup/patterns/icrc/',
      updateTimeout: 420000, // 7 minutes
      downloadTimeout: 300000, // 5 minutes
      canRollback: true,
      requiresRestart: false,
      requiresConfirmation: false,
      priority: 'P2',
      testVersions: {
        old: '2.0.100',
        new: '2.0.101',
        rollback: '2.0.99'
      },
      description: 'Smart Scan Agent pattern',
      notes: 'Cloud-assisted scanning patterns'
    },

    // ==================== ENGINES ====================

    ENG: {
      id: 'ENG',
      name: 'Virus Scan Engine',
      displayName: 'Virus Scan Engine',
      category: 'engine',
      type: 'engine',
      iniSection: 'Pattern-Update',
      iniKey: 'EngineVersion',
      iniTimeKey: 'Engine_utime',
      lockFile: '.engupdate',
      lockPath: '/opt/trend/iwsva/.engupdate',
      patternPath: '/opt/trend/iwsva/engine/',
      backupPath: '/opt/trend/iwsva/backup/engine/',
      updateTimeout: 720000, // 12 minutes
      downloadTimeout: 600000, // 10 minutes
      canRollback: true,
      requiresRestart: true, // Engine updates may require service restart
      requiresConfirmation: false,
      priority: 'P0', // Critical component
      serviceName: 'iws_scan',
      testVersions: {
        old: '21.0.1234',
        new: '21.0.1235',
        rollback: '21.0.1233'
      },
      description: 'Main virus scanning engine',
      notes: 'Critical engine, restart may be required'
    },

    ATSEENG: {
      id: 'ATSEENG',
      name: 'ATSE Scan Engine',
      displayName: 'ATSE Scan Engine',
      category: 'engine',
      type: 'engine',
      iniSection: 'Pattern-Update',
      iniKey: 'ATSEEngineVersion',
      iniTimeKey: 'ATSEEngine_utime',
      lockFile: '.atseupdate',
      lockPath: '/opt/trend/iwsva/.atseupdate',
      patternPath: '/opt/trend/iwsva/engine/atse/',
      backupPath: '/opt/trend/iwsva/backup/engine/atse/',
      updateTimeout: 600000, // 10 minutes
      downloadTimeout: 480000, // 8 minutes
      canRollback: true,
      requiresRestart: true,
      requiresConfirmation: false,
      priority: 'P1',
      serviceName: 'iws_atse',
      testVersions: {
        old: '4.5.600',
        new: '4.5.601',
        rollback: '4.5.599'
      },
      description: 'Advanced Threat Scan Engine',
      notes: 'Sandboxing and advanced analysis'
    },

    TMUFEENG: {
      id: 'TMUFEENG',
      name: 'URL Filtering Engine',
      displayName: 'URL Filtering Engine',
      category: 'engine',
      type: 'engine',
      iniSection: 'Pattern-Update',
      iniKey: 'url_eng_ver',
      iniTimeKey: 'url_eng_utime',
      lockFile: '.tmufeengineupdate',
      lockPath: '/opt/trend/iwsva/.tmufeengineupdate',
      patternPath: '/opt/trend/iwsva/engine/urlfilter/',
      backupPath: null, // No backup - cannot rollback
      updateTimeout: 600000, // 10 minutes
      downloadTimeout: 480000, // 8 minutes
      canRollback: false, // IMPORTANT: URL Filtering Engine cannot rollback
      requiresRestart: true,
      requiresConfirmation: false,
      priority: 'P1',
      serviceName: 'iws_urlfilter',
      testVersions: {
        old: '2.8.100',
        new: '2.8.101',
        rollback: null // N/A - cannot rollback
      },
      description: 'URL Filtering Engine',
      notes: 'IMPORTANT: Cannot rollback - update is permanent'
    }
  }

  /**
   * Get component by ID
   * @param {string} componentId - Component ID (e.g., 'PTN', 'ENG')
   * @returns {object|null} Component metadata or null if not found
   */
  static getComponent(componentId) {
    return this.components[componentId] || null
  }

  /**
   * Get all components
   * @returns {object} All components
   */
  static getAllComponents() {
    return this.components
  }

  /**
   * Get all pattern components
   * @returns {object} Pattern components only
   */
  static getPatterns() {
    return Object.fromEntries(
      Object.entries(this.components).filter(([_, comp]) => comp.category === 'pattern')
    )
  }

  /**
   * Get all engine components
   * @returns {object} Engine components only
   */
  static getEngines() {
    return Object.fromEntries(
      Object.entries(this.components).filter(([_, comp]) => comp.category === 'engine')
    )
  }

  /**
   * Get components by priority
   * @param {string} priority - Priority level (P0, P1, P2, P3)
   * @returns {object} Components with specified priority
   */
  static getByPriority(priority) {
    return Object.fromEntries(
      Object.entries(this.components).filter(([_, comp]) => comp.priority === priority)
    )
  }

  /**
   * Get components that can rollback
   * @returns {object} Components with rollback support
   */
  static getRollbackSupported() {
    return Object.fromEntries(
      Object.entries(this.components).filter(([_, comp]) => comp.canRollback)
    )
  }

  /**
   * Get components that cannot rollback
   * @returns {object} Components without rollback support
   */
  static getRollbackRestricted() {
    return Object.fromEntries(
      Object.entries(this.components).filter(([_, comp]) => !comp.canRollback)
    )
  }

  /**
   * Get components that require service restart
   * @returns {object} Components requiring restart
   */
  static getRequiresRestart() {
    return Object.fromEntries(
      Object.entries(this.components).filter(([_, comp]) => comp.requiresRestart)
    )
  }

  /**
   * Get component IDs as array
   * @returns {string[]} Array of component IDs
   */
  static getComponentIds() {
    return Object.keys(this.components)
  }

  /**
   * Get component display names
   * @returns {object} Mapping of ID to display name
   */
  static getDisplayNames() {
    return Object.fromEntries(
      Object.entries(this.components).map(([id, comp]) => [id, comp.displayName])
    )
  }

  /**
   * Validate component ID
   * @param {string} componentId - Component ID to validate
   * @returns {boolean} True if valid
   */
  static isValidComponent(componentId) {
    return componentId in this.components
  }

  /**
   * Get component count
   * @returns {object} Count by category
   */
  static getCount() {
    const patterns = Object.values(this.components).filter(c => c.category === 'pattern').length
    const engines = Object.values(this.components).filter(c => c.category === 'engine').length
    return {
      total: patterns + engines,
      patterns,
      engines
    }
  }
}

// Export for use in tests
module.exports = ComponentRegistry

// For ES6 imports
export default ComponentRegistry
