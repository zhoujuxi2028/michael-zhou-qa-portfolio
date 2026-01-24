/**
 * Normal Update Tests - ITE (IntelliTrap Exception)
 *
 * Test ID: TC-UPDATE-005
 * Priority: P2
 * Component: ITE (IntelliTrap Exception Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - IntelliTrap exception pattern file verification
 * - Multi-level verification
 */

import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - ITE (IntelliTrap Exception Pattern)',
  NormalUpdateTestGenerator.generateTestSuite('ITE', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
