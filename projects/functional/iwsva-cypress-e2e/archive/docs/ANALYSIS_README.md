# 页面分析预研文档

## 概述

本文档说明如何使用页面分析工具来探索和理解目标网站的结构，特别是关于 **CSRF Token** 的处理。

## 目标网站

- **登录页面**: https://10.206.201.9:8443/index.jsp
- **补丁管理页面**: https://10.206.201.9:8443/admin_patch_mgmt.jsp
- **登录凭证**:
  - 用户名: admin
  - 密码: 111111

## 重要：CSRF Token 处理

目标网站使用 **CSRFGuardToken** 来防止跨站请求伪造攻击。根据实际测试，发现：

### 关键发现：

1. **登录页面本身没有 CSRF Token** - 这是与预期不同的重要发现
2. **CSRF Token 在登录成功后才出现** - Token 在登录后的 URL 查询参数中返回
3. **后续所有页面访问都需要携带这个 Token**

### 正确的登录流程：

```
1. 访问登录页面: https://10.206.201.9:8443/
   └─> 页面没有 CSRF Token
   └─> 填写用户名和密码

2. 提交登录表单
   └─> 不需要 CSRF Token

3. 登录成功后重定向
   └─> URL 包含 CSRF Token
   └─> 示例: /main.jsp?CSRFGuardToken=ABC123XYZ...

4. 访问其他页面
   └─> 必须在 URL 中携带 Token
   └─> 示例: /admin_patch_mgmt.jsp?CSRFGuardToken=ABC123XYZ...
```

### CSRF Token 的位置

- ✅ **URL 查询参数**（登录后）：`?CSRFGuardToken=FA6MMDTGPLJDI4PX5TUFHHU7QY51PVAB`
- ❌ 登录页面的隐藏字段：**不存在**
- ❌ Meta 标签：**不存在**

## 文件说明

### 1. 页面分析脚本

**文件**: `cypress/e2e/page_analysis.cy.js`

这个脚本会自动：
- ✅ 检测和记录所有 CSRF token（隐藏字段、meta标签、cookies）
- ✅ 分析登录页面的所有输入框、按钮和表单
- ✅ 尝试登录并记录登录前后的 CSRF token 变化
- ✅ 访问补丁管理页面并查找目标内核版本
- ✅ 截图保存关键页面供后续分析

### 2. 自定义命令

**文件**: `cypress/support/commands.js`

提供了四个自定义命令：

#### `cy.loginWithCSRF(baseUrl, username, password)`
自动处理登录并提取 CSRF token（登录后从 URL 中获取）
```javascript
cy.loginWithCSRF('https://10.206.201.9:8443', 'admin', '111111')
// 登录后，CSRF Token 会自动存储为别名 'csrfToken'
```

**工作原理**：
1. 访问 `${baseUrl}/`（不是 `/index.jsp`）
2. 填写用户名和密码
3. 提交表单
4. 从登录后的 URL 中提取 CSRF Token
5. 将 Token 存储为 Cypress 别名供后续使用

#### `cy.getCSRFToken()`
获取当前页面的 CSRF token（从 URL 查询参数中获取）
```javascript
cy.getCSRFToken().then(token => {
  cy.log('CSRF Token:', token)
})
```

**注意**：此命令优先从 URL 中提取 Token，因为该系统的 Token 主要通过 URL 传递。

#### `cy.visitWithCSRF(baseUrl, path)`
访问页面时自动附加 CSRF token 到 URL
```javascript
cy.visitWithCSRF('https://10.206.201.9:8443', '/admin_patch_mgmt.jsp')
```

#### `cy.extractCSRFTokenFromUrl()`
专门从当前 URL 的查询参数中提取 CSRF token
```javascript
cy.extractCSRFTokenFromUrl().then(token => {
  cy.log('URL中的Token:', token)
})
```

### 3. Cypress 配置

**文件**: `cypress.config.js`

已配置为支持自签名 SSL 证书：
- `chromeWebSecurity: false` - 禁用 Chrome Web 安全限制
- `NODE_TLS_REJECT_UNAUTHORIZED = '0'` - 忽略 Node.js SSL 验证
- Chrome 启动参数：`--ignore-certificate-errors`

## 运行页面分析

### 方式一：命令行运行（推荐）

```bash
npm run analyze
```

这会：
- 使用 Chrome 浏览器
- 以可视化模式运行（可以看到浏览器操作）
- 只运行页面分析测试

### 方式二：Cypress 交互式界面

```bash
npm run cypress:open
```

然后在界面中选择 `page_analysis.cy.js` 文件运行。

## 分析结果

### 1. 控制台输出

测试运行时，控制台会输出详细信息：

```
🔑 CSRF Token 字段 1:
  - name: CSRFGuardToken
  - type: hidden
  - value: abc123xyz...

✅ 找到 CSRF Token: CSRFGuardToken = abc123xyz...

🍪 所有 Cookies:
  - JSESSIONID: A1B2C3D4...
  - CSRFGuardToken: abc123xyz...

输入框 1:
  - type: text
  - name: username
  - id: username-input
  ...
```

### 2. 截图文件

位置: `cypress/screenshots/page_analysis.cy.js/`

- `login-page-analysis.png` - 登录页面截图
- `after-login.png` - 登录后的页面
- `patch-mgmt-page-analysis.png` - 补丁管理页面截图

### 3. 视频记录

位置: `cypress/videos/`

完整的测试执行过程视频。

## 下一步

运行分析测试后：

1. **查看控制台输出**
   - 记录 CSRF token 的字段名称和获取方式
   - 记录登录表单的选择器（用户名、密码、提交按钮）
   - 记录内核版本在补丁管理页面的显示方式

2. **检查截图**
   - 确认页面是否正常加载
   - 验证登录是否成功
   - 确认内核版本是否可见

3. **提供反馈**
   - 将控制台输出发送给开发人员
   - 分享关键截图
   - 说明任何异常或错误

4. **创建正式测试**
   - 基于分析结果，创建准确的测试用例
   - 使用发现的正确选择器
   - 正确处理 CSRF token

## 常见问题

### Q: 如果 CSRF token 每次都不同怎么办？
A: 这是正常的。我们的自定义命令 `cy.loginWithCSRF()` 会自动提取最新的 token。

### Q: 如果登录失败怎么办？
A: 查看截图和控制台输出，可能的原因：
- CSRF token 未正确传递
- 用户名/密码字段选择器不正确
- 需要额外的登录步骤（如验证码）

### Q: 为什么要忽略 SSL 证书错误？
A: 目标网站使用自签名证书，这在开发/测试环境中很常见。生产环境应使用正式的 SSL 证书。

## 技术细节：CSRF Token 处理流程（已验证）

```
1. 访问登录页面
   └─> https://10.206.201.9:8443/
       └─> ❌ 页面没有 CSRF Token
       └─> ✅ 直接显示登录表单

2. 填写并提交登录表单
   └─> 填写用户名: admin
   └─> 填写密码: 111111
   └─> ❌ 不需要 CSRF Token
   └─> ✅ 直接提交表单

3. 登录成功（服务器重定向）
   └─> 服务器重定向到新URL
       └─> ✅ URL 中包含 CSRF Token
       └─> 示例: /main.jsp?CSRFGuardToken=ABC123XYZ...
       └─> Cypress 从 URL 中提取 Token

4. 后续请求（访问其他页面）
   └─> 使用提取到的 Token 作为 URL 参数
       └─> 示例: /admin_patch_mgmt.jsp?CSRFGuardToken=ABC123XYZ...
       └─> Token 在会话期间保持不变
```

### 实际的 URL 流程

```
步骤1 - 访问登录页面:
https://10.206.201.9:8443/
(没有 CSRF Token)

步骤2 - 提交登录表单
(不需要 CSRF Token)

步骤3 - 登录成功后重定向:
https://10.206.201.9:8443/main.jsp?CSRFGuardToken=FA6MMDTGPLJDI4PX5TUFHHU7QY51PVAB
(Token 出现在 URL 中)

步骤4 - 访问补丁管理页面:
https://10.206.201.9:8443/admin_patch_mgmt.jsp?CSRFGuardToken=FA6MMDTGPLJDI4PX5TUFHHU7QY51PVAB
(需要携带相同的 Token)
```

### 关键登录代码

```javascript
// 正确的登录方式（已验证）
cy.visit('https://10.206.201.9:8443/', { failOnStatusCode: false })
cy.get('input[type="text"]').first().type('admin')
cy.get('input[type="password"]').first().type('111111')
cy.get('input[type="submit"]').first().click()
cy.wait(2000)

// 提取 CSRF Token
cy.url().then((url) => {
  const urlObj = new URL(url)
  const csrfToken = urlObj.searchParams.get('CSRFGuardToken')
  // csrfToken 现在可以用于后续请求
})
```

## 建议

- **首次运行**: 先运行一次分析，查看完整输出
- **截图审查**: 检查截图确认页面状态
- **Token 验证**: 确认 CSRF token 的格式和传递方式
- **迭代改进**: 根据实际情况调整选择器和等待时间
