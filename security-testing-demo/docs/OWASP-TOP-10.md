# OWASP Top 10 - 2021

## 概述

OWASP Top 10 是 Web 应用安全领域最权威的漏洞分类标准。本项目的测试用例覆盖了主要的 OWASP Top 10 漏洞类型。

## 漏洞列表与本项目覆盖

| ID | 漏洞名称 | 本项目测试 | 测试文件 |
|----|----------|------------|----------|
| A01 | 访问控制失效 | ✅ | test_csrf.py, test_auth.py |
| A02 | 加密机制失效 | ⚠️ | test_headers.py (HSTS) |
| A03 | 注入 | ✅ | test_xss.py, test_sqli.py |
| A04 | 不安全设计 | ⚠️ | 需手动评估 |
| A05 | 安全配置错误 | ✅ | test_headers.py |
| A06 | 自带缺陷和过时组件 | ✅ | CI/CD 依赖扫描 |
| A07 | 身份识别和身份验证失败 | ✅ | test_auth.py |
| A08 | 软件和数据完整性故障 | ⚠️ | 需额外工具 |
| A09 | 安全日志和监控故障 | ⚠️ | 需手动评估 |
| A10 | 服务端请求伪造 (SSRF) | ⚠️ | ZAP 自动扫描 |

✅ = 完整覆盖 | ⚠️ = 部分覆盖或通过 ZAP 自动扫描

---

## A01:2021 - 访问控制失效 (Broken Access Control)

### 描述
应用程序未能正确限制用户对资源的访问，导致未授权的数据泄露或功能使用。

### 常见类型
- IDOR (不安全的直接对象引用)
- 权限绕过
- CORS 配置错误
- 路径遍历
- 强制浏览

### 本项目测试
```python
# test_auth.py
- test_session_fixation      # 会话固定
- test_session_timeout       # 会话超时

# test_csrf.py
- test_csrf_token_presence   # CSRF 令牌存在性
- test_csrf_token_validation # CSRF 令牌验证
```

### 防御措施
- 默认拒绝访问
- 实施基于角色的访问控制 (RBAC)
- 验证所有用户输入
- 使用 CSRF 令牌

---

## A02:2021 - 加密机制失效 (Cryptographic Failures)

### 描述
数据保护不当，包括传输和存储过程中的加密失败。

### 常见类型
- 明文传输敏感数据
- 弱加密算法
- 密钥管理不当
- 证书验证失败

### 本项目测试
```python
# test_headers.py
- test_hsts_header           # HTTPS 强制
```

### 防御措施
- 使用 TLS 1.2+
- 实施 HSTS
- 使用强加密算法
- 安全存储密钥

---

## A03:2021 - 注入 (Injection)

### 描述
用户输入未经验证直接传递给解释器，导致恶意命令执行。

### 常见类型
- SQL 注入
- XSS (跨站脚本)
- 命令注入
- LDAP 注入
- XPath 注入

### 本项目测试
```python
# test_xss.py
- test_xss_in_search_parameter  # 反射型 XSS
- test_xss_payload_encoding     # 编码验证
- test_xss_in_url_fragment      # DOM XSS
- test_xss_filter_bypass        # 过滤绕过
- test_stored_xss_in_comments   # 存储型 XSS

# test_sqli.py
- test_error_based_sqli         # 错误注入
- test_union_based_sqli         # 联合查询注入
- test_time_based_blind_sqli    # 时间盲注
- test_boolean_based_blind_sqli # 布尔盲注
```

### 防御措施
- 使用参数化查询
- 输入验证和净化
- 输出编码
- 最小权限原则

---

## A05:2021 - 安全配置错误 (Security Misconfiguration)

### 描述
应用程序或基础设施配置不当，导致安全漏洞。

### 常见类型
- 默认凭证
- 不必要的功能启用
- 缺失安全头
- 错误信息泄露
- 过时的软件版本

### 本项目测试
```python
# test_headers.py
- test_hsts_header              # HSTS
- test_x_frame_options          # 点击劫持防护
- test_content_security_policy  # CSP
- test_all_security_headers     # 综合检查
- test_cache_control            # 缓存控制
```

### 安全头推荐配置
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

---

## A07:2021 - 身份识别和身份验证失败

### 描述
身份验证和会话管理功能实施不当。

### 常见类型
- 弱密码策略
- 凭证填充攻击
- 会话固定
- 会话超时不当
- 缺乏多因素认证

### 本项目测试
```python
# test_auth.py
- test_login_rate_limiting      # 登录速率限制
- test_account_lockout          # 账户锁定
- test_session_fixation         # 会话固定
- test_session_timeout          # 会话超时
- test_weak_password_acceptance # 弱密码接受
- test_password_in_url          # URL 中的密码
```

### 防御措施
- 实施强密码策略
- 多因素认证 (MFA)
- 安全的会话管理
- 账户锁定机制

---

## 扩展测试建议

### A04: 不安全设计
需要在设计阶段进行威胁建模，自动化测试难以覆盖。

### A06: 自带缺陷和过时组件
```yaml
# CI/CD 集成依赖扫描
- name: Dependency scan
  run: safety check
```

### A08: 软件和数据完整性故障
关注 CI/CD 流水线安全和依赖完整性验证。

### A09: 安全日志和监控故障
需要评估日志记录和告警机制。

### A10: SSRF
ZAP 主动扫描可以检测部分 SSRF 漏洞。

---

## 参考资源

- [OWASP Top 10 - 2021 官方文档](https://owasp.org/Top10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
