describe('Page Analysis - 页面结构分析', () => {
  const baseUrl = 'https://10.206.201.9:8443'

  it('分析登录页面结构', () => {
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })

    // 等待页面加载
    cy.wait(2000)

    // 获取页面标题
    cy.title().then((title) => {
      cy.log('页面标题:', title)
    })

    // 检查URL
    cy.url().then((url) => {
      cy.log(`🌐 当前URL: ${url}`)
    })

    // ===== 重点：查找 CSRF Token =====
    cy.log('===== CSRF Token 分析 =====')
    cy.log('注意：根据已有脚本，登录页面可能没有 CSRF Token 字段')

    // 检查URL中的CSRF Token（查询参数）
    cy.url().then((url) => {
      const urlObj = new URL(url)
      const csrfFromUrl = urlObj.searchParams.get('CSRFGuardToken')

      if (csrfFromUrl) {
        cy.log(`🔑 URL中找到 CSRF Token: CSRFGuardToken = ${csrfFromUrl}`)
      } else {
        cy.log('⚠️ URL中未找到 CSRFGuardToken 参数（正常情况）')
      }

      // 记录URL中的所有查询参数
      const allParams = Array.from(urlObj.searchParams.entries())
      if (allParams.length > 0) {
        cy.log('🔗 URL查询参数:')
        allParams.forEach(([key, value]) => {
          cy.log(`  - ${key}: ${value}`)
        })
      }
    })

    // 尝试查找 CSRF token 字段（可能不存在）
    cy.get('body').then(($body) => {
      const $csrfInputs = $body.find('input[name="CSRFGuardToken"], input[name*="csrf"], input[name*="CSRF"], input[name*="token"]')

      if ($csrfInputs.length > 0) {
        cy.log(`🔑 找到 ${$csrfInputs.length} 个可能的 CSRF Token 字段`)
        $csrfInputs.each((index, el) => {
          const name = Cypress.$(el).attr('name')
          const value = Cypress.$(el).attr('value')
          const type = Cypress.$(el).attr('type')
          cy.log(`  字段 ${index + 1}: name=${name}, type=${type}, value=${value}`)
        })
      } else {
        cy.log('✓ 确认：登录页面没有 CSRF token 输入字段（符合预期）')
      }
    })

    // 检查 cookies
    cy.getCookies().then((cookies) => {
      cy.log('🍪 登录前的 Cookies:')
      cookies.forEach((cookie) => {
        cy.log(`  - ${cookie.name}: ${cookie.value}`)
      })
    })

    // 查找所有输入框（包括隐藏字段）
    cy.log('===== 所有输入框分析 =====')
    cy.get('input').each(($el, index) => {
      const type = $el.attr('type')
      const name = $el.attr('name')
      const id = $el.attr('id')
      const className = $el.attr('class')
      const placeholder = $el.attr('placeholder')
      const value = $el.attr('value')

      cy.log(`输入框 ${index + 1}:`)
      cy.log(`  - type: ${type}`)
      cy.log(`  - name: ${name}`)
      cy.log(`  - id: ${id}`)
      cy.log(`  - class: ${className}`)
      cy.log(`  - placeholder: ${placeholder}`)
      if (type === 'hidden') {
        cy.log(`  - value: ${value}`)
      }
    })

    // 查找所有按钮
    cy.get('button, input[type="submit"], input[type="button"]').each(($el, index) => {
      const text = $el.text()
      const value = $el.attr('value')
      const id = $el.attr('id')
      const className = $el.attr('class')

      cy.log(`按钮 ${index + 1}:`)
      cy.log(`  - text: ${text}`)
      cy.log(`  - value: ${value}`)
      cy.log(`  - id: ${id}`)
      cy.log(`  - class: ${className}`)
    })

    // 查找表单
    cy.get('form').each(($el, index) => {
      const action = $el.attr('action')
      const method = $el.attr('method')
      const id = $el.attr('id')

      cy.log(`表单 ${index + 1}:`)
      cy.log(`  - action: ${action}`)
      cy.log(`  - method: ${method}`)
      cy.log(`  - id: ${id}`)
    })

    // 截图保存登录页面
    cy.screenshot('login-page-analysis')
  })

  it('尝试登录并分析补丁管理页面', () => {
    // 步骤 1: 登录
    cy.log('=== 步骤 1: 登录系统 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)

    // 填写登录信息（使用与 find_kernel_version.cy.js 相同的方式）
    cy.get('input[type="text"]').first().clear().type('admin')
    cy.get('input[type="password"]').first().clear().type('111111')
    cy.log('✓ 已填写用户名和密码')

    // 提交表单
    cy.get('input[type="submit"], button[type="submit"]').first().click()

    // 步骤 2: 等待登录完成并提取 CSRF Token
    cy.log('=== 步骤 2: 提取 CSRF Token ===')
    cy.wait(3000)

    // 检查登录后的URL（应该包含CSRF token）
    cy.url().then((url) => {
      cy.log(`🌐 登录后URL: ${url}`)

      const urlObj = new URL(url)
      const csrfFromUrl = urlObj.searchParams.get('CSRFGuardToken')

      if (csrfFromUrl) {
        cy.log(`✅ 成功从URL中提取 CSRF Token: ${csrfFromUrl}`)
        cy.log(`Token 长度: ${csrfFromUrl.length} 字符`)
      } else {
        cy.log('⚠️ 登录后URL中未找到 CSRFGuardToken 参数')
      }

      // 记录登录后URL的所有查询参数
      const allParams = Array.from(urlObj.searchParams.entries())
      if (allParams.length > 0) {
        cy.log('🔗 登录后的URL查询参数:')
        allParams.forEach(([key, value]) => {
          cy.log(`  - ${key}: ${value.substring(0, 50)}...`)
        })
      }
    })

    // 检查登录后的cookies
    cy.getCookies().then((cookies) => {
      cy.log('🍪 登录后的 Cookies:')
      cookies.forEach((cookie) => {
        cy.log(`  - ${cookie.name}`)
      })
    })

    cy.screenshot('after-login')

    // 步骤 3: 访问补丁管理页面
    cy.log('=== 步骤 3: 访问补丁管理页面 ===')

    // 从当前URL提取CSRF token
    cy.url().then((currentUrl) => {
      const urlObj = new URL(currentUrl)
      const csrfToken = urlObj.searchParams.get('CSRFGuardToken')

      let targetUrl = `${baseUrl}/admin_patch_mgmt.jsp`

      // 如果找到CSRF token，将其添加到目标URL
      if (csrfToken) {
        targetUrl = `${targetUrl}?CSRFGuardToken=${csrfToken}`
        cy.log(`✅ 使用CSRF Token访问补丁管理页面`)
        cy.log(`Token: ${csrfToken.substring(0, 20)}...`)
      } else {
        cy.log('⚠️ 未找到CSRF Token，尝试直接访问')
      }

      // 访问补丁管理页面
      cy.visit(targetUrl, { failOnStatusCode: false })
      cy.wait(2000)

      // 记录访问后的URL
      cy.url().then((url) => {
        cy.log(`🌐 补丁管理页面URL: ${url}`)
      })
    })

    // 步骤 4: 分析补丁管理页面
    cy.log('=== 步骤 4: 分析补丁管理页面 ===')

    // 获取页面标题
    cy.title().then((title) => {
      cy.log(`页面标题: ${title}`)
    })

    // 查找目标内核版本
    const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'
    cy.log(`目标内核版本: ${targetKernelVersion}`)

    cy.get('body').then(($body) => {
      const bodyText = $body.text()

      if (bodyText.includes(targetKernelVersion)) {
        cy.log(`✅ 找到目标内核版本: ${targetKernelVersion}`)

        // 查找包含该版本的具体元素
        cy.contains(targetKernelVersion).then(($el) => {
          cy.log('✓ 元素信息:')
          cy.log(`  - tag: ${$el.prop('tagName')}`)
          cy.log(`  - class: ${$el.attr('class')}`)
          cy.log(`  - id: ${$el.attr('id')}`)
          cy.log(`  - text: ${$el.text().trim().substring(0, 100)}`)
        })
      } else {
        cy.log(`⚠️ 未找到目标内核版本: ${targetKernelVersion}`)

        // 搜索其他版本号
        const versionPattern = /\d+\.\d+\.\d+-\d+.*x86_64/g
        const foundVersions = bodyText.match(versionPattern)

        if (foundVersions && foundVersions.length > 0) {
          cy.log('✓ 找到以下版本号:')
          foundVersions.forEach((version, index) => {
            cy.log(`  ${index + 1}. ${version}`)
          })
        }
      }
    })

    // 查找所有表格
    cy.get('table').each(($el, index) => {
      const id = $el.attr('id')
      const className = $el.attr('class')

      cy.log(`表格 ${index + 1}:`)
      cy.log(`  - id: ${id}`)
      cy.log(`  - class: ${className}`)
    })

    // 查找导航栏
    cy.get('nav, .navbar, .navigation, header').each(($el, index) => {
      const className = $el.attr('class')
      const id = $el.attr('id')

      cy.log(`导航元素 ${index + 1}:`)
      cy.log(`  - class: ${className}`)
      cy.log(`  - id: ${id}`)
    })

    // 截图保存补丁管理页面
    cy.screenshot('patch-mgmt-page-analysis')
  })
})
