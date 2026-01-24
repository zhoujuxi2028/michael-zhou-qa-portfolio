/**
 * Normal Update Tests - ENG (Virus Scan Engine)
 *
 * Test ID: TC-UPDATE-007
 * Priority: P0 (Critical)
 * Component: ENG (Virus Scan Engine)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - Service restart verification
 * - Engine DLL verification
 * - Critical component validation
 */

import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - ENG (Virus Scan Engine)',
  NormalUpdateTestGenerator.generateTestSuite('ENG', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
