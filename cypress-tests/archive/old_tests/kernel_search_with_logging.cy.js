describe('内核版本搜索 - 带日志输出', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'
  let logOutput = []

  const log = (message) => {
    logOutput.push(message)
    cy.task('log', message)
  }

  it('搜索内核版本并输出详细日志', () => {
    log('\n========================================')
    log('开始测试')
    log('========================================')

    // 登录
    log('\n步骤 1: 登录系统')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)
    log('✓ 登录成功')

    // 检查页面结构
    log('\n步骤 2: 检查页面结构')
    cy.window().then((win) => {
      const doc = win.document
      const frames = doc.querySelectorAll('frame, iframe')
      log(`找到 ${frames.length} 个 frame/iframe`)

      if (frames.length > 0) {
        frames.forEach((frame, index) => {
          const name = frame.getAttribute('name') || frame.getAttribute('id') || `frame-${index}`
          const src = frame.getAttribute('src')
          log(`  Frame ${index}: name="${name}", src="${src}"`)
        })
      }
    })

    // 点击 Administration
    log('\n步骤 3: 展开 Administration 菜单')
    cy.window().then((win) => {
      const allElements = win.document.getElementsByTagName('*')
      for (let el of allElements) {
        if (el.textContent.trim() === 'Administration') {
          el.click()
          log('✓ 已点击 Administration')
          break
        }
      }
    })

    cy.wait(2000)

    // 点击 System Update
    log('\n步骤 4: 查找并点击 System Update')
    cy.window().then((win) => {
      const allLinks = win.document.getElementsByTagName('a')
      let found = false

      for (let link of allLinks) {
        const text = link.textContent.trim()
        if (text.toLowerCase().includes('system') && text.toLowerCase().includes('update')) {
          const href = link.getAttribute('href')
          log(`✓ 找到 System Update 链接: "${text}"`)
          log(`  href: ${href}`)
          link.click()
          found = true
          break
        }
      }

      if (!found) {
        log('⚠️ 未找到 System Update 链接')
        log('尝试列出所有可用链接:')
        for (let link of allLinks) {
          const text = link.textContent.trim()
          if (text && text.length > 0 && text.length < 50) {
            log(`  - "${text}" -> ${link.getAttribute('href')}`)
          }
        }
      }
    })

    cy.wait(4000)

    // 搜索内核版本
    log('\n步骤 5: 在页面中搜索目标内核版本')
    log(`目标版本: ${targetKernelVersion}`)

    cy.window().then((win) => {
      const doc = win.document
      const frames = doc.querySelectorAll('frame, iframe')

      log(`\n准备检查 ${frames.length} 个 frame/iframe`)

      let kernelFound = false

      if (frames.length > 0) {
        frames.forEach((frame, index) => {
          try {
            const frameName = frame.getAttribute('name') || frame.getAttribute('id') || `frame-${index}`
            log(`\n--- 检查 ${frameName} ---`)

            const frameDoc = frame.contentDocument || frame.contentWindow.document

            if (frameDoc && frameDoc.body) {
              const frameText = frameDoc.body.textContent
              const textLength = frameText.length

              log(`  文本长度: ${textLength} 字符`)

              if (frameText.includes(targetKernelVersion)) {
                log('\n🎉🎉🎉 找到目标内核版本！🎉🎉🎉')
                log(`  所在 Frame: ${frameName}`)
                log(`  内核版本: ${targetKernelVersion}`)

                // 查找包含内核版本的元素
                const allElements = frameDoc.getElementsByTagName('*')
                for (let el of allElements) {
                  if (el.textContent.includes(targetKernelVersion)) {
                    log(`\n  包含内核版本的元素信息:`)
                    log(`    标签: ${el.tagName}`)
                    log(`    ID: ${el.id || '(无)'}`)
                    log(`    Class: ${el.className || '(无)'}`)

                    const elText = el.textContent.trim()
                    log(`    文本内容: ${elText.substring(0, 500)}`)

                    // 如果在表格中
                    if (el.tagName === 'TD' || el.tagName === 'TR') {
                      const row = el.closest('tr')
                      if (row) {
                        log(`\n    所在表格行:`)
                        log(`    ${row.textContent.trim().substring(0, 300)}`)
                      }
                    }

                    kernelFound = true
                    break
                  }
                }
              } else {
                // 搜索其他版本号
                const versionPattern = /\d+\.\d+\.\d+-\d+[^\s]*/g
                const versions = frameText.match(versionPattern)

                if (versions && versions.length > 0) {
                  log(`  找到 ${versions.length} 个版本号:`)
                  versions.slice(0, 10).forEach((v, i) => {
                    log(`    ${i + 1}. ${v}`)
                  })
                } else {
                  log(`  未找到任何版本号`)
                }

                // 检查关键字
                const hasKernel = frameText.toLowerCase().includes('kernel')
                const hasUpdate = frameText.toLowerCase().includes('update')
                const hasSystem = frameText.toLowerCase().includes('system')

                log(`  包含关键字: kernel=${hasKernel}, update=${hasUpdate}, system=${hasSystem}`)

                if (textLength > 0 && textLength < 200) {
                  log(`  完整文本: ${frameText}`)
                }
              }
            } else {
              log(`  ⚠️ 无法访问 frame 内容（可能跨域）`)
            }
          } catch (error) {
            log(`  ⚠️ 访问出错: ${error.message}`)
          }
        })

        log('\n========================================')
        if (kernelFound) {
          log('✅ 测试成功：找到目标内核版本！')
        } else {
          log('⚠️ 测试完成：未找到目标内核版本')
        }
        log('========================================')

        // 将所有日志写入文件
        cy.task('writeToFile', {
          filename: 'test-result.txt',
          content: logOutput.join('\n')
        })
      } else {
        log('\n⚠️ 页面没有 frame/iframe，在主文档中搜索')

        const mainText = doc.body ? doc.body.textContent : ''
        if (mainText.includes(targetKernelVersion)) {
          log('✅ 在主文档中找到目标内核版本！')
          kernelFound = true
        } else {
          log('⚠️ 主文档中未找到目标内核版本')
        }

        cy.task('writeToFile', {
          filename: 'test-result.txt',
          content: logOutput.join('\n')
        })
      }
    })

    cy.screenshot('final-result', { capture: 'fullPage' })
  })
})
