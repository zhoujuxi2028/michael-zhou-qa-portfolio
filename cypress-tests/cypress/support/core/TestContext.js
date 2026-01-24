/**
 * Enterprise Framework - Test Context Manager
 * Purpose: Manage shared state across test execution
 */

class TestContext {
  static context = new Map()

  static set(key, value) {
    this.context.set(key, value)
  }

  static get(key, defaultValue = null) {
    return this.context.has(key) ? this.context.get(key) : defaultValue
  }

  static has(key) {
    return this.context.has(key)
  }

  static clear() {
    this.context.clear()
  }

  static startTest(testName, testId) {
    this.clear()
    this.set('testName', testName)
    this.set('testId', testId)
    this.set('startTime', Date.now())
  }

  static endTest() {
    this.set('endTime', Date.now())
  }
}

export default TestContext
