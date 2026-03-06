describe('查找内核版本 - 简化版', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('登录并导航到 Updates 页面', () => {
    // 登录
    cy.log('=== 登录 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)

    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()

    cy.wait(4000)
    cy.log('✓ 登录成功')

    // 确认已进入 Dashboard
    cy.url().should('include', 'index.jsp')
    cy.screenshot('01-after-login')

    // 提取 CSRF Token
    cy.url().then((url) => {
      const csrfToken = new URL(url).searchParams.get('CSRFGuardToken')
      cy.log(`CSRF Token: ${csrfToken}`)
    })

    // 查找并列出所有侧边栏链接
    cy.log('=== 查找侧边栏链接 ===')
    cy.get('a').each(($el) => {
      const text = $el.text().trim()
      const href = $el.attr('href')
      if (text.length > 0 && text.length < 50) {
        cy.log(`链接: "${text}" -> ${href}`)
      }
    })

    // 点击 Updates 链接 (使用多种选择器)
    cy.log('=== 点击 Updates 菜单 ===')

    // 尝试 1: 直接查找包含 "Updates" 文本的链接
    cy.contains('a', 'Updates').then(($link) => {
      const href = $link.attr('href')
      cy.log(`找到 Updates 链接: ${href}`)
      cy.wrap($link).click({ force: true })
    })

    cy.wait(4000)
    cy.screenshot('02-after-click-updates')

    // 获取当前URL
    cy.url().then((url) => {
      cy.log(`当前 URL: ${url}`)
    })

    // 获取页面标题
    cy.title().then((title) => {
      cy.log(`页面标题: ${title}`)
    })

    // 查找内核版本
    cy.log(`=== 查找目标内核版本: ${targetKernelVersion} ===`)

    cy.get('body', { timeout: 10000 }).should('exist').then(($body) => {
      const bodyText = $body.text()

      if (bodyText.includes(targetKernelVersion)) {
        cy.log(`✅✅✅ 成功找到目标内核版本: ${targetKernelVersion}`)

        // 尝试定位包含该版本的元素
        cy.contains(targetKernelVersion).then(($el) => {
          cy.log('✓ 找到包含内核版本的元素')
          cy.log('元素文本:', $el.text())
          cy.wrap($el).scrollIntoView()
          cy.screenshot('03-kernel-version-found')
        })
      } else {
        cy.log(`⚠️ 未找到目标内核版本: ${targetKernelVersion}`)
        cy.log('页面部分文本:', bodyText.substring(0, 1000))

        // 搜索其他版本号
        const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
        const foundVersions = bodyText.match(versionPattern)
        if (foundVersions) {
          cy.log('✓ 找到以下版本号:')
          foundVersions.forEach(v => cy.log(`  - ${v}`))
        }
      }
    })

    cy.screenshot('04-final-page', { capture: 'fullPage' })
  })

  it('直接访问可能的 Updates 页面 URL', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(3000)

    // 提取 CSRF Token
    let csrfToken = null
    cy.url().then((url) => {
      csrfToken = new URL(url).searchParams.get('CSRFGuardToken')
      cy.log(`CSRF Token: ${csrfToken}`)

      // 尝试访问各种可能的 URL
      const possibleUrls = [
        '/admin_updates.jsp',
        '/updates.jsp',
        '/system_updates.jsp',
        '/admin_patch_mgmt.jsp',
        '/admin_system_updates.jsp'
      ]

      // 尝试第一个 URL
      const targetUrl = `${baseUrl}${possibleUrls[0]}?CSRFGuardToken=${csrfToken}`
      cy.log(`尝试访问: ${targetUrl}`)
      cy.visit(targetUrl, { failOnStatusCode: false })
      cy.wait(3000)

      cy.url().then((newUrl) => {
        cy.log(`访问后的 URL: ${newUrl}`)
      })

      cy.title().then((title) => {
        cy.log(`页面标题: ${title}`)
      })

      // 查找内核版本
      cy.get('body').then(($body) => {
        const bodyText = $body.text()

        if (bodyText.includes(targetKernelVersion)) {
          cy.log(`✅✅✅ 找到目标内核版本!`)
        } else {
          cy.log('页面文本内容:', bodyText.substring(0, 500))
        }
      })

      cy.screenshot('direct-url-access', { capture: 'fullPage' })
    })
  })
})
