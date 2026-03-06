// Custom Cypress commands
// Example:
// Cypress.Commands.add('login', (email, password) => { ... })

/**
 * 带CSRF Token的登录命令
 * 用法: cy.loginWithCSRF('https://10.206.201.9:8443', 'admin', '111111')
 *
 * 注意：登录页面本身没有 CSRF Token，Token 在登录成功后的 URL 中返回
 */
Cypress.Commands.add('loginWithCSRF', (baseUrl, username, password) => {
  // 访问登录页面（根目录，不是 /index.jsp）
  cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
  cy.wait(1000)

  // 填写用户名和密码（使用简单的 type 选择器）
  cy.get('input[type="text"]').first().clear().type(username)
  cy.get('input[type="password"]').first().clear().type(password)
  cy.log('✓ 已填写登录信息')

  // 提交表单
  cy.get('input[type="submit"], button[type="submit"]').first().click()
  cy.log('✓ 已提交登录表单')

  // 等待登录完成
  cy.wait(2000)

  // 登录后，从URL中提取CSRF token
  cy.url().then((url) => {
    const urlObj = new URL(url)
    const csrfFromUrl = urlObj.searchParams.get('CSRFGuardToken')

    if (csrfFromUrl) {
      cy.log(`✅ 登录成功，获取到 CSRF Token: ${csrfFromUrl.substring(0, 20)}...`)
      // 将token存储为别名供后续使用
      cy.wrap(csrfFromUrl).as('csrfToken')
    } else {
      cy.log('⚠️ 登录后未找到 CSRF Token')
    }
  })
})

/**
 * 获取CSRF Token的命令（从多个来源）
 * 用法: cy.getCSRFToken().then(token => { ... })
 */
Cypress.Commands.add('getCSRFToken', () => {
  return cy.url().then((url) => {
    // 1. 先尝试从URL中获取
    const urlObj = new URL(url)
    const csrfFromUrl = urlObj.searchParams.get('CSRFGuardToken')

    if (csrfFromUrl) {
      cy.log(`✅ 从URL中获取 CSRF Token: ${csrfFromUrl}`)
      return csrfFromUrl
    }

    // 2. 尝试从表单隐藏字段获取
    return cy.get('body').then(($body) => {
      const $csrfInput = $body.find('input[name="CSRFGuardToken"], input[name*="csrf"], input[name*="CSRF"]')

      if ($csrfInput.length > 0) {
        const csrfFromInput = $csrfInput.first().val()
        cy.log(`✅ 从表单中获取 CSRF Token: ${csrfFromInput}`)
        return csrfFromInput
      }

      cy.log('⚠️ 未找到 CSRF Token')
      return null
    })
  })
})

/**
 * 访问带CSRF Token的URL
 * 用法: cy.visitWithCSRF('https://10.206.201.9:8443', '/admin_patch_mgmt.jsp')
 */
Cypress.Commands.add('visitWithCSRF', (baseUrl, path) => {
  cy.getCSRFToken().then((token) => {
    let targetUrl = `${baseUrl}${path}`

    if (token) {
      // 如果path已经包含查询参数，使用&连接，否则使用?
      const separator = path.includes('?') ? '&' : '?'
      targetUrl = `${targetUrl}${separator}CSRFGuardToken=${token}`
      cy.log(`✅ 使用CSRF Token访问: ${path}`)
    } else {
      cy.log('⚠️ 未找到CSRF Token，直接访问')
    }

    cy.visit(targetUrl, { failOnStatusCode: false })
  })
})

/**
 * 从URL中提取CSRF Token
 * 用法: cy.extractCSRFTokenFromUrl().then(token => { ... })
 */
Cypress.Commands.add('extractCSRFTokenFromUrl', () => {
  return cy.url().then((url) => {
    const urlObj = new URL(url)
    const csrfToken = urlObj.searchParams.get('CSRFGuardToken')

    if (csrfToken) {
      cy.log(`✅ 从URL提取 CSRF Token: ${csrfToken}`)
    } else {
      cy.log('⚠️ URL中没有 CSRFGuardToken 参数')
    }

    return csrfToken
  })
})
