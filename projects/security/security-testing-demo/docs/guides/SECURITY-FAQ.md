# Security Testing FAQ

## 常见问题

### 1. 什么是 DAST？与 SAST 有什么区别？

**DAST (Dynamic Application Security Testing)** - 动态应用安全测试：
- 在运行时测试应用程序
- 从外部视角（黑盒测试）
- 模拟真实攻击者行为
- 工具：OWASP ZAP, Burp Suite

**SAST (Static Application Security Testing)** - 静态应用安全测试：
- 分析源代码
- 在编译之前发现问题
- 白盒测试
- 工具：SonarQube, Checkmarx

**最佳实践：结合使用 SAST 和 DAST（DevSecOps）**

### 2. OWASP Top 10

| 编号 | 漏洞类型 | 示例 |
|------|----------|------|
| A01 | 访问控制失效 | 越权访问、IDOR |
| A02 | 加密机制失效 | 弱加密、明文传输 |
| A03 | 注入 | SQL注入、XSS |
| A04 | 不安全设计 | 业务逻辑漏洞 |
| A05 | 安全配置错误 | 默认密码、目录遍历 |
| A06 | 组件漏洞 | 过时的库、CVE |
| A07 | 身份认证失败 | 弱密码、会话固定 |
| A08 | 软件和数据完整性 | 不安全的反序列化 |
| A09 | 日志和监控不足 | 缺乏审计日志 |
| A10 | SSRF | 服务端请求伪造 |

### 3. SQL 注入测试方法

```python
# 1. 错误基注入
payload = "' OR '1'='1"
# 观察是否返回 SQL 错误信息

# 2. 联合查询注入
payload = "1' UNION SELECT 1,2,3--"
# 尝试获取数据

# 3. 时间盲注
payload = "1' AND SLEEP(5)--"
# 观察响应时间变化

# 4. 布尔盲注
payload_true = "1' AND '1'='1"
payload_false = "1' AND '1'='2"
# 比较响应差异
```

### 4. XSS 类型

1. **反射型 XSS (Reflected)**
   - Payload 在 URL 参数中
   - 需要诱导用户点击链接
   - 示例：`http://site.com/search?q=<script>alert('XSS')</script>`

2. **存储型 XSS (Stored)**
   - Payload 存储在数据库
   - 影响所有访问者
   - 示例：在评论中注入脚本

3. **DOM 型 XSS**
   - 在客户端 JavaScript 中执行
   - 不经过服务器
   - 示例：`location.hash` 被直接写入 DOM

### 5. CSRF 攻击与防御

**CSRF (Cross-Site Request Forgery)** - 跨站请求伪造

攻击原理：
```html
<!-- 恶意网站上的代码 -->
<img src="http://bank.com/transfer?to=attacker&amount=10000">
```

防御措施：
1. **CSRF Token** - 每个表单包含随机令牌
2. **SameSite Cookie** - 限制跨站 Cookie 发送
3. **Referer 检查** - 验证请求来源
4. **双重 Cookie 验证** - Cookie 值与请求参数匹配

### 6. OWASP ZAP 使用

```bash
# 1. 启动 ZAP
docker run -p 8090:8080 ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon

# 2. 基线扫描（快速）
python zap-baseline.py --target http://target.com

# 3. 全量扫描（深度）
python zap-full-scan.py --target http://target.com

# 4. API 扫描
python zap-api-scan.py --spec openapi.yaml
```

### 7. 安全测试在 CI/CD 中的位置

```
┌─────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  代码提交 → SAST → 构建 → DAST → 部署 → 监控            │
│     │        │       │      │       │      │            │
│     │        │       │      │       │      └── WAF/IDS  │
│     │        │       │      │       └── 生产环境        │
│     │        │       │      └── ZAP 扫描                │
│     │        │       └── 依赖扫描                       │
│     │        └── SonarQube                              │
│     └── 预提交检查                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 8. 安全响应头

| Header | 用途 | 推荐值 |
|--------|------|--------|
| Strict-Transport-Security | 强制 HTTPS | max-age=31536000; includeSubDomains |
| X-Frame-Options | 防止点击劫持 | DENY |
| X-Content-Type-Options | 防止 MIME 嗅探 | nosniff |
| Content-Security-Policy | 控制资源加载 | default-src 'self' |
| X-XSS-Protection | 浏览器 XSS 过滤 | 1; mode=block |

### 9. CVSS 漏洞评分

使用 **CVSS (Common Vulnerability Scoring System)**：

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
      │    │    │    │    │    │    │    │
      │    │    │    │    │    │    │    └── 可用性影响
      │    │    │    │    │    │    └── 完整性影响
      │    │    │    │    │    └── 机密性影响
      │    │    │    │    └── 影响范围
      │    │    │    └── 用户交互
      │    │    └── 权限要求
      │    └── 攻击复杂度
      └── 攻击向量
```

评分范围：
- **Critical**: 9.0 - 10.0
- **High**: 7.0 - 8.9
- **Medium**: 4.0 - 6.9
- **Low**: 0.1 - 3.9

---

## 快速演示

```bash
# 1. 启动环境
docker compose -f docker/docker-compose.yml up -d

# 2. 运行测试
pytest tests/test_xss.py -v

# 3. 运行 ZAP 扫描
python zap/zap-baseline.py --target http://localhost

# 4. 查看报告
open reports/zap_baseline_*.html
```
