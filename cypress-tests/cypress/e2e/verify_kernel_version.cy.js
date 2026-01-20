describe('IWSVA Kernel Version Verification', () => {
  // Load credentials from environment variables (cypress.env.json)
  const baseUrl = Cypress.env('baseUrl') || 'https://10.206.201.9:8443'
  const targetKernelVersion = Cypress.env('targetKernelVersion') || '5.14.0-427.24.1.el9_4.x86_64'
  const credentials = {
    username: Cypress.env('username'),
    password: Cypress.env('password')
  }

  // Validate credentials are provided
  before(() => {
    if (!credentials.username || !credentials.password) {
      throw new Error('Credentials not found! Please create cypress.env.json with username and password.')
    }
  })

  // Helper function to get frame document
  const getFrameDoc = (frameName) => {
    return cy.window().then((win) => {
      const frame = win.document.querySelector(`frame[name="${frameName}"], iframe[name="${frameName}"]`)
      expect(frame, `${frameName} frame should exist`).to.exist
      const frameDoc = frame.contentDocument || frame.contentWindow.document
      expect(frameDoc, `${frameName} frame content should be accessible`).to.exist
      return frameDoc
    })
  }

  // Helper function to login
  const login = () => {
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type(credentials.username)
    cy.get('input[type="password"]').first().type(credentials.password)
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)
    cy.url().should('include', 'index.jsp')
  }

  // Helper function to navigate to System Updates
  const navigateToSystemUpdates = () => {
    // Click Administration in left frame
    getFrameDoc('left').then((leftDoc) => {
      const allElements = leftDoc.getElementsByTagName('*')
      for (let el of allElements) {
        if (el.textContent.trim() === 'Administration') {
          el.click()
          break
        }
      }
    })

    cy.wait(2000)

    // Click System Updates in left frame
    getFrameDoc('left').then((leftDoc) => {
      const allLinks = leftDoc.getElementsByTagName('a')
      let found = false
      for (let link of allLinks) {
        const text = link.textContent.trim().toLowerCase()
        if (text.includes('system') && text.includes('update')) {
          link.click()
          found = true
          break
        }
      }
      expect(found, 'System Updates link should exist').to.be.true
    })

    cy.wait(4000)
  }

  it('should find target kernel version', () => {
    login()
    navigateToSystemUpdates()

    // Verify kernel version in right frame
    getFrameDoc('right').then((rightDoc) => {
      expect(rightDoc.body, 'right frame body should exist').to.exist
      const rightText = rightDoc.body.textContent

      // Main assertion: page should contain target kernel version
      expect(rightText, `Page should contain kernel version ${targetKernelVersion}`)
        .to.include(targetKernelVersion)
    })

    cy.screenshot('kernel-version-verified', { capture: 'fullPage' })
  })

  it('should have correct page structure with 3 frames', () => {
    login()

    cy.window().then((win) => {
      const frames = win.document.querySelectorAll('frame, iframe')
      expect(frames.length, 'Should have 3 frames').to.equal(3)

      const frameNames = Array.from(frames).map(f => f.getAttribute('name'))
      expect(frameNames, 'Frame names should include tophead, left, right')
        .to.include.members(['tophead', 'left', 'right'])
    })
  })
})
