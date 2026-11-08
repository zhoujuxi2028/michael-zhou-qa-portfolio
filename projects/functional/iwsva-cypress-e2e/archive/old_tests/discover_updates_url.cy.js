describe('发现 Updates 页面的正确 URL', () => {
  const baseUrl = 'https://10.206.201.9:8443'

  it('查找并记录所有菜单链接', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(4000)

    cy.screenshot('dashboard-loaded')

    // 等待页面完全加载
    cy.url().should('include', 'index.jsp')

    // 查找所有链接
    cy.log('=== 所有链接 ===')
    cy.get('a').then(($links) => {
      cy.log(`总共找到 ${$links.length} 个链接`)

      const linkInfo = []
      $links.each((index, link) => {
        const $link = Cypress.$(link)
        const text = $link.text().trim()
        const href = $link.attr('href')
        const id = $link.attr('id')
        const classes = $link.attr('class')

        if (text && text.length > 0) {
          const info = {
            index: index + 1,
            text: text,
            href: href,
            id: id,
            classes: classes
          }
          linkInfo.push(info)

          // 重点关注包含 "Update" 的链接
          if (text.toLowerCase().includes('update') || (href && href.toLowerCase().includes('update'))) {
            cy.log(`⭐ 找到 Updates 相关链接:`)
            cy.log(`  文本: "${text}"`)
            cy.log(`  href: ${href}`)
            cy.log(`  id: ${id}`)
            cy.log(`  classes: ${classes}`)
          }
        }
      })

      // 输出所有菜单项
      cy.log('=== 侧边栏菜单项 ===')
      linkInfo.slice(0, 20).forEach((info) => {
        if (info.text.length < 30) {
          cy.log(`${info.index}. "${info.text}" -> ${info.href}`)
        }
      })
    })

    // 特别查找 Updates 链接
    cy.log('=== 查找 Updates 链接 ===')
    cy.contains('Updates').then(($el) => {
      const tagName = $el.prop('tagName')
      const text = $el.text()
      const href = $el.attr('href')

      cy.log('✓ 找到 Updates 元素')
      cy.log(`  标签: ${tagName}`)
      cy.log(`  文本: ${text}`)
      cy.log(`  href: ${href}`)

      // 如果是链接，尝试提取 href
      if (tagName === 'A') {
        cy.log(`✅ Updates 链接的 href: ${href}`)
      } else {
        // 可能是在父元素中
        const parent = $el.parent('a')
        if (parent.length > 0) {
          const parentHref = parent.attr('href')
          cy.log(`✅ Updates 父链接的 href: ${parentHref}`)
        }
      }
    })
  })

  it('手动点击 Updates 并记录结果', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(4000)

    // 记录登录后的 URL
    cy.url().then((url) => {
      cy.log(`登录后的 URL: ${url}`)
    })

    // 找到并点击 Updates
    cy.log('=== 点击 Updates 链接 ===')
    cy.contains('Updates').click()
    cy.wait(3000)

    // 记录点击后的 URL
    cy.url().then((url) => {
      cy.log(`✅✅✅ 点击 Updates 后的 URL: ${url}`)

      // 解析 URL
      const urlObj = new URL(url)
      cy.log(`  路径: ${urlObj.pathname}`)
      cy.log(`  CSRF Token: ${urlObj.searchParams.get('CSRFGuardToken')}`)
    })

    // 记录页面标题
    cy.title().then((title) => {
      cy.log(`页面标题: ${title}`)
    })

    cy.screenshot('updates-page-loaded', { capture: 'fullPage' })

    // 检查页面内容
    cy.get('body').then(($body) => {
      const text = $body.text()
      cy.log('页面文本内容（前 1000 字符）:')
      cy.log(text.substring(0, 1000))

      // 查找是否包含 "System Updates" 或类似文本
      if (text.includes('System Updates') || text.includes('Update')) {
        cy.log('✓ 页面包含 Update 相关内容')
      }
    })
  })
})
