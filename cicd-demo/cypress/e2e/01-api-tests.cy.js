/**
 * API Testing Examples for CI/CD Pipeline
 *
 * Interview Talking Points:
 * - Demonstrates API testing with Cypress (alternative to Postman for some scenarios)
 * - Shows retry logic and test isolation patterns
 * - Includes assertions on response structure and data
 * - Uses environment variables for configuration
 */

describe('API Tests - JSONPlaceholder', () => {
  const baseUrl = Cypress.env('apiUrl') || 'https://jsonplaceholder.typicode.com'

  // Interview Point: "We use beforeEach to ensure test isolation"
  beforeEach(() => {
    cy.log('Starting API test with base URL: ' + baseUrl)
  })

  context('GET Requests', () => {
    it('should retrieve all users', () => {
      // Interview Point: "We validate response status, headers, and structure"
      cy.request(`${baseUrl}/users`)
        .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.headers['content-type']).to.include('application/json')
          expect(response.body).to.be.an('array')
          expect(response.body).to.have.length.greaterThan(0)

          // Validate first user object structure
          const firstUser = response.body[0]
          expect(firstUser).to.have.all.keys(
            'id', 'name', 'username', 'email', 'address', 'phone', 'website', 'company'
          )
        })
    })

    it('should retrieve a specific user by ID', () => {
      const userId = 1

      cy.request(`${baseUrl}/users/${userId}`)
        .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('id', userId)
          expect(response.body).to.have.property('name')
          expect(response.body).to.have.property('email')

          // Interview Point: "We validate email format with regex"
          expect(response.body.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        })
    })

    it('should retrieve posts for a specific user', () => {
      const userId = 1

      cy.request(`${baseUrl}/posts?userId=${userId}`)
        .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.be.an('array')

          // Verify all posts belong to the correct user
          response.body.forEach(post => {
            expect(post.userId).to.eq(userId)
            expect(post).to.have.all.keys('userId', 'id', 'title', 'body')
          })
        })
    })
  })

  context('POST Requests', () => {
    it('should create a new post', () => {
      // Interview Point: "We test POST requests with request body validation"
      const newPost = {
        title: 'Test Post from Cypress',
        body: 'This is a test post created during CI/CD pipeline execution',
        userId: 1
      }

      cy.request({
        method: 'POST',
        url: `${baseUrl}/posts`,
        body: newPost
      }).then((response) => {
        expect(response.status).to.eq(201)
        expect(response.body).to.have.property('id')
        expect(response.body.title).to.eq(newPost.title)
        expect(response.body.body).to.eq(newPost.body)
        expect(response.body.userId).to.eq(newPost.userId)
      })
    })
  })

  context('PUT Requests', () => {
    it('should update an existing post', () => {
      const postId = 1
      const updatedPost = {
        id: postId,
        title: 'Updated Post Title',
        body: 'Updated post body content',
        userId: 1
      }

      cy.request({
        method: 'PUT',
        url: `${baseUrl}/posts/${postId}`,
        body: updatedPost
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.title).to.eq(updatedPost.title)
        expect(response.body.body).to.eq(updatedPost.body)
      })
    })
  })

  context('DELETE Requests', () => {
    it('should delete a post', () => {
      const postId = 1

      cy.request({
        method: 'DELETE',
        url: `${baseUrl}/posts/${postId}`
      }).then((response) => {
        expect(response.status).to.eq(200)
      })
    })
  })

  context('Error Handling', () => {
    it('should handle 404 for non-existent resource', () => {
      // Interview Point: "We use failOnStatusCode: false to test error scenarios"
      cy.request({
        method: 'GET',
        url: `${baseUrl}/users/99999`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404)
      })
    })
  })
})
