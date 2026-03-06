describe('检查页面结构', () => {
  const baseUrl = 'https://10.206.201.9:8443'

  it('分析页面DOM结构', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)

    cy.screenshot('page-loaded')

    // 检查是否有 frameset
    cy.document().then((doc) => {
      const framesets = doc.querySelectorAll('frameset')
      cy.log(`找到 ${framesets.length} 个 frameset`)

      if (framesets.length > 0) {
        cy.log('✓ 页面使用 frameset 结构')
        framesets.forEach((frameset, index) => {
          cy.log(`Frameset ${index + 1}:`, frameset.outerHTML.substring(0, 200))
        })
      }
    })

    // 检查是否有 frame
    cy.document().then((doc) => {
      const frames = doc.querySelectorAll('frame')
      cy.log(`找到 ${frames.length} 个 frame`)

      if (frames.length > 0) {
        cy.log('✓ 页面包含 frame 元素')
        frames.forEach((frame, index) => {
          const name = frame.getAttribute('name')
          const src = frame.getAttribute('src')
          cy.log(`Frame ${index + 1}:`, { name, src })
        })
      }
    })

    // 检查是否有 iframe
    cy.document().then((doc) => {
      const iframes = doc.querySelectorAll('iframe')
      cy.log(`找到 ${iframes.length} 个 iframe`)

      if (iframes.length > 0) {
        cy.log('✓ 页面包含 iframe 元素')
        iframes.forEach((iframe, index) => {
          const name = iframe.getAttribute('name')
          const src = iframe.getAttribute('src')
          const id = iframe.getAttribute('id')
          cy.log(`iframe ${index + 1}:`, { name, id, src })
        })
      }
    })

    // 打印页面的 HTML 结构
    cy.document().then((doc) => {
      cy.log('=== 页面 HTML 结构 (前2000字符) ===')
      cy.log(doc.documentElement.outerHTML.substring(0, 2000))
    })
  })

  it('手动通过 JavaScript 点击 Updates', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)

    cy.log('=== 尝试通过 JavaScript 点击 Updates ===')

    cy.window().then((win) => {
      // 使用 JavaScript 查找并点击 Updates 链接
      const doc = win.document

      // 查找所有链接
      const allLinks = doc.getElementsByTagName('a')
      cy.log(`找到 ${allLinks.length} 个链接`)

      for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i]
        const text = link.textContent.trim()
        const href = link.getAttribute('href')

        if (text === 'Updates') {
          cy.log(`✅ 找到 Updates 链接: ${href}`)

          // 直接通过 JavaScript 点击
          link.click()
          cy.log('✓ 已通过 JavaScript 点击 Updates')
          break
        }
      }
    })

    cy.wait(4000)
    cy.screenshot('after-js-click')

    cy.url().then((url) => {
      cy.log(`当前 URL: ${url}`)
    })
  })
})
