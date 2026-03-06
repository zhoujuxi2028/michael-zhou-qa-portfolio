describe('最终测试：查找内核版本', () => {
  const baseUrl = 'https://10.206.201.9:8443'
  const targetKernelVersion = '5.14.0-427.24.1.el9_4.x86_64'

  it('完整流程', () => {
    console.log('\n========================================')
    console.log('开始测试')
    console.log('========================================\n')

    // 登录
    console.log('步骤 1: 登录')
    cy.visit(`${baseUrl}/`, { failOnStatusCode: false })
    cy.wait(2000)
    cy.get('input[type="text"]').first().type('admin')
    cy.get('input[type="password"]').first().type('111111')
    cy.get('input[type="submit"]').first().click()
    cy.wait(5000)
    console.log('✓ 登录成功')

    // 检查页面结构
    console.log('\n步骤 2: 检查页面结构')
    cy.window().then((win) => {
      const doc = win.document
      const frames = doc.querySelectorAll('frame, iframe')
      console.log(`找到 ${frames.length} 个 frame/iframe`)

      if (frames.length > 0) {
        frames.forEach((frame, index) => {
          const name = frame.getAttribute('name') || frame.getAttribute('id') || `frame-${index}`
          const src = frame.getAttribute('src')
          console.log(`  Frame ${index}: ${name} -> ${src}`)
        })
      }
    })

    // 点击 Administration
    console.log('\n步骤 3: 点击 Administration')
    cy.window().then((win) => {
      const allElements = win.document.getElementsByTagName('*')
      for (let el of allElements) {
        if (el.textContent.trim() === 'Administration') {
          el.click()
          console.log('✓ 已点击 Administration')
          break
        }
      }
    })

    cy.wait(2000)

    // 点击 System Update
    console.log('\n步骤 4: 查找并点击 System Update')
    cy.window().then((win) => {
      const allLinks = win.document.getElementsByTagName('a')
      let found = false

      for (let link of allLinks) {
        const text = link.textContent.trim()
        if (text.toLowerCase().includes('system') && text.toLowerCase().includes('update')) {
          console.log(`✓ 找到链接: "${text}"`)
          console.log(`  href: ${link.getAttribute('href')}`)
          link.click()
          found = true
          break
        }
      }

      if (!found) {
        console.log('⚠️ 未找到 System Update 链接')
        console.log('所有可用链接:')
        for (let link of allLinks) {
          const text = link.textContent.trim()
          if (text && text.length < 50) {
            console.log(`  - "${text}"`)
          }
        }
      }
    })

    cy.wait(4000)

    // 在所有 frame 中搜索
    console.log('\n步骤 5: 在所有 frame/iframe 中搜索内核版本')
    cy.window().then((win) => {
      const doc = win.document
      const frames = doc.querySelectorAll('frame, iframe')

      console.log(`准备检查 ${frames.length} 个 frame/iframe\n`)

      let kernelFound = false

      if (frames.length > 0) {
        frames.forEach((frame, index) => {
          try {
            const frameName = frame.getAttribute('name') || frame.getAttribute('id') || `frame-${index}`
            console.log(`--- 检查 ${frameName} ---`)

            const frameDoc = frame.contentDocument || frame.contentWindow.document

            if (frameDoc && frameDoc.body) {
              const frameText = frameDoc.body.textContent

              console.log(`  文本长度: ${frameText.length} 字符`)

              if (frameText.includes(targetKernelVersion)) {
                console.log('\n✅✅✅ 找到目标内核版本！✅✅✅')
                console.log(`  Frame: ${frameName}`)
                console.log(`  内核版本: ${targetKernelVersion}`)

                // 查找包含内核版本的元素
                const allElements = frameDoc.getElementsByTagName('*')
                for (let el of allElements) {
                  if (el.textContent.includes(targetKernelVersion)) {
                    console.log(`\n  元素信息:`)
                    console.log(`    标签: ${el.tagName}`)
                    console.log(`    ID: ${el.id || '无'}`)
                    console.log(`    Class: ${el.className || '无'}`)
                    console.log(`    文本: ${el.textContent.substring(0, 300)}`)

                    // 如果在表格中，显示周围的信息
                    if (el.tagName === 'TD' || el.tagName === 'TR') {
                      const row = el.closest('tr')
                      if (row) {
                        console.log(`\n    表格行内容: ${row.textContent.trim()}`)
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
                  console.log(`  找到 ${versions.length} 个版本号:`)
                  versions.slice(0, 5).forEach(v => {
                    console.log(`    - ${v}`)
                  })
                }

                // 检查是否包含关键字
                const hasKernel = frameText.toLowerCase().includes('kernel')
                const hasUpdate = frameText.toLowerCase().includes('update')
                const hasSystem = frameText.toLowerCase().includes('system')

                console.log(`  包含关键字: kernel=${hasKernel}, update=${hasUpdate}, system=${hasSystem}`)
              }
            } else {
              console.log(`  ⚠️ 无法访问内容`)
            }

            console.log('')
          } catch (error) {
            console.log(`  ⚠️ 错误: ${error.message}\n`)
          }
        })
      } else {
        console.log('⚠️ 页面没有 frame 或 iframe')

        // 在主文档中搜索
        console.log('\n在主文档中搜索...')
        const mainText = doc.body.textContent

        if (mainText.includes(targetKernelVersion)) {
          console.log('✅ 在主文档中找到内核版本!')
          kernelFound = true
        } else {
          console.log('⚠️ 主文档中未找到目标内核版本')
        }
      }

      console.log('\n========================================')
      if (kernelFound) {
        console.log('✅ 测试完成：成功找到内核版本！')
      } else {
        console.log('⚠️ 测试完成：未找到目标内核版本')
      }
      console.log('========================================\n')
    })

    cy.screenshot('final-result', { capture: 'fullPage' })
  })
})
