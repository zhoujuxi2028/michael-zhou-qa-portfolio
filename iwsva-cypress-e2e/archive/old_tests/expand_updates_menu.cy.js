describe('展开 Updates 菜单并查找内核版本', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('展开 Updates 菜单并点击 System Updates', () => {
    // 登录
    cy.log('=== 步骤 1: 登录 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)
    cy.log('✓ 登录成功')

    cy.screenshot('01-logged-in')

    // 步骤 2: 点击 Updates 菜单旁边的 + 号来展开
    cy.log('=== 步骤 2: 展开 Updates 菜单 ===')

    cy.window().then((win) => {
      const doc = win.document

      // 查找 Updates 文本元素
      const allElements = doc.getElementsByTagName('*')
      let updatesElement = null

      for (let el of allElements) {
        if (el.textContent.trim() === 'Updates') {
          updatesElement = el
          cy.log('✓ 找到 Updates 元素')
          break
        }
      }

      if (updatesElement) {
        // 点击 Updates 或其附近的展开按钮
        updatesElement.click()
        cy.log('✓ 点击了 Updates')
      }
    })

    cy.wait(2000)
    cy.screenshot('02-after-click-updates')

    // 步骤 3: 查找展开后的子菜单项
    cy.log('=== 步骤 3: 查找子菜单项 ===')

    cy.window().then((win) => {
      const doc = win.document
      const allLinks = doc.getElementsByTagName('a')

      cy.log(`总共有 ${allLinks.length} 个链接`)

      const menuItems = []
      for (let link of allLinks) {
        const text = link.textContent.trim()
        const href = link.getAttribute('href')

        // 查找可能的子菜单项
        if (text && text.length > 0 && text.length < 50) {
          menuItems.push({ text, href })

          // 重点关注包含 "Update" 或 "System" 的项
          if (text.toLowerCase().includes('update') || text.toLowerCase().includes('system')) {
            cy.log(`⭐ 菜单项: "${text}" -> ${href}`)
          }
        }
      }

      // 查找 "System Updates" 或类似的链接
      let systemUpdatesLink = null
      for (let link of allLinks) {
        const text = link.textContent.trim()
        if (text.includes('System') && text.includes('Update')) {
          systemUpdatesLink = link
          cy.log(`✅ 找到 System Updates 链接: "${text}"`)
          break
        }
      }

      // 如果找到了，点击它
      if (systemUpdatesLink) {
        const href = systemUpdatesLink.getAttribute('href')
        cy.log(`点击: ${href}`)
        systemUpdatesLink.click()
      } else {
        cy.log('⚠️ 未找到 System Updates 链接')
        // 尝试查找"Notifications"（Updates下的另一个选项）
        for (let link of allLinks) {
          const text = link.textContent.trim()
          cy.log(`可用链接: "${text}"`)
        }
      }
    })

    cy.wait(4000)
    cy.screenshot('03-system-updates-page')

    // 步骤 4: 获取当前 URL
    cy.url().then((url) => {
      cy.log(`✅ 当前 URL: ${url}`)

      const urlObj = new URL(url)
      cy.log(`  路径: ${urlObj.pathname}`)
    })

    // 步骤 5: 查找内核版本
    cy.log(`=== 步骤 4: 查找目标内核版本 ${targetKernelVersion} ===`)

    cy.window().then((win) => {
      const doc = win.document
      const bodyText = doc.body ? doc.body.textContent : ''

      if (bodyText.includes(targetKernelVersion)) {
        cy.log(`✅✅✅ 成功找到目标内核版本: ${targetKernelVersion}`)
        cy.screenshot('04-kernel-version-found')
      } else {
        cy.log(`⚠️ 未找到目标内核版本`)
        cy.log('页面文本（前1500字符）:')
        cy.log(bodyText.substring(0, 1500))

        // 搜索其他版本号
        const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
        const versions = bodyText.match(versionPattern)
        if (versions) {
          cy.log('✓ 找到以下版本号:')
          versions.forEach((v, index) => {
            cy.log(`  ${index + 1}. ${v}`)
          })
        }
      }
    })

    cy.screenshot('05-final-page', { capture: 'fullPage' })
  })

  it('尝试直接通过 href 访问 System Updates', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)

    // 提取 CSRF Token
    cy.url().then((url) => {
      const csrfToken = new URL(url).searchParams.get('CSRFGuardToken')
      cy.log(`CSRF Token: ${csrfToken}`)

      // 尝试常见的 System Updates URL
      const possibleUrls = [
        `/admin_system_updates.jsp?CSRFGuardToken=${csrfToken}`,
        `/system_updates.jsp?CSRFGuardToken=${csrfToken}`,
        `/admin_updates_system.jsp?CSRFGuardToken=${csrfToken}`,
        `/updates/system.jsp?CSRFGuardToken=${csrfToken}`
      ]

      // 尝试第一个
      const testUrl = `${baseUrl}${possibleUrls[0]}`
      cy.log(`尝试访问: ${testUrl}`)
      cy.visit(testUrl, { failOnStatusCode: false })
      cy.wait(3000)

      cy.screenshot('direct-url-test')

      cy.window().then((win) => {
        const doc = win.document
        const bodyText = doc.body ? doc.body.textContent : ''

        if (bodyText.includes(targetKernelVersion)) {
          cy.log(`✅✅✅ 找到内核版本!`)
        } else if (bodyText.includes('404') || bodyText.includes('Not Found')) {
          cy.log('⚠️ 404 页面')
        } else {
          cy.log('页面内容:', bodyText.substring(0, 500))
        }
      })
    })
  })
})
