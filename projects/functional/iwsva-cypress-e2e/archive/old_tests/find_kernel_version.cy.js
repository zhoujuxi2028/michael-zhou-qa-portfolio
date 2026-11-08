describe('查找内核版本 - System Updates', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'
  let csrfToken = null

  it('登录并访问 System Updates 查找内核版本', () => {
    // 步骤 1: 登录
    cy.log('=== 步骤 1: 登录系统 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)

    // 填写登录信息
    cy.get('input[type="text"]').first().clear().type('admin')
    cy.get('input[type="password"]').first().clear().type('111111')
    cy.log('✓ 已填写用户名和密码')

    // 提交登录表单
    cy.get('input[type="submit"], button[type="submit"]').first().click()
    cy.wait(3000)

    // 步骤 2: 提取 CSRF Token
    cy.log('=== 步骤 2: 提取 CSRF Token ===')
    cy.url().then((url) => {
      cy.log(`登录后 URL: ${url}`)

      const urlObj = new URL(url)
      csrfToken = urlObj.searchParams.get('CSRFGuardToken')

      if (csrfToken) {
        cy.log(`✓ 成功提取 CSRF Token: ${csrfToken}`)
      } else {
        cy.log('⚠️ 未找到 CSRF Token，尝试继续...')
      }
    })

    cy.screenshot('after-login-dashboard')

    // 步骤 3: 访问 System Updates 页面
    cy.log('=== 步骤 3: 访问 System Updates 页面 ===')

    // 尝试多种可能的 URL 路径
    const possibleUrls = [
      'admin_updates.jsp',
      'system_updates.jsp',
      'updates.jsp',
      'admin_patch_mgmt.jsp'
    ]

    // 首先尝试点击左侧菜单的 Updates 链接
    cy.get('body').then(($body) => {
      // 查找包含 "Updates" 或 "Update" 的链接
      const updateLinks = $body.find('a:contains("Update"), a:contains("update")')

      if (updateLinks.length > 0) {
        cy.log(`✓ 找到 ${updateLinks.length} 个包含 Update 的链接`)

        updateLinks.each((index, link) => {
          const href = Cypress.$(link).attr('href')
          const text = Cypress.$(link).text().trim()
          cy.log(`链接 ${index + 1}: "${text}" -> ${href}`)
        })

        // 点击第一个 Updates 相关链接
        cy.get('a:contains("Update")').first().click({ force: true })
        cy.wait(2000)

        cy.url().then((url) => {
          cy.log(`✓ 点击后的 URL: ${url}`)
        })
      } else {
        cy.log('⚠️ 未找到 Updates 菜单链接，尝试直接访问 URL')

        // 直接访问可能的 URL
        cy.url().then((currentUrl) => {
          const urlObj = new URL(currentUrl)
          const token = urlObj.searchParams.get('CSRFGuardToken')

          let targetUrl = `${baseUrl}/admin_updates.jsp`
          if (token) {
            targetUrl = `${targetUrl}?CSRFGuardToken=${token}`
          }

          cy.visit(targetUrl, { failOnStatusCode: false })
          cy.wait(2000)
        })
      }
    })

    cy.screenshot('system-updates-page')

    // 步骤 4: 查找内核版本
    cy.log('=== 步骤 4: 查找目标内核版本 ===')
    cy.log(`目标版本: ${targetKernelVersion}`)

    // 获取页面标题
    cy.title().then((title) => {
      cy.log(`页面标题: ${title}`)
    })

    // 获取当前 URL
    cy.url().then((url) => {
      cy.log(`当前 URL: ${url}`)
    })

    // 在整个页面中搜索内核版本
    cy.get('body').then(($body) => {
      const bodyText = $body.text()

      if (bodyText.includes(targetKernelVersion)) {
        cy.log(`✅ 找到目标内核版本: ${targetKernelVersion}`)

        // 查找包含该版本的具体元素
        cy.contains(targetKernelVersion).then(($el) => {
          cy.log('✓ 元素信息:', {
            'tag': $el.prop('tagName'),
            'class': $el.attr('class'),
            'id': $el.attr('id'),
            'text': $el.text().trim()
          })

          // 高亮显示该元素（可选）
          cy.wrap($el).scrollIntoView()
          cy.wrap($el).should('be.visible')
        })
      } else {
        cy.log(`⚠️ 未找到目标内核版本: ${targetKernelVersion}`)

        // 搜索任何包含 "kernel" 的文本
        if (bodyText.toLowerCase().includes('kernel')) {
          cy.log('✓ 页面包含 "kernel" 关键字')
        }

        // 搜索其他版本号模式
        const versionPattern = /\d+\.\d+\.\d+-\d+.*x86_64/g
        const foundVersions = bodyText.match(versionPattern)

        if (foundVersions && foundVersions.length > 0) {
          cy.log('✓ 找到以下版本号:')
          foundVersions.forEach((version, index) => {
            cy.log(`  ${index + 1}. ${version}`)
          })
        } else {
          cy.log('⚠️ 未找到任何版本号')
        }
      }
    })

    // 查找所有表格（版本信息可能在表格中）
    cy.get('table').then(($tables) => {
      if ($tables.length > 0) {
        cy.log(`✓ 找到 ${$tables.length} 个表格`)

        $tables.each((index, table) => {
          const $table = Cypress.$(table)
          const tableText = $table.text()

          if (tableText.includes(targetKernelVersion)) {
            cy.log(`✅ 在表格 ${index + 1} 中找到目标内核版本!`)
            cy.log('表格内容:', tableText.substring(0, 500))
          }
        })
      }
    })

    cy.screenshot('kernel-version-search-result', { capture: 'fullPage' })
  })

  it('详细分析 System Updates 页面结构', () => {
    // 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(3000)

    // 访问 Updates 页面
    cy.get('a:contains("Update")').first().click({ force: true })
    cy.wait(2000)

    cy.log('=== 分析页面内所有链接 ===')
    cy.get('a').then(($links) => {
      cy.log(`总共 ${$links.length} 个链接`)

      $links.each((index, link) => {
        const $link = Cypress.$(link)
        const text = $link.text().trim()
        const href = $link.attr('href')

        if (text && text.length > 0 && text.length < 100) {
          cy.log(`链接 ${index + 1}: "${text}" -> ${href}`)
        }
      })
    })

    cy.log('=== 分析所有按钮 ===')
    cy.get('button, input[type="submit"], input[type="button"]').then(($buttons) => {
      $buttons.each((index, button) => {
        const $button = Cypress.$(button)
        cy.log(`按钮 ${index + 1}:`, {
          'text': $button.text().trim() || $button.val(),
          'id': $button.attr('id'),
          'onclick': $button.attr('onclick')
        })
      })
    })

    cy.log('=== 页面所有文本内容 ===')
    cy.get('body').then(($body) => {
      const text = $body.text().trim()
      cy.log('页面文本（前 2000 字符）:')
      cy.log(text.substring(0, 2000))
    })

    cy.screenshot('updates-page-detailed-analysis', { capture: 'fullPage' })
  })
})
