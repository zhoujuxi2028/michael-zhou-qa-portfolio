describe('简单页面分析 - https://10.206.201.9:8443/', () => {
  it('收集登录页面的完整信息', () => {
    cy.visit('https://10.206.201.9:8443/', { failOnStatusCode: false })
    cy.wait(2000)

    // 获取页面标题
    cy.title().then((title) => {
      cy.log('=== 页面标题 ===')
      cy.log(title)
    })

    // 获取最终 URL
    cy.url().then((url) => {
      cy.log('=== 最终 URL ===')
      cy.log(url)
    })

    // 查找所有输入框（详细信息）
    cy.log('=== 所有输入框 ===')
    cy.get('input').then(($inputs) => {
      cy.log(`总共找到 ${$inputs.length} 个输入框`)

      $inputs.each((index, input) => {
        const $input = Cypress.$(input)
        const info = {
          '序号': index + 1,
          'type': $input.attr('type') || '未设置',
          'name': $input.attr('name') || '未设置',
          'id': $input.attr('id') || '未设置',
          'class': $input.attr('class') || '未设置',
          'placeholder': $input.attr('placeholder') || '未设置',
          'value': $input.attr('value') || '空',
          'required': $input.prop('required') ? '是' : '否'
        }
        cy.log(`输入框 ${index + 1}:`, info)
      })
    })

    // 查找所有按钮
    cy.log('=== 所有按钮 ===')
    cy.get('button, input[type="submit"], input[type="button"]').then(($buttons) => {
      cy.log(`总共找到 ${$buttons.length} 个按钮`)

      $buttons.each((index, button) => {
        const $button = Cypress.$(button)
        const info = {
          '序号': index + 1,
          'type': $button.attr('type') || '未设置',
          'text': $button.text().trim() || '无文本',
          'value': $button.attr('value') || '未设置',
          'id': $button.attr('id') || '未设置',
          'class': $button.attr('class') || '未设置',
          'onclick': $button.attr('onclick') || '未设置'
        }
        cy.log(`按钮 ${index + 1}:`, info)
      })
    })

    // 查找所有表单
    cy.log('=== 所有表单 ===')
    cy.get('form').then(($forms) => {
      cy.log(`总共找到 ${$forms.length} 个表单`)

      $forms.each((index, form) => {
        const $form = Cypress.$(form)
        const info = {
          '序号': index + 1,
          'action': $form.attr('action') || '未设置',
          'method': $form.attr('method') || '未设置',
          'id': $form.attr('id') || '未设置',
          'name': $form.attr('name') || '未设置',
          'onsubmit': $form.attr('onsubmit') || '未设置'
        }
        cy.log(`表单 ${index + 1}:`, info)
      })
    })

    // 获取页面可见文本
    cy.log('=== 页面文本内容 ===')
    cy.get('body').then(($body) => {
      const text = $body.text().trim()
      cy.log(text.substring(0, 500))
    })

    // 检查是否有隐藏的 CSRF Token（可选）
    cy.log('=== 检查隐藏字段 ===')
    cy.get('input[type="hidden"]').then(($hidden) => {
      if ($hidden.length > 0) {
        cy.log(`找到 ${$hidden.length} 个隐藏字段`)
        $hidden.each((index, input) => {
          const $input = Cypress.$(input)
          cy.log(`隐藏字段 ${index + 1}:`, {
            'name': $input.attr('name'),
            'value': $input.attr('value')
          })
        })
      } else {
        cy.log('未找到隐藏字段')
      }
    })

    // 检查 cookies
    cy.log('=== Cookies ===')
    cy.getCookies().then((cookies) => {
      cy.log(`总共有 ${cookies.length} 个 cookies`)
      cookies.forEach((cookie) => {
        cy.log(`${cookie.name}: ${cookie.value}`)
      })
    })

    // 获取 HTML 源码的头部
    cy.log('=== HTML Head 部分 ===')
    cy.document().then((doc) => {
      const headHtml = doc.head.innerHTML
      cy.log('Head 内容（前1000字符）:')
      cy.log(headHtml.substring(0, 1000))
    })

    // 截图
    cy.screenshot('simple-analysis-login-page', { capture: 'fullPage' })
  })

  it('尝试简单登录', () => {
    cy.visit('https://10.206.201.9:8443/', { failOnStatusCode: false })
    cy.wait(2000)

    cy.log('=== 开始登录流程 ===')

    // 填写用户名和密码
    cy.get('input[type="text"]').first().clear().type('admin')
    cy.get('input[type="password"]').first().clear().type('111111')

    cy.log('已填写用户名和密码')
    cy.screenshot('before-login-submit')

    // 点击登录按钮
    cy.get('input[type="submit"], button[type="submit"]').first().click()

    cy.log('已点击登录按钮，等待响应...')
    cy.wait(3000)

    // 获取登录后的 URL
    cy.url().then((url) => {
      cy.log('=== 登录后的 URL ===')
      cy.log(url)
    })

    // 获取登录后的页面标题
    cy.title().then((title) => {
      cy.log('=== 登录后的页面标题 ===')
      cy.log(title)
    })

    // 检查是否还在登录页面（可能登录失败）
    cy.url().then((url) => {
      if (url.includes('logon.jsp')) {
        cy.log('⚠️ 仍然在登录页面，可能登录失败')

        // 查找错误消息
        cy.get('body').then(($body) => {
          const bodyText = $body.text()
          if (bodyText.includes('error') || bodyText.includes('Error') || bodyText.includes('invalid') || bodyText.includes('Invalid')) {
            cy.log('⚠️ 页面可能包含错误消息')
            cy.log(bodyText)
          }
        })
      } else {
        cy.log('✅ 已离开登录页面，可能登录成功')
      }
    })

    cy.screenshot('after-login', { capture: 'fullPage' })
  })
})
