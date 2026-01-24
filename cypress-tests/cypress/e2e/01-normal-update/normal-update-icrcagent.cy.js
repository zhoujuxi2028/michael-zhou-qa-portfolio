/**
 * Normal Update Tests - ICRCAGENT (Smart Scan Agent)
 *
 * Test ID: TC-UPDATE-006
 * Priority: P2
 * Component: ICRCAGENT (Smart Scan Agent Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Smart Scan Agent pattern file verification
 * - Multi-level verification
 */

import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - ICRCAGENT (Smart Scan Agent Pattern)',
  NormalUpdateTestGenerator.generateTestSuite('ICRCAGENT', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
