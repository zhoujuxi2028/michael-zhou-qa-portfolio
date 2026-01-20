# Quick Reference

## Commands

```bash
npm run analyze      # Page analysis
npm run test:admin   # Run tests
npm run cypress:open # Interactive
```

## Login

```javascript
cy.loginWithCSRF('https://10.206.201.9:8443', 'admin', '111111')
```

## Visit Page

```javascript
cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')
```

## Get Token

```javascript
cy.extractCSRFTokenFromUrl().then((token) => {
  // use token
})
```

## Test Template

```javascript
describe('Test', () => {
  const baseUrl = 'https://10.206.201.9:8443'

  before(() => {
    cy.loginWithCSRF(baseUrl, 'admin', '111111')
  })

  it('works', () => {
    cy.visitWithCSRF(baseUrl, '/page.jsp')
    cy.contains('text').should('be.visible')
  })
})
```

## Manual Login

```javascript
cy.visit('https://10.206.201.9:8443/')
cy.get('input[type="text"]').first().type('admin')
cy.get('input[type="password"]').first().type('111111')
cy.get('input[type="submit"]').first().click()
cy.wait(2000)

cy.url().then((url) => {
  const token = new URL(url).searchParams.get('CSRFGuardToken')
})
```

## Key Points

- Visit `/` not `/index.jsp`
- Login page has NO CSRF token
- Token appears in URL after login
- Use `input[type="text"]` selector
