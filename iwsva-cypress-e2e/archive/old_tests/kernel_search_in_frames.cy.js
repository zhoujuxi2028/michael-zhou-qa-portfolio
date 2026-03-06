describe('在 frame 中搜索内核版本', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'
  let logOutput = []

  const log = (message) => {
    logOutput.push(message)
    cy.task('log', message)
  }

  it('在 left frame 中操作菜单，在 right frame 中查找内核版本', () => {
    log('\n========================================')
    log('开始测试 - 在 frame 中操作')
    log('========================================')

    // 登录
    log('\n步骤 1: 登录')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)
    log('✓ 登录成功')

    // 在 left frame 中操作
    log('\n步骤 2: 在 left frame 中查找 Administration')
    cy.window().then((win) => {
      const doc = win.document
      const leftFrame = doc.querySelector('frame[name="left"], iframe[name="left"]')

      if (leftFrame) {
        log('✓ 找到 left frame')

        try {
          const leftDoc = leftFrame.contentDocument || leftFrame.contentWindow.document

          if (leftDoc) {
            log('✓ 可以访问 left frame 内容')

            // 列出 left frame 中的所有链接
            const allLinks = leftDoc.getElementsByTagName('a')
            log(`\nleft frame 中有 ${allLinks.length} 个链接:`)

            for (let i = 0; i < Math.min(allLinks.length, 20); i++) {
              const link = allLinks[i]
              const text = link.textContent.trim()
              const href = link.getAttribute('href')
              if (text) {
                log(`  ${i + 1}. "${text}" -> ${href}`)
              }
            }

            // 查找 Administration 元素
            log('\n步骤 3: 查找并点击 Administration')
            const allElements = leftDoc.getElementsByTagName('*')
            let found = false

            for (let el of allElements) {
              const text = el.textContent.trim()
              if (text === 'Administration' || text.includes('Administration')) {
                log(`✓ 找到 Administration: ${el.tagName}`)
                el.click()
                log('✓ 已点击 Administration')
                found = true
                break
              }
            }

            if (!found) {
              log('⚠️ 未找到 Administration')
            }
          } else {
            log('⚠️ 无法访问 left frame 内容')
          }
        } catch (error) {
          log(`⚠️ 访问 left frame 时出错: ${error.message}`)
        }
      } else {
        log('⚠️ 未找到 left frame')
      }
    })

    cy.wait(2000)

    // 再次在 left frame 中查找 System Update
    log('\n步骤 4: 在 left frame 中查找 System Update')
    cy.window().then((win) => {
      const doc = win.document
      const leftFrame = doc.querySelector('frame[name="left"], iframe[name="left"]')

      if (leftFrame) {
        try {
          const leftDoc = leftFrame.contentDocument || leftFrame.contentWindow.document

          if (leftDoc) {
            const allLinks = leftDoc.getElementsByTagName('a')
            log(`\n现在 left frame 中有 ${allLinks.length} 个链接`)

            // 列出所有链接
            log('所有可用链接:')
            for (let i = 0; i < Math.min(allLinks.length, 30); i++) {
              const link = allLinks[i]
              const text = link.textContent.trim()
              const href = link.getAttribute('href')
              if (text) {
                log(`  ${i + 1}. "${text}" -> ${href}`)
              }
            }

            // 查找 System Update
            log('\n查找 System Update 链接...')
            let found = false

            for (let link of allLinks) {
              const text = link.textContent.trim().toLowerCase()
              const href = link.getAttribute('href') || ''

              // 匹配多种可能的名称
              if (text.includes('system') && text.includes('update') ||
                  text === 'system update' ||
                  text === 'system updates' ||
                  href.toLowerCase().includes('system') && href.toLowerCase().includes('update')) {
                log(`✅ 找到 System Update 链接!`)
                log(`  文本: "${link.textContent.trim()}"`)
                log(`  href: ${href}`)
                link.click()
                log('✓ 已点击 System Update')
                found = true
                break
              }
            }

            if (!found) {
              log('⚠️ 未找到 System Update 链接')
            }
          }
        } catch (error) {
          log(`⚠️ 错误: ${error.message}`)
        }
      }
    })

    cy.wait(4000)

    // 在 right frame 中查找内核版本
    log('\n步骤 5: 在 right frame 中查找内核版本')
    log(`目标版本: ${targetKernelVersion}`)

    cy.window().then((win) => {
      const doc = win.document
      const rightFrame = doc.querySelector('frame[name="right"], iframe[name="right"]')

      if (rightFrame) {
        log('✓ 找到 right frame')

        try {
          const rightDoc = rightFrame.contentDocument || rightFrame.contentWindow.document

          if (rightDoc && rightDoc.body) {
            const rightText = rightDoc.body.textContent
            log(`\nright frame 文本长度: ${rightText.length} 字符`)

            // 显示 right frame 的前 1000 字符
            log(`\nright frame 内容（前1000字符）:`)
            log(rightText.substring(0, 1000))

            if (rightText.includes(targetKernelVersion)) {
              log('\n🎉🎉🎉 找到目标内核版本！🎉🎉🎉')
              log(`内核版本: ${targetKernelVersion}`)

              // 查找具体元素
              const allElements = rightDoc.getElementsByTagName('*')
              for (let el of allElements) {
                if (el.textContent.includes(targetKernelVersion)) {
                  log(`\n元素信息:`)
                  log(`  标签: ${el.tagName}`)
                  log(`  ID: ${el.id || '(无)'}`)
                  log(`  Class: ${el.className || '(无)'}`)
                  log(`  文本: ${el.textContent.substring(0, 500)}`)

                  // 如果在表格中
                  if (el.tagName === 'TD' || el.tagName === 'TR') {
                    const row = el.closest('tr')
                    if (row) {
                      log(`\n  表格行: ${row.textContent.trim()}`)
                    }
                  }
                  break
                }
              }
            } else {
              log('\n⚠️ 未找到目标内核版本')

              // 搜索其他版本号
              const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
              const versions = rightText.match(versionPattern)

              if (versions) {
                log(`\n找到 ${versions.length} 个版本号:`)
                versions.slice(0, 10).forEach((v, i) => {
                  log(`  ${i + 1}. ${v}`)
                })
              }

              // 检查关键字
              const hasKernel = rightText.toLowerCase().includes('kernel')
              const hasUpdate = rightText.toLowerCase().includes('update')
              const hasSystem = rightText.toLowerCase().includes('system')

              log(`\n包含关键字: kernel=${hasKernel}, update=${hasUpdate}, system=${hasSystem}`)
            }
          } else {
            log('⚠️ 无法访问 right frame 内容')
          }
        } catch (error) {
          log(`⚠️ 错误: ${error.message}`)
        }
      } else {
        log('⚠️ 未找到 right frame')
      }

      log('\n========================================')
      log('测试完成')
      log('========================================')

      // 写入文件
      cy.task('writeToFile', {
        filename: 'test-result.txt',
        content: logOutput.join('\n')
      })
    })

    cy.screenshot('final-result', { capture: 'fullPage' })
  })
})
