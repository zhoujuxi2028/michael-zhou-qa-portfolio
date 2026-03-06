# Unit Testing Guide for Page Objects

**Purpose**: Guide for adding unit tests to Page Objects and framework code

**Framework**: IWSVA Cypress Test Framework

**Note**: Page Objects primarily tested through E2E tests, but unit tests can add value for utility methods and complex logic.

---

## Overview

### Why Unit Test Page Objects?

**Benefits**:
- ✅ **Fast feedback** - Unit tests run in milliseconds
- ✅ **Test edge cases** - Easy to test error conditions
- ✅ **Catch bugs early** - Before E2E tests
- ✅ **Document behavior** - Tests show how code should work
- ✅ **Refactor confidence** - Tests catch regressions

**Trade-offs**:
- ⚠️ **Mocking required** - Need to mock Cypress API
- ⚠️ **Limited value** - Most value comes from E2E tests
- ⚠️ **Maintenance cost** - More tests to maintain

**Recommendation**: Focus unit tests on:
- ✅ Utility methods and helpers
- ✅ Complex logic (regex, parsing, calculations)
- ✅ Error handling
- ❌ Skip simple Cypress wrappers

---

## What to Unit Test

### ✅ Good Candidates for Unit Tests

1. **Data extraction/parsing logic**
   ```javascript
   // SystemUpdatePage.js
   extractKernelVersion(content) {
     const pattern = /(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)/
     const match = content.match(pattern)
     return match ? match[1] : null
   }
   ```

2. **Validation logic**
   ```javascript
   isValidVersion(version) {
     return /^\d+\.\d+\.\d+$/.test(version)
   }
   ```

3. **Data transformation**
   ```javascript
   formatTimestamp(rawTimestamp) {
     // Convert format A to format B
     return formatted
   }
   ```

4. **Business logic calculations**
   ```javascript
   calculateTimeout(componentType) {
     return componentType === 'engine' ? 720000 : 600000
   }
   ```

### ❌ Poor Candidates for Unit Tests

1. **Simple Cypress wrappers**
   ```javascript
   // Don't unit test this - test via E2E instead
   clickButton() {
     cy.get(TestConstants.SELECTORS.button).click()
   }
   ```

2. **Navigation methods**
   ```javascript
   // E2E test is more valuable
   navigate() {
     this.visit(this.pageUrl)
   }
   ```

---

## Testing Strategy

### Approach 1: Extract Pure Functions (Recommended)

**Strategy**: Extract testable pure functions from Page Objects

**Example**:

**Before** (Hard to unit test):
```javascript
// SystemUpdatePage.js
class SystemUpdatePage {
  getKernelVersion() {
    return this.getRightFrameContent().then(content => {
      // This regex logic should be extracted
      const pattern = /(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)/
      const match = content.match(pattern)
      return match ? match[1] : null
    })
  }
}
```

**After** (Easy to unit test):
```javascript
// cypress/support/utils/VersionParser.js
export class VersionParser {
  static extractKernelVersion(content) {
    const pattern = /(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)/
    const match = content.match(pattern)
    return match ? match[1] : null
  }

  static isValidKernelVersion(version) {
    return /^\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64$/.test(version)
  }
}

// SystemUpdatePage.js (uses utility)
import { VersionParser } from '../utils/VersionParser'

class SystemUpdatePage {
  getKernelVersion() {
    return this.getRightFrameContent().then(content => {
      return VersionParser.extractKernelVersion(content)
    })
  }
}
```

**Unit Test** (Easy to write):
```javascript
// cypress/support/utils/VersionParser.spec.js
import { VersionParser } from './VersionParser'

describe('VersionParser', () => {
  describe('extractKernelVersion', () => {
    it('should extract valid kernel version', () => {
      const content = 'Kernel: 5.14.0-427.24.1.el9_4.x86_64'
      const result = VersionParser.extractKernelVersion(content)
      expect(result).to.equal('5.14.0-427.24.1.el9_4.x86_64')
    })

    it('should return null for invalid content', () => {
      const content = 'No kernel version here'
      const result = VersionParser.extractKernelVersion(content)
      expect(result).to.be.null
    })

    it('should handle multiple version formats', () => {
      const content = 'Version: 5.14.0-427.24.1.el9.4.x86_64'
      const result = VersionParser.extractKernelVersion(content)
      expect(result).to.equal('5.14.0-427.24.1.el9.4.x86_64')
    })
  })
})
```

---

### Approach 2: Mock Cypress API (Advanced)

**Strategy**: Mock Cypress commands for testing

**Example**:

```javascript
// SystemUpdatePage.spec.js
import SystemUpdatePage from './SystemUpdatePage'

describe('SystemUpdatePage', () => {
  let page
  let cyStub

  beforeEach(() => {
    // Mock Cypress API
    cyStub = {
      log: sinon.stub(),
      window: sinon.stub(),
      wrap: sinon.stub(),
    }

    // Inject mock
    global.cy = cyStub

    page = new SystemUpdatePage()
  })

  describe('getFrameDoc', () => {
    it('should throw error if frame not found', () => {
      cyStub.window.returns({
        then: (callback) => {
          const win = {
            document: {
              querySelector: () => null
            }
          }
          return callback(win)
        }
      })

      expect(() => page.getFrameDoc('nonexistent'))
        .to.throw("Frame 'nonexistent' not found")
    })
  })
})
```

**Note**: This approach is complex and often not worth the effort for Cypress code.

---

## Sample Unit Test Structure

### File Structure

```
cypress/
├── support/
│   ├── pages/
│   │   ├── SystemUpdatePage.js
│   │   └── __tests__/                    # Optional
│   │       └── SystemUpdatePage.spec.js
│   └── utils/
│       ├── VersionParser.js
│       └── __tests__/
│           └── VersionParser.spec.js     # Unit tests here
```

---

### Example: VersionParser Unit Tests

**File**: `cypress/support/utils/VersionParser.js`

```javascript
/**
 * Version Parser Utility
 *
 * Utilities for parsing and validating version strings.
 */

export class VersionParser {
  /**
   * Extract kernel version from text content
   * @param {string} content - Text content containing version
   * @returns {string|null} Kernel version or null if not found
   */
  static extractKernelVersion(content) {
    if (!content || typeof content !== 'string') {
      return null
    }

    const pattern = /(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)/
    const match = content.match(pattern)
    return match ? match[1] : null
  }

  /**
   * Validate kernel version format
   * @param {string} version - Version string to validate
   * @returns {boolean} True if valid format
   */
  static isValidKernelVersion(version) {
    if (!version || typeof version !== 'string') {
      return false
    }

    return /^\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64$/.test(version)
  }

  /**
   * Extract component version from text
   * @param {string} content - Text content
   * @returns {string|null} Component version or null
   */
  static extractComponentVersion(content) {
    if (!content || typeof content !== 'string') {
      return null
    }

    const pattern = /(\d+\.\d+\.\d+)/
    const match = content.match(pattern)
    return match ? match[1] : null
  }

  /**
   * Validate component version format
   * @param {string} version - Version string
   * @returns {boolean} True if valid
   */
  static isValidComponentVersion(version) {
    if (!version || typeof version !== 'string') {
      return false
    }

    return /^\d+\.\d+\.\d+$/.test(version)
  }
}
```

**File**: `cypress/support/utils/__tests__/VersionParser.spec.js`

```javascript
/**
 * VersionParser Unit Tests
 */

import { VersionParser } from '../VersionParser'

describe('VersionParser', () => {
  describe('extractKernelVersion', () => {
    it('should extract valid kernel version with underscore', () => {
      const content = 'Kernel: 5.14.0-427.24.1.el9_4.x86_64 running'
      const result = VersionParser.extractKernelVersion(content)

      expect(result).to.equal('5.14.0-427.24.1.el9_4.x86_64')
    })

    it('should extract valid kernel version with dot', () => {
      const content = 'Version is 5.14.0-427.24.1.el9.4.x86_64'
      const result = VersionParser.extractKernelVersion(content)

      expect(result).to.equal('5.14.0-427.24.1.el9.4.x86_64')
    })

    it('should return null for empty content', () => {
      expect(VersionParser.extractKernelVersion('')).to.be.null
      expect(VersionParser.extractKernelVersion(null)).to.be.null
      expect(VersionParser.extractKernelVersion(undefined)).to.be.null
    })

    it('should return null when no version found', () => {
      const content = 'No kernel information available'
      const result = VersionParser.extractKernelVersion(content)

      expect(result).to.be.null
    })

    it('should extract first version when multiple present', () => {
      const content = '5.14.0-427.24.1.el9_4.x86_64 and 5.15.0-100.1.1.el9_5.x86_64'
      const result = VersionParser.extractKernelVersion(content)

      expect(result).to.equal('5.14.0-427.24.1.el9_4.x86_64')
    })

    it('should handle non-string input', () => {
      expect(VersionParser.extractKernelVersion(123)).to.be.null
      expect(VersionParser.extractKernelVersion({})).to.be.null
      expect(VersionParser.extractKernelVersion([])).to.be.null
    })
  })

  describe('isValidKernelVersion', () => {
    it('should validate correct kernel version with underscore', () => {
      const version = '5.14.0-427.24.1.el9_4.x86_64'
      expect(VersionParser.isValidKernelVersion(version)).to.be.true
    })

    it('should validate correct kernel version with dot', () => {
      const version = '5.14.0-427.24.1.el9.4.x86_64'
      expect(VersionParser.isValidKernelVersion(version)).to.be.true
    })

    it('should reject invalid formats', () => {
      expect(VersionParser.isValidKernelVersion('invalid')).to.be.false
      expect(VersionParser.isValidKernelVersion('5.14.0')).to.be.false
      expect(VersionParser.isValidKernelVersion('5.14.0-427')).to.be.false
      expect(VersionParser.isValidKernelVersion('')).to.be.false
      expect(VersionParser.isValidKernelVersion(null)).to.be.false
    })

    it('should reject versions with missing components', () => {
      expect(VersionParser.isValidKernelVersion('5.14.0-427.24.1.x86_64')).to.be.false
      expect(VersionParser.isValidKernelVersion('5.14.0-427.24.1.el9_4')).to.be.false
    })
  })

  describe('extractComponentVersion', () => {
    it('should extract component version', () => {
      const content = 'Version: 18.501.00'
      const result = VersionParser.extractComponentVersion(content)

      expect(result).to.equal('18.501.00')
    })

    it('should extract first version number', () => {
      const content = 'PTN 6.593.00 updated to 18.501.00'
      const result = VersionParser.extractComponentVersion(content)

      expect(result).to.equal('6.593.00')
    })

    it('should return null for no version', () => {
      expect(VersionParser.extractComponentVersion('No version')).to.be.null
      expect(VersionParser.extractComponentVersion('')).to.be.null
      expect(VersionParser.extractComponentVersion(null)).to.be.null
    })
  })

  describe('isValidComponentVersion', () => {
    it('should validate correct component version', () => {
      expect(VersionParser.isValidComponentVersion('18.501.00')).to.be.true
      expect(VersionParser.isValidComponentVersion('6.593.00')).to.be.true
      expect(VersionParser.isValidComponentVersion('21.0.1235')).to.be.true
    })

    it('should reject invalid formats', () => {
      expect(VersionParser.isValidComponentVersion('invalid')).to.be.false
      expect(VersionParser.isValidComponentVersion('1.2')).to.be.false
      expect(VersionParser.isValidComponentVersion('1.2.3.4')).to.be.false
      expect(VersionParser.isValidComponentVersion('')).to.be.false
      expect(VersionParser.isValidComponentVersion(null)).to.be.false
    })
  })
})
```

---

## Running Unit Tests

### Setup Mocha/Chai for Unit Tests

```bash
# Install test dependencies
npm install --save-dev mocha chai

# Add to package.json
{
  "scripts": {
    "test:unit": "mocha 'cypress/support/**/*.spec.js'",
    "test:unit:watch": "mocha 'cypress/support/**/*.spec.js' --watch"
  }
}

# Run unit tests
npm run test:unit
```

### Expected Output

```
VersionParser
  extractKernelVersion
    ✓ should extract valid kernel version with underscore
    ✓ should extract valid kernel version with dot
    ✓ should return null for empty content
    ✓ should return null when no version found
    ✓ should extract first version when multiple present
    ✓ should handle non-string input
  isValidKernelVersion
    ✓ should validate correct kernel version with underscore
    ✓ should validate correct kernel version with dot
    ✓ should reject invalid formats
    ✓ should reject versions with missing components
  extractComponentVersion
    ✓ should extract component version
    ✓ should extract first version number
    ✓ should return null for no version
  isValidComponentVersion
    ✓ should validate correct component version
    ✓ should reject invalid formats

15 passing (25ms)
```

---

## Coverage Goals

### Recommended Coverage Targets

```
Utility Functions:  90-100% coverage
Business Logic:     80-90% coverage
Page Objects:       30-50% coverage (via E2E)
Workflows:          30-50% coverage (via E2E)
```

**Why lower coverage for Page Objects?**
- E2E tests provide real coverage
- Unit testing Page Objects requires extensive mocking
- E2E tests are more valuable for integration testing

---

## Best Practices

### ✅ DO

- ✅ Test pure functions
- ✅ Test edge cases
- ✅ Test error conditions
- ✅ Use descriptive test names
- ✅ Keep tests simple and focused
- ✅ Test one thing per test
- ✅ Use arrange-act-assert pattern

### ❌ DON'T

- ❌ Mock everything (overusing mocks)
- ❌ Test implementation details
- ❌ Write tests that duplicate E2E coverage
- ❌ Make tests dependent on each other
- ❌ Ignore failing tests
- ❌ Write overly complex test setups

---

## Testing Patterns

### Pattern: Arrange-Act-Assert (AAA)

```javascript
it('should extract kernel version', () => {
  // Arrange - Setup test data
  const content = 'Kernel: 5.14.0-427.24.1.el9_4.x86_64'

  // Act - Execute function
  const result = VersionParser.extractKernelVersion(content)

  // Assert - Verify outcome
  expect(result).to.equal('5.14.0-427.24.1.el9_4.x86_64')
})
```

### Pattern: Parametrized Tests

```javascript
describe('version validation', () => {
  const testCases = [
    { input: '5.14.0-427.24.1.el9_4.x86_64', expected: true },
    { input: '5.14.0-427.24.1.el9.4.x86_64', expected: true },
    { input: 'invalid', expected: false },
    { input: '', expected: false },
  ]

  testCases.forEach(({ input, expected }) => {
    it(`should return ${expected} for "${input}"`, () => {
      const result = VersionParser.isValidKernelVersion(input)
      expect(result).to.equal(expected)
    })
  })
})
```

---

## Recommendations

### For This Project

**Current State**:
- ✅ E2E tests cover Page Objects well
- ⏳ Could add utility function unit tests

**Recommendations**:

1. **Extract VersionParser utility** (Priority: Medium)
   - Extract kernel version parsing logic
   - Add comprehensive unit tests
   - Improves testability and reusability

2. **Add unit tests for any calculation logic** (Priority: Low)
   - If you add timeout calculations
   - If you add data transformations

3. **Focus on E2E tests for Page Objects** (Priority: High)
   - E2E tests are more valuable
   - Less mocking required
   - Tests real integration

**Conclusion**: Unit tests are **optional but beneficial** for this project. E2E tests provide excellent coverage already.

---

## Summary

### When to Write Unit Tests

✅ **Write unit tests for**:
- Pure functions (parsers, validators, calculators)
- Business logic
- Complex algorithms
- Edge cases and error handling

❌ **Skip unit tests for**:
- Simple Cypress wrappers
- Navigation methods
- UI interactions (test via E2E)

### Value Proposition

**Unit Tests**:
- ⚡ Fast (milliseconds)
- 🎯 Focused (one thing)
- 🔄 Easy to run frequently
- 📝 Document behavior

**E2E Tests**:
- 🔗 Test real integration
- 🌐 Test complete workflows
- ✅ Higher confidence
- 💯 Test user experience

**Best Approach**: **Combine both** - Unit tests for logic, E2E tests for workflows.

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-24
**Status**: ✅ Complete
