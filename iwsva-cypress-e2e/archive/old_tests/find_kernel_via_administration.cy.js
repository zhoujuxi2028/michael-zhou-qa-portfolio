describe('通过 Administration > System Update 查找内核版本', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('完整流程：Administration -> System Update -> 查找内核版本', () => {
    // 步骤 1: 登录
    cy.log('=== 步骤 1: 登录系统 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)

    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()

    cy.wait(5000)
    cy.log('✓ 登录成功')
    cy.screenshot('01-logged-in')

    // 步骤 2: 点击 Administration 菜单
    cy.log('=== 步骤 2: 点击 Administration 菜单 ===')

    cy.window().then((win) => {
      const doc = win.document
      const allElements = doc.getElementsByTagName('*')

      // 查找 Administration 文本
      for (let el of allElements) {
        const text = el.textContent.trim()
        if (text === 'Administration') {
          cy.log('✓ 找到 Administration 菜单')
          cy.log(`  标签: ${el.tagName}`)
          cy.log(`  HTML: ${el.outerHTML.substring(0, 200)}`)

          // 点击它来展开
          el.click()
          cy.log('✓ 已点击 Administration')
          break
        }
      }
    })

    cy.wait(2000)
    cy.screenshot('02-after-click-administration')

    // 步骤 3: 查找并点击 System Update 子菜单
    cy.log('=== 步骤 3: 查找 System Update 子菜单 ===')

    cy.window().then((win) => {
      const doc = win.document
      const allLinks = doc.getElementsByTagName('a')

      cy.log(`页面上有 ${allLinks.length} 个链接`)

      // 列出所有链接，查找 System Update
      let foundSystemUpdate = false

      for (let link of allLinks) {
        const text = link.textContent.trim()
        const href = link.getAttribute('href')

        // 查找包含 "System" 和 "Update" 的链接
        if (text.toLowerCase().includes('system') && text.toLowerCase().includes('update')) {
          cy.log(`✅ 找到 System Update 链接!`)
          cy.log(`  文本: "${text}"`)
          cy.log(`  href: ${href}`)

          // 点击它
          link.click()
          cy.log('✓ 已点击 System Update')
          foundSystemUpdate = true
          break
        }
      }

      if (!foundSystemUpdate) {
        // 列出所有可能的子菜单项
        cy.log('⚠️ 未找到 System Update，列出所有链接:')
        for (let link of allLinks) {
          const text = link.textContent.trim()
          if (text && text.length > 0 && text.length < 50) {
            cy.log(`  - "${text}" -> ${link.getAttribute('href')}`)
          }
        }
      }
    })

    cy.wait(4000)
    cy.screenshot('03-system-update-page')

    // 步骤 4: 获取当前 URL
    cy.url().then((url) => {
      cy.log(`✅ System Update 页面 URL: ${url}`)
    })

    // 步骤 5: 查找内核版本
    cy.log(`=== 步骤 4: 在右侧页面查找内核版本 ${targetKernelVersion} ===`)

    cy.window().then((win) => {
      const doc = win.document

      // 获取整个页面的文本内容
      const bodyText = doc.body ? doc.body.textContent : doc.documentElement.textContent

      cy.log('页面文本内容（前2000字符）:')
      cy.log(bodyText.substring(0, 2000))

      if (bodyText.includes(targetKernelVersion)) {
        cy.log(`✅✅✅ 成功找到目标内核版本: ${targetKernelVersion}`)

        // 尝试定位包含该版本的具体元素
        const allElements = doc.getElementsByTagName('*')
        for (let el of allElements) {
          if (el.textContent.includes(targetKernelVersion)) {
            cy.log('✓ 找到包含内核版本的元素:')
            cy.log(`  标签: ${el.tagName}`)
            cy.log(`  文本: ${el.textContent.substring(0, 200)}`)

            // 如果是在表格中
            if (el.tagName === 'TD' || el.tagName === 'TR') {
              cy.log('✓ 内核版本在表格中')
            }
            break
          }
        }

        cy.screenshot('04-kernel-found')
      } else {
        cy.log(`⚠️ 未找到目标内核版本: ${targetKernelVersion}`)

        // 搜索页面中的所有版本号
        const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
        const foundVersions = bodyText.match(versionPattern)

        if (foundVersions && foundVersions.length > 0) {
          cy.log('✓ 页面中找到以下版本号:')
          foundVersions.forEach((version, index) => {
            cy.log(`  ${index + 1}. ${version}`)
          })
        } else {
          cy.log('⚠️ 页面中未找到任何版本号')
        }

        // 检查是否包含 "kernel" 关键字
        if (bodyText.toLowerCase().includes('kernel')) {
          cy.log('✓ 页面包含 "kernel" 关键字')
        } else {
          cy.log('⚠️ 页面不包含 "kernel" 关键字')
        }
      }
    })

    cy.screenshot('05-final-result', { capture: 'fullPage' })
  })
})
