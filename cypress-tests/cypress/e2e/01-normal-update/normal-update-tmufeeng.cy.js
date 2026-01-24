/**
 * Normal Update Tests - TMUFEENG (URL Filtering Engine)
 *
 * Test ID: TC-UPDATE-009
 * Priority: P1
 * Component: TMUFEENG (URL Filtering Engine)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Service restart verification
 * - IMPORTANT: Cannot rollback - update is permanent
 */

import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - TMUFEENG (URL Filtering Engine)',
  NormalUpdateTestGenerator.generateTestSuite('TMUFEENG', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
