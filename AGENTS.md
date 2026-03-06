# AGENTS.md - Guidance for AI Agents

This file provides guidance for AI coding agents (Claude, Cursor, Copilot, etc.) working in this repository.

## Project Overview

This is a Cypress E2E test automation project for Trend Micro IWSVA (InterScan Web Security Virtual Appliance). The project tests the Update Module with 77 automated test cases covering 9 components (6 patterns + 3 engines).

**Working directory**: `cypress-tests/`

---

## Build, Lint, and Test Commands

### Essential Setup

```bash
cd cypress-tests
npm install
cp cypress.env.json.example cypress.env.json  # Configure credentials
```

### Running Tests

```bash
# Run all tests (headless)
npm run cypress:run

# Run specific test file
npm test                           # Runs verify_kernel_version.cy.js

# Run with visible browser (headed mode)
npm run test:headed                # Firefox browser, specific spec
npx cypress run --spec "cypress/e2e/01-normal-update/all-components-normal-update.cy.js" --headed --browser firefox

# Run all tests in a directory
npx cypress run --spec "cypress/e2e/01-normal-update/*.cy.js"

# Run tests matching a pattern
npx cypress run --spec "cypress/e2e/**/*normal-update*.cy.js"

# Open Cypress Test Runner (interactive mode)
npm run cypress:open
npm run cypress:open -- --browser firefox  # With Firefox
```

### Single Test Execution

```bash
# Run one specific spec file
npx cypress run --spec "cypress/e2e/01-normal-update/all-components-normal-update.cy.js"

# Run a single test within a spec (Cypress CLI doesn't support this directly)
# Instead, use describe.only() or it.only() in the test file temporarily
```

---

## Code Style Guidelines

### Language and Environment

- **Language**: JavaScript (ES6+)
- **Module System**: ES Modules (`import`/`export`)
- **Test Framework**: Cypress 15.x with Mocha (`describe`/`it`)
- **Node version**: CommonJS (`"type": "commonjs"` in package.json)

### Imports and Module Organization

Follow the layered architecture pattern:

```
Test Layer (cypress/e2e/)
    ↓ imports
Workflow Layer (cypress/support/workflows/)
    ↓ orchestrates
Page Object Layer (cypress/support/pages/)
    ↓ uses
Data Layer (cypress/fixtures/)
```

Import path conventions:
```javascript
// Test files import from support
import ManualUpdatePage from '../../support/pages/ManualUpdatePage'
import UpdateWorkflow from '../../support/workflows/UpdateWorkflow'
import ComponentRegistry from '../../fixtures/ComponentRegistry'

// Support files import from fixtures
import ComponentRegistry from '../fixtures/ComponentRegistry'
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `manual-update-page.js`, `update-workflow.js` |
| Test specs | kebab-case with `.cy.js` suffix | `normal-update-tests.cy.js` |
| Classes | PascalCase | `class ManualUpdatePage {}` |
| Functions | camelCase | `function executeNormalUpdate()` |
| Constants | UPPER_SNAKE_CASE | `const MAX_TIMEOUT = 300000` |
| Cypress tests | Sentence case with describe/it | `describe('Normal Update', () => { it('should update component') })` |

### Formatting

- **Indentation**: 2 spaces (use editor config if available)
- **Semicolons**: Yes (Cypress/Node.js convention)
- **Quotes**: Single quotes for strings
- **Line length**: Soft limit 100 characters
- **Trailing commas**: In multiline objects/arrays

### File Header Comments

Test files should include a header comment describing purpose:

```javascript
/**
 * Normal Update Tests - All Components
 *
 * Consolidated test suite for all 9 components (6 patterns + 3 engines).
 * Tests are auto-generated from ComponentRegistry for easy maintenance.
 *
 * Components tested:
 * - Patterns (6): PTN, SPYWARE, BOT, ITP, ITE, ICRCAGENT
 * - Engines (3): ENG, ATSEENG, TMUFEENG
 */
```

### Type Handling

- No TypeScript - use JSDoc comments for complex types if needed
- Use Cypress's built-in type assertions (`should`, `expect`)
- Avoid `any` type - be explicit about expected types

### Error Handling

- Use Cypress retry logic (automatic wait/retry)
- Use `.should()` with callbacks for assertions that need retries
- Add meaningful error messages:
  ```javascript
  cy.get('.error-message', { timeout: 10000 })
    .should('exist')
    .and('contain', 'Update failed')
  ```
- Handle timeouts with component-specific values from ComponentRegistry

### Cypress Best Practices

1. **Never use `cy.wait()` with arbitrary numbers** - use proper waiting
2. **Always use Page Objects** for element interactions
3. **Use Workflows** for multi-step operations
4. **Access ComponentRegistry** for all component-specific data (timeouts, paths, etc.)
5. **Chain commands properly** - don't assign Cypress commands to variables

```javascript
// GOOD - Chain commands properly
cy.get('button').click()
cy.contains('Success').should('be.visible')

// BAD - Using cy.wait()
cy.wait(2000)  // Never do this

// BAD - Assigning to variables
const btn = cy.get('button')  // Wrong - cy commands don't return value
```

### Page Object Pattern

```javascript
// cypress/support/pages/ManualUpdatePage.js
class ManualUpdatePage {
  navigate() {
    cy.visit('/manuallist')
  }

  selectComponent(componentId) {
    cy.get(`[data-component="${componentId}"]`).click()
  }

  clickUpdate() {
    cy.get('#update-btn').click()
  }
}

export default new ManualUpdatePage()
```

### Test Structure Pattern

Follow the 3-step structure for update tests:

```javascript
describe('Normal Update - Component', () => {
  it('Step 1: Initialize test environment', () => {
    // Setup, create snapshots
  })

  it('Step 2: Trigger update operation', () => {
    // Select component, execute update
  })

  it('Step 3: Verify update completion', () => {
    // UI, backend, log verification
  })
})
```

### Multi-Level Verification

Tests should verify at multiple levels:
1. **UI Level** - Page displays correct version
2. **Backend Level** - INI files, pattern files, lock files
3. **Log Level** - Update logs show success
4. **Business Level** - Functionality works after update

---

## IWSVA-Specific Considerations

### Frameset Architecture

IWSVA uses a legacy frameset (not iframes). Access via `BasePage.getFrameDoc()`:

```javascript
import BasePage from '../../support/pages/BasePage'

const frameDoc = BasePage.getFrameDoc('right')
frameDoc.querySelector('.update-status')
```

### CSRF Tokens

- Login page requires NO explicit token
- After login, tokens are handled automatically via URL parameters
- Only extract tokens manually for direct `cy.request()` calls

### SSH Backend Operations

Use Cypress tasks for SSH operations:

```javascript
cy.task('sshExec', { command: '/usr/iwss/bin/getupdate INFO' })
cy.task('downgradePattern', { componentId: 'PTN', targetVersion: '6.593.00' })
```

---

## Configuration

### Environment Variables

Never commit `cypress.env.json` with real credentials. Use `cypress.env.json.example`:

```json
{
  "baseUrl": "https://10.206.201.9:8443",
  "username": "admin",
  "password": "111111",
  "ssh": {
    "host": "10.206.201.9",
    "port": 22,
    "username": "root",
    "password": "your-password"
  }
}
```

### Component Registry

`ComponentRegistry.js` is the **single source of truth** for component data:

```javascript
import ComponentRegistry from '../fixtures/ComponentRegistry'

const component = ComponentRegistry.getComponent('PTN')
const allPatterns = ComponentRegistry.getPatterns()
const p0Components = ComponentRegistry.getByPriority('P0')
```

---

## Git Workflow

### Commit Messages

Follow conventional commits:

```bash
git commit -m "feat: Add normal update tests for PTN component

- Add test suite with 11 test cases
- Verify UI, backend, and log levels

Closes #12"
```

### Branch Naming

- Feature: `feature/test-name`
- Bugfix: `fix/issue-description`
- Refactor: `refactor/component-name`

---

## Security

- Never commit credentials or secrets
- Use `.gitignore` for sensitive files
- Never log sensitive data in tests

---

## Documentation

Place new documentation in appropriate directories:
- `docs/guides/` - Technical how-to guides
- `docs/test-cases/` - Test specifications
- `docs/test-plans/` - Test plans and strategies
- `docs/reports/` - Test execution reports
