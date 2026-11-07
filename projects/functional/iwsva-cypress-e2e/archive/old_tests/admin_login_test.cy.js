describe('Admin Login and Patch Management Test', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const username = 'admin'
  const password = '111111'
  const expectedKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('应该成功登录并验证补丁管理页面中的内核版本', () => {
    // 步骤 1: 使用自定义命令登录
    cy.log('=== 步骤 1: 登录系统 ===')
    cy.loginWithCSRF(baseUrl, username, password)

    // 验证登录成功（URL应该包含CSRF Token）
    cy.url().then((url) => {
      const urlObj = new URL(url)
      const csrfToken = urlObj.searchParams.get('CSRFGuardToken')
      expect(csrfToken).to.not.be.null
      cy.log(`✅ 登录成功，获取到 CSRF Token`)
    })

    // 步骤 2: 使用自定义命令访问补丁管理页面
    cy.log('=== 步骤 2: 访问补丁管理页面 ===')
    cy.visitWithCSRF(baseUrl, '/admin_patch_mgmt.jsp')

    // 等待页面加载
    cy.wait(2000)

    // 步骤 3: 验证内核版本
    cy.log('=== 步骤 3: 验证内核版本 ===')
    cy.contains(expectedKernelVersion).should('be.visible')

    // 记录成功信息
    cy.log(`✅ 成功验证内核版本: ${expectedKernelVersion}`)
  })

  it('应该能够手动提取和使用CSRF Token', () => {
    // 步骤 1: 访问登录页面并登录
    cy.log('=== 步骤 1: 手动登录 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(1000)

    // 登录页面不应该有CSRF Token
    cy.extractCSRFTokenFromUrl().then((token) => {
      if (token) {
        cy.log(`⚠️ 登录页面有 CSRF Token: ${token}`)
      } else {
        cy.log(`✓ 确认：登录页面没有 CSRF Token（符合预期）`)
      }
    })

    // 填写登录表单
    cy.get('input[type="text"]').first().clear().type(username)
    cy.get('input[type="password"]').first().clear().type(password)

    // 提交表单
    cy.get('input[type="submit"], button[type="submit"]').first().click()
    cy.wait(2000)

    // 步骤 2: 提取登录后的CSRF Token
    cy.log('=== 步骤 2: 提取 CSRF Token ===')
    cy.extractCSRFTokenFromUrl().then((token) => {
      expect(token).to.not.be.null
      cy.log(`✅ 登录后获取到 CSRF Token: ${token.substring(0, 20)}...`)

      // 步骤 3: 使用该token访问补丁管理页面
      cy.log('=== 步骤 3: 访问补丁管理页面 ===')
      cy.visit(`${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${token}`, { failOnStatusCode: false })
    })

    cy.wait(2000)

    // 步骤 4: 验证内核版本
    cy.log('=== 步骤 4: 验证内核版本 ===')
    cy.contains(expectedKernelVersion).should('be.visible')
    cy.log(`✅ 成功验证内核版本`)
  })

  it('应该正确处理完整的登录和导航流程', () => {
    // 场景: 完整流程测试
    cy.log('=== 完整流程测试 ===')

    // 1. 登录
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(1000)
    cy.get('input[type="text"]').first().type(username)
    cy.get('input[type="password"]').first().type(password)
    cy.get('input[type="submit"]').first().click()
    cy.wait(2000)

    // 2. 验证登录后的URL结构
    cy.url().then((url) => {
      cy.log(`✓ 登录后 URL: ${url}`)

      const urlObj = new URL(url)
      const csrfToken = urlObj.searchParams.get('CSRFGuardToken')

      expect(csrfToken).to.not.be.null
      expect(csrfToken.length).to.be.greaterThan(10)
      cy.log(`✓ CSRF Token 格式正确，长度: ${csrfToken.length}`)

      // 记录所有查询参数
      const allParams = Array.from(urlObj.searchParams.entries())
      cy.log('✓ URL 查询参数:')
      allParams.forEach(([key, value]) => {
        cy.log(`  - ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`)
      })

      // 3. 访问补丁管理页面
      cy.visit(`${baseUrl}/admin_patch_mgmt.jsp?CSRFGuardToken=${csrfToken}`, { failOnStatusCode: false })
      cy.wait(2000)

      // 4. 验证页面和内核版本
      cy.url().should('include', 'admin_patch_mgmt.jsp')
      cy.contains(expectedKernelVersion).should('be.visible')

      cy.log(`✅ 完整流程测试成功`)
    })
  })
})
