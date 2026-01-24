/**
 * Normal Update Tests - All Components
 *
 * Consolidated test suite for all 9 components (6 patterns + 3 engines).
 * Tests are auto-generated from ComponentRegistry for easy maintenance.
 *
 * Components tested:
 * - Patterns (6): PTN, SPYWARE, BOT, ITP, ITE, ICRCAGENT
 * - Engines (3): ENG, ATSEENG, TMUFEENG
 *
 * Test structure: Each component runs through NormalUpdateTestGenerator
 * which creates 11-13 test cases covering UI, backend, logs, and business logic.
 *
 * Original test IDs:
 * - TC-UPDATE-001 (PTN), TC-UPDATE-002 (ENG), TC-UPDATE-003 (SPYWARE)
 * - TC-UPDATE-004 (BOT), TC-UPDATE-005 (ITP), TC-UPDATE-006 (ITE)
 * - TC-UPDATE-007 (ICRCAGENT), TC-UPDATE-008 (ATSEENG), TC-UPDATE-009 (TMUFEENG)
 *
 * All priorities: P0 (PTN, ENG), P1 (SPYWARE, BOT, ATSEENG, TMUFEENG), P2 (ITP, ITE, ICRCAGENT)
 */

import ComponentRegistry from '../../fixtures/ComponentRegistry'
import NormalUpdateTestGenerator from '../../support/test-generators/NormalUpdateTestGenerator'

describe('Normal Update Tests - All Components', function() {
  // Get all component IDs from registry
  const componentIds = ComponentRegistry.getComponentIds()

  // Log test suite info before running any tests
  before(function() {
    const count = ComponentRegistry.getCount()
    cy.log('========================================')
    cy.log('=== Normal Update - All Components ===')
    cy.log(`Total: ${count.total} components (${count.patterns} patterns + ${count.engines} engines)`)
    cy.log('========================================')
  })

  // Generate test suite for each component dynamically
  componentIds.forEach(componentId => {
    const component = ComponentRegistry.getComponent(componentId)

    describe(`${componentId} - ${component.name} (${component.priority})`,
      NormalUpdateTestGenerator.generateTestSuite(componentId, {
        captureScreenshots: true,
        verboseLogging: false
      })
    )
  })
})
