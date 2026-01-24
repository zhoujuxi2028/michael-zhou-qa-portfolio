/**
 * Normal Update Tests - SPYWARE (Spyware Pattern)
 *
 * Test ID: TC-UPDATE-002
 * Priority: P1
 * Component: SPYWARE (Spyware Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Spyware pattern file verification
 * - Multi-level verification
 */

import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - SPYWARE (Spyware Pattern)',
  NormalUpdateTestGenerator.generateTestSuite('SPYWARE', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
