describe('点击 Updates 菜单', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('登录并点击 Updates 菜单项', () => {
    // 登录
    cy.log('=== 登录 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)

    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()

    cy.wait(5000)
    cy.log('✓ 登录完成')

    cy.screenshot('01-login-success')

    // 确保 Dashboard 已加载
    cy.url().should('include', 'index.jsp')

    // 使用多种方式查找 Updates 链接
    cy.log('=== 查找 Updates 菜单 ===')

    // 方法 1: 通过文本内容查找
    cy.get('body').then(($body) => {
      const bodyHtml = $body.html()

      // 打印部分HTML来帮助调试
      cy.log('Body HTML 片段:', bodyHtml.substring(0, 500))

      // 查找所有包含 "Updates" 文本的元素
      const updatesElements = $body.find(':contains("Updates")')
      cy.log(`找到 ${updatesElements.length} 个包含 "Updates" 的元素`)
    })

    // 方法 2: 等待并查找侧边栏中的链接
    cy.wait(2000)

    // 尝试查找左侧导航栏的容器
    cy.get('body').then(($body) => {
      // 查找所有可能的侧边栏容器
      const sidebarSelectors = [
        '.sidebar',
        '.menu',
        '.navigation',
        '#sidebar',
        '#menu',
        'nav',
        '[class*="nav"]',
        '[class*="side"]',
        '[id*="nav"]',
        '[id*="menu"]'
      ]

      let foundSidebar = false
      for (const selector of sidebarSelectors) {
        const $sidebar = $body.find(selector)
        if ($sidebar.length > 0) {
          cy.log(`✓ 找到侧边栏: ${selector}`)
          foundSidebar = true
          break
        }
      }

      if (!foundSidebar) {
        cy.log('⚠️ 未找到明显的侧边栏容器')
      }
    })

    // 方法 3: 直接点击包含 "Updates" 文本的可点击元素
    cy.get('body').within(() => {
      // 使用XPath或jQuery查找
      cy.get('*').filter(function() {
        return Cypress.$(this).text().trim() === 'Updates'
      }).first().then(($el) => {
        cy.log('找到 Updates 元素:', {
          tag: $el.prop('tagName'),
          text: $el.text(),
          html: $el.prop('outerHTML').substring(0, 200)
        })

        // 如果是链接，直接点击
        if ($el.prop('tagName') === 'A') {
          cy.wrap($el).click({ force: true })
        } else {
          // 查找父链接
          const $parent = $el.closest('a')
          if ($parent.length > 0) {
            cy.wrap($parent).click({ force: true })
          } else {
            // 直接点击元素
            cy.wrap($el).click({ force: true })
          }
        }
      })
    })

    cy.wait(4000)
    cy.log('✓ 已点击 Updates')

    cy.screenshot('02-after-click-updates')

    // 获取当前 URL
    cy.url().then((url) => {
      cy.log(`✅ Updates 页面 URL: ${url}`)

      const urlObj = new URL(url)
      cy.log(`  路径: ${urlObj.pathname}`)
      cy.log(`  查询参数: ${urlObj.search}`)
    })

    // 获取页面标题
    cy.title().then((title) => {
      cy.log(`页面标题: ${title}`)
    })

    // 查找内核版本
    cy.log(`=== 查找目标内核版本: ${targetKernelVersion} ===`)

    cy.get('body').then(($body) => {
      const bodyText = $body.text()

      if (bodyText.includes(targetKernelVersion)) {
        cy.log(`✅✅✅ 成功找到目标内核版本!`)
        cy.log(`内核版本: ${targetKernelVersion}`)

        // 定位元素
        cy.contains(targetKernelVersion).then(($el) => {
          cy.log('✓ 找到包含内核版本的元素')
          cy.wrap($el).scrollIntoView()
          cy.screenshot('03-kernel-found-highlighted')
        })
      } else {
        cy.log(`⚠️ 页面不包含目标内核版本`)
        cy.log('页面文本（前 1500 字符）:')
        cy.log(bodyText.substring(0, 1500))

        // 查找其他版本号
        const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
        const versions = bodyText.match(versionPattern)
        if (versions) {
          cy.log('✓ 找到以下版本:')
          versions.forEach(v => cy.log(`  - ${v}`))
        }
      }
    })

    cy.screenshot('04-final-page', { capture: 'fullPage' })
  })
})
