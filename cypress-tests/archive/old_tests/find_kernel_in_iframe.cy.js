describe('在 iframe 中查找内核版本', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('完整流程：检查 iframe 并查找内核版本', () => {
    // 登录
    cy.log('=== 步骤 1: 登录 ===')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)

    cy.screenshot('01-logged-in')

    // 检查页面结构
    cy.log('=== 步骤 2: 检查页面结构 ===')
    cy.window().then((win) => {
      const doc = win.document

      // 检查 frameset
      const framesets = doc.querySelectorAll('frameset')
      cy.log(`找到 ${framesets.length} 个 frameset`)

      // 检查 frame
      const frames = doc.querySelectorAll('frame')
      cy.log(`找到 ${frames.length} 个 frame`)

      if (frames.length > 0) {
        cy.log('✓ 页面使用 frame 结构')
        frames.forEach((frame, index) => {
          cy.log(`Frame ${index}:`, {
            name: frame.getAttribute('name'),
            src: frame.getAttribute('src')
          })
        })
      }

      // 检查 iframe
      const iframes = doc.querySelectorAll('iframe')
      cy.log(`找到 ${iframes.length} 个 iframe`)

      if (iframes.length > 0) {
        cy.log('✓ 页面使用 iframe 结构')
        iframes.forEach((iframe, index) => {
          cy.log(`iframe ${index}:`, {
            name: iframe.getAttribute('name'),
            id: iframe.getAttribute('id'),
            src: iframe.getAttribute('src')
          })
        })
      }
    })

    // 点击 Administration
    cy.log('=== 步骤 3: 点击 Administration ===')
    cy.window().then((win) => {
      const allElements = win.document.getElementsByTagName('*')
      for (let el of allElements) {
        if (el.textContent.trim() === 'Administration') {
          el.click()
          cy.log('✓ 已点击 Administration')
          break
        }
      }
    })

    cy.wait(2000)
    cy.screenshot('02-after-administration')

    // 点击 System Update
    cy.log('=== 步骤 4: 点击 System Update ===')
    cy.window().then((win) => {
      const allLinks = win.document.getElementsByTagName('a')
      for (let link of allLinks) {
        const text = link.textContent.trim()
        if (text.toLowerCase().includes('system') && text.toLowerCase().includes('update')) {
          cy.log(`✓ 找到并点击: "${text}"`)
          link.click()
          break
        }
      }
    })

    cy.wait(4000)
    cy.screenshot('03-after-system-update-click')

    // 在主文档中查找
    cy.log('=== 步骤 5: 在主文档中查找 ===')
    cy.window().then((win) => {
      const mainText = win.document.body.textContent
      cy.log('主文档文本（前1000字符）:')
      cy.log(mainText.substring(0, 1000))

      if (mainText.includes(targetKernelVersion)) {
        cy.log(`✅ 在主文档中找到内核版本!`)
      }
    })

    // 尝试访问 frame 或 iframe 中的内容
    cy.log('=== 步骤 6: 访问 frame/iframe 内容 ===')
    cy.window().then((win) => {
      const doc = win.document

      // 尝试访问所有 frame
      const frames = doc.querySelectorAll('frame, iframe')

      if (frames.length > 0) {
        cy.log(`准备检查 ${frames.length} 个 frame/iframe`)

        frames.forEach((frame, index) => {
          try {
            const frameName = frame.getAttribute('name') || frame.getAttribute('id') || `frame-${index}`
            cy.log(`\n检查 ${frameName}...`)

            // 获取 frame 的文档
            const frameDoc = frame.contentDocument || frame.contentWindow.document

            if (frameDoc) {
              const frameText = frameDoc.body ? frameDoc.body.textContent : ''

              cy.log(`${frameName} 文本（前500字符）:`)
              cy.log(frameText.substring(0, 500))

              // 查找内核版本
              if (frameText.includes(targetKernelVersion)) {
                cy.log(`✅✅✅ 在 ${frameName} 中找到目标内核版本!!!`)
                cy.log(`内核版本: ${targetKernelVersion}`)

                // 尝试定位具体元素
                const allElements = frameDoc.getElementsByTagName('*')
                for (let el of allElements) {
                  if (el.textContent.includes(targetKernelVersion)) {
                    cy.log('✓ 找到包含内核版本的元素:')
                    cy.log(`  标签: ${el.tagName}`)
                    cy.log(`  文本: ${el.textContent.substring(0, 200)}`)
                    break
                  }
                }
              } else {
                cy.log(`⚠️ ${frameName} 不包含目标内核版本`)

                // 搜索其他版本号
                const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
                const versions = frameText.match(versionPattern)
                if (versions) {
                  cy.log(`✓ ${frameName} 中找到版本号:`)
                  versions.forEach(v => cy.log(`  - ${v}`))
                }
              }
            } else {
              cy.log(`⚠️ 无法访问 ${frameName} 的内容（可能跨域）`)
            }
          } catch (error) {
            cy.log(`⚠️ 访问 frame ${index} 时出错: ${error.message}`)
          }
        })
      } else {
        cy.log('⚠️ 页面没有 frame 或 iframe')
      }
    })

    cy.screenshot('04-final', { capture: 'fullPage' })
  })
})
