const { defineConfig } = require('cypress')
const fs = require('fs')
const path = require('path')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://10.206.201.9:8443',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    // 忽略 Chrome 安全警告（用于自签名证书）
    chromeWebSecurity: false,

    // Node.js 选项：忽略 SSL 证书验证错误
    setupNodeEvents(on, config) {
      // 设置环境变量以处理自签名证书
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

      // 添加自定义任务
      on('task', {
        writeToFile({ filename, content }) {
          const filePath = path.join(__dirname, filename)
          fs.writeFileSync(filePath, content, 'utf8')
          return null
        },
        log(message) {
          console.log(message)
          return null
        }
      })

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // 添加 Chrome 启动参数以忽略证书错误
          launchOptions.args.push('--ignore-certificate-errors')
          launchOptions.args.push('--allow-insecure-localhost')
        }
        return launchOptions
      })

      return config
    },
  },
})
