describe('Example Test Suite', () => {
  beforeEach(() => {
    // Visit your application before each test
    cy.visit('/')
  })

  it('should load the homepage', () => {
    cy.url().should('include', '/')
  })

  it('example test placeholder', () => {
    cy.log('Add your tests here')
  })
})
