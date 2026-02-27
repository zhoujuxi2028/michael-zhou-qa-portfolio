/**
 * Custom Cypress Commands
 *
 * Interview Talking Points:
 * - Custom commands promote code reusability and test maintainability
 * - They encapsulate common operations used across multiple tests
 * - Make tests more readable and domain-specific
 */

/**
 * Example: Custom API request command with automatic retries
 * Usage: cy.apiRequest('GET', '/users/1')
 */
Cypress.Commands.add('apiRequest', (method, endpoint, body = null, options = {}) => {
  const baseUrl = Cypress.env('apiUrl') || 'https://jsonplaceholder.typicode.com'

  const requestOptions = {
    method,
    url: `${baseUrl}${endpoint}`,
    failOnStatusCode: false,
    ...options
  }

  if (body) {
    requestOptions.body = body
  }

  return cy.request(requestOptions)
})

/**
 * Example: Command to validate API response structure
 * Usage: cy.validateApiResponse(response, ['id', 'name', 'email'])
 */
Cypress.Commands.add('validateApiResponse', (response, requiredFields) => {
  expect(response.status).to.be.oneOf([200, 201])
  expect(response.body).to.exist

  requiredFields.forEach(field => {
    expect(response.body).to.have.property(field)
  })
})

/**
 * Example: Command to wait for API endpoint to be ready
 * Usage: cy.waitForApi('/health')
 */
Cypress.Commands.add('waitForApi', (endpoint, maxRetries = 5) => {
  const baseUrl = Cypress.env('apiUrl') || 'https://jsonplaceholder.typicode.com'

  const checkApi = (retriesLeft) => {
    cy.request({
      url: `${baseUrl}${endpoint}`,
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        cy.log(`API is ready at ${endpoint}`)
      } else if (retriesLeft > 0) {
        cy.wait(1000)
        checkApi(retriesLeft - 1)
      } else {
        throw new Error(`API not ready at ${endpoint} after ${maxRetries} retries`)
      }
    })
  }

  checkApi(maxRetries)
})

/**
 * Example: Command to log test metadata for debugging
 * Usage: cy.logTestInfo('Testing user login flow')
 */
Cypress.Commands.add('logTestInfo', (message) => {
  cy.log(`[TEST INFO] ${message}`)
  cy.log(`Environment: ${Cypress.env('environment') || 'default'}`)
  cy.log(`Browser: ${Cypress.browser.name}`)
  cy.log(`Viewport: ${Cypress.config('viewportWidth')}x${Cypress.config('viewportHeight')}`)
})

// Interview Point: "I use custom commands to standardize error handling across tests"
