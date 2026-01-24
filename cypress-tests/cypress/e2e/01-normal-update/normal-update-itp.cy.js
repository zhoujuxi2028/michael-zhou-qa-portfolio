/**
 * Normal Update Tests - ITP (IntelliTrap Pattern)
 *
 * Test ID: TC-UPDATE-004
 * Priority: P2
 * Component: ITP (IntelliTrap Pattern)
 *
 * Test Coverage:
 * - Normal update from previous version to current version
 * - IntelliTrap pattern file verification
 * - Multi-level verification
 */

import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update - ITP (IntelliTrap Pattern)',
  NormalUpdateTestGenerator.generateTestSuite('ITP', {
    captureScreenshots: true,
    verboseLogging: false
  })
)
