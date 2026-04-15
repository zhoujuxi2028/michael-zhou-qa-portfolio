# M5: Python Google 风格 Docstring 生成 Prompts

用于生成 Google 风格 Python Docstring 的精准 Copilot Prompts（直接可用）

---

## 📌 Prompt 1: saml_login() - SAML SSO 登录

**文件**: `sid-iam-testing-platform/src/clients/auth_client.py`

**用途**: 为 SAML 登录方法生成完整的 Google 风格 Docstring

**执行方式**:
```bash
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/sid-iam-testing-platform

gh copilot suggest "为下列 Python 方法生成 Google 风格的 Docstring。

代码：
def saml_login(self, username, password, sp_entity_id=\"https://sp.university.edu\", tenant=\"default\"):
    resp = self.sso.post(
        \"/saml/sso\",
        json={
            \"username\": username,
            \"password\": password,
            \"sp_entity_id\": sp_entity_id,
            \"tenant\": tenant,
        },
    )
    return (
        resp.json()
        if resp.status_code == 200
        else {\"status\": \"error\", \"code\": resp.status_code, \"detail\": resp.json().get(\"detail\", \"\")}
    )

要求：
- 一句话简明描述（SAML SSO 登录）
- 详细的多行描述（解释 SAML 是什么、Service Provider entity ID）
- Args 部分：说明 username、password、sp_entity_id、tenant 的含义和类型
- Returns 部分：说明返回的 dict 结构（成功返回的字段、失败返回的字段）
- Raises 部分：说明可能抛出的异常（如果有）
- Examples 部分：展示成功和失败的调用示例
- 使用中文注释"
```

**预期输出**（参考）:
```python
def saml_login(self, username, password, sp_entity_id="https://sp.university.edu", tenant="default"):
    """
    使用 SAML 2.0 协议执行单点登录 (SSO) 认证。

    此方法通过向 SAML 身份提供者 (IdP) 提交用户凭证，
    获取 SAML 断言 (Assertion)，用于第三方应用程序 (Service Provider) 的登录。
    SAML 2.0 是企业级 SSO 的行业标准。

    Args:
        username (str): 用户名或员工 ID
        password (str): 用户密码（明文，通常通过 HTTPS 传输）
        sp_entity_id (str): Service Provider 的实体 ID（唯一标识），
            默认为 "https://sp.university.edu"
        tenant (str): 租户标识符，用于多租户环境的隔离，默认为 "default"

    Returns:
        dict: 包含以下字段的响应字典：
            成功时（HTTP 200）:
                - access_token (str): SAML 访问令牌
                - session_id (str): 会话 ID
                - user_info (dict): 用户信息（邮箱、姓名等）
            失败时：
                - status (str): "error"
                - code (int): HTTP 状态码（401、500 等）
                - detail (str): 错误详情（如"Invalid credentials"）

    Raises:
        ConnectionError: 无法连接到 SAML IdP 服务
        ValueError: sp_entity_id 或 tenant 格式不正确

    Examples:
        >>> auth_client = AuthClient(sso_client=mock_sso)
        >>> # 成功登录
        >>> response = auth_client.saml_login(
        ...     username="john.doe",
        ...     password="SecurePass123",
        ...     sp_entity_id="https://sp.university.edu",
        ...     tenant="university"
        ... )
        >>> assert response["status"] == "success"
        >>> assert "session_id" in response
        
        >>> # 登录失败（凭证错误）
        >>> response = auth_client.saml_login(
        ...     username="john.doe",
        ...     password="WrongPassword"
        ... )
        >>> assert response["status"] == "error"
        >>> assert response["code"] == 401
    """
```

---

## 📌 Prompt 2: oidc_login() - OIDC/OAuth2 登录

**用途**: 为 OIDC 登录方法生成 Google 风格 Docstring

**执行方式**:
```bash
gh copilot suggest "为下列 Python 方法生成 Google 风格的 Docstring。

代码：
def oidc_login(self, username, password, client_id=\"test-client\", tenant=\"default\"):
    resp = self.sso.post(
        \"/oidc/token\",
        json={
            \"grant_type\": \"authorization_code\",
            \"username\": username,
            \"password\": password,
            \"client_id\": client_id,
            \"tenant\": tenant,
        },
    )
    return (
        resp.json()
        if resp.status_code == 200
        else {\"status\": \"error\", \"code\": resp.status_code, \"detail\": resp.json().get(\"detail\", \"\")}
    )

要求：
- 说明这是 OAuth 2.0 和 OpenID Connect 的实现
- Args 说明 client_id 是应用程序标识符
- Returns 说明返回 access_token、id_token、refresh_token
- 对比与 SAML 的区别（OIDC 基于 OAuth，支持 RESTful API）
- Examples 包含成功和失败的例子
- 中文注释"
```

**预期输出**（参考）:
```python
def oidc_login(self, username, password, client_id="test-client", tenant="default"):
    """
    使用 OAuth 2.0 和 OpenID Connect (OIDC) 协议执行登录认证。

    OIDC 是建立在 OAuth 2.0 基础上的身份认证层，广泛用于现代 Web 应用和移动应用。
    此方法使用 authorization_code 授权流程，适合后端到 IdP 的服务器端认证。

    与 SAML 不同，OIDC 更轻量级，原生支持 JSON/REST，更适合 API 生态。

    Args:
        username (str): 用户的用户名或邮箱
        password (str): 用户密码
        client_id (str): OAuth 2.0 应用程序客户端 ID（由 IdP 在应用注册时分配），
            默认为 "test-client"
        tenant (str): 租户标识符，默认为 "default"

    Returns:
        dict: 包含以下字段的响应字典：
            成功时（HTTP 200）:
                - access_token (str): JWT 格式的访问令牌（用于 API 调用）
                - id_token (str): JWT 格式的身份令牌（包含用户信息）
                - refresh_token (str): 刷新令牌（用于获取新的 access_token）
                - expires_in (int): access_token 过期时间（秒）
                - token_type (str): "Bearer"
            失败时：
                - status (str): "error"
                - code (int): HTTP 状态码
                - detail (str): 错误原因（如"invalid_client"、"invalid_grant"）

    Raises:
        ConnectionError: 无法连接到 OIDC IdP
        ValueError: client_id 无效或未注册

    Examples:
        >>> auth_client = AuthClient(sso_client=mock_oidc_provider)
        >>> # 成功登录
        >>> response = auth_client.oidc_login(
        ...     username="alice@example.com",
        ...     password="MyPassword123",
        ...     client_id="web-app-001"
        ... )
        >>> assert response["access_token"].startswith("ey")  # JWT 格式
        >>> assert response["expires_in"] > 0

        >>> # 客户端不存在
        >>> response = auth_client.oidc_login(
        ...     username="alice@example.com",
        ...     password="MyPassword123",
        ...     client_id="invalid-client"
        ... )
        >>> assert response["status"] == "error"
        >>> assert response["detail"] == "invalid_client"
    """
```

---

## 📌 Prompt 3: ldap_search() - LDAP 搜索

**用途**: 为 LDAP 目录搜索方法生成 Google 风格 Docstring

**执行方式**:
```bash
gh copilot suggest "为下列 Python 方法生成 Google 风格的 Docstring。

代码：
def ldap_search(self, conn_id, base_dn, filter_str, scope=\"subtree\", page_size=0, page_cookie=None):
    return self.ldap.search(conn_id, base_dn, filter_str, scope=scope, page_size=page_size, page_cookie=page_cookie)

要求：
- 说明这是 LDAP 目录搜索操作
- Args：
  - conn_id: 连接 ID（由 ldap_bind 返回）
  - base_dn: 搜索起点的 Distinguished Name（如 \"dc=example,dc=com\"）
  - filter_str: LDAP 过滤器字符串（如 \"(uid=john)\"）
  - scope: 搜索范围（base、one_level、subtree、subordinate_subtree）
  - page_size: 分页大小（0 = 无分页）
  - page_cookie: 分页 cookie（用于获取下一页）
- Returns：搜索结果列表，每项包含 DN 和属性
- Examples：展示常见的 LDAP 搜索（按 uid、按邮箱）
- 说明 LDAP 过滤器的语法示例
- 中文注释"
```

---

## 📌 Prompt 4: evaluate_device() - Zero Trust 设备评估

**用途**: 为 Zero Trust 设备评估方法生成 Google 风格 Docstring

**执行方式**:
```bash
gh copilot suggest "为下列 Python 方法生成 Google 风格的 Docstring。

代码：
def evaluate_device(self, device_info):
    if not self.zt:
        raise NotImplementedError(\"Zero Trust engine not configured\")
    return self.zt.evaluate_device(device_info)

要求：
- 说明这是 Zero Trust 架构的一部分（不信任任何设备，需要连续验证）
- Args 说明 device_info 的结构：
  - device_id: 设备唯一标识
  - os: 操作系统（Windows、macOS、Linux）
  - os_version: 操作系统版本
  - endpoint_security: 端点安全软件状态（已安装、已启用、病毒定义已更新）
  - network: 网络信息（有线/无线、公网/内网）
  - compliance_status: 合规状态（评估结果）
- Returns 说明返回的风险评估结果（设备是否可信）
- Raises 说明当 Zero Trust 引擎未配置时抛出 NotImplementedError
- Examples：展示可信和不可信的设备评估
- 中文注释"
```

---

## 📌 Prompt 5: create_session() - 创建会话

**用途**: 为会话创建方法生成 Google 风格 Docstring

**执行方式**:
```bash
gh copilot suggest "为下列 Python 方法生成 Google 风格的 Docstring。

代码：
def create_session(self, user_id, metadata=None):
    if not self.sessions:
        raise NotImplementedError(\"Session manager not configured\")
    return self.sessions.create_session(user_id, metadata)

要求：
- 说明这创建一个新的用户会话（authenticated session）
- Args：
  - user_id: 用户唯一标识（通常是数字 ID 或 UUID）
  - metadata: 可选的会话元数据（dict，如 IP 地址、User-Agent、位置）
- Returns：返回 dict 包含：
  - session_id: 新创建的会话 ID
  - created_at: 创建时间戳
  - expires_at: 过期时间戳
  - metadata: 会话关联的元数据
- Raises：NotImplementedError（会话管理器未配置）
- Examples：展示创建会话和传递 metadata 的用法
- 中文注释"
```

---

## 📌 Prompt 6: mfa_verify() - MFA 验证

**用途**: 为多因素认证验证方法生成 Google 风格 Docstring

**执行方式**:
```bash
gh copilot suggest "为下列 Python 方法生成 Google 风格的 Docstring。

代码：
def mfa_verify(self, user_id, code):
    if not self.mfa:
        raise NotImplementedError(\"MFA provider not configured\")
    return self.mfa.verify(user_id, code)

要求：
- 说明这验证多因素认证（MFA/2FA）代码
- Args：
  - user_id: 用户 ID
  - code: MFA 代码（TOTP 6 位数字、或短信验证码）
- Returns：dict 包含：
  - verified (bool): 验证是否成功
  - message (str): 验证结果信息
  - remaining_attempts (int): 剩余尝试次数（失败时）
- Raises：NotImplementedError、ValueError（code 格式错误）
- Examples：展示成功验证和验证失败（超过尝试次数）的案例
- 中文注释"
```

---

## 🚀 使用指南

### 执行顺序
1. **Prompt 1** (saml_login) - 基础的 SSO 认证
2. **Prompt 2** (oidc_login) - 现代 OAuth/OIDC
3. **Prompt 3** (ldap_search) - 目录搜索（包含复杂参数）
4. **Prompt 4** (evaluate_device) - Zero Trust（新概念）
5. **Prompt 5** (create_session) - 会话管理
6. **Prompt 6** (mfa_verify) - 多因素认证

### 执行步骤
1. 复制上面任意一个 Prompt 代码块
2. 在终端中执行：`gh copilot suggest "[粘贴 Prompt]"`
3. Copilot 会返回完整的 Google 风格 Docstring
4. 复制返回的 Docstring
5. 粘贴到 `sid-iam-testing-platform/src/clients/auth_client.py` 中对应的方法上方

### 验证检查清单
- [ ] 格式正确（"""...""" 三引号包围）
- [ ] 包含单行总结
- [ ] 包含详细描述
- [ ] Args 部分完整（参数名、类型、说明）
- [ ] Returns 部分清晰（说明返回值结构）
- [ ] Raises 部分准确（列出可能的异常）
- [ ] Examples 部分有效（能直接运行的代码）
- [ ] 中文注释清晰可读

---

## 📊 Docstring 标准对照

### Google 风格 Python Docstring 格式

```python
def function_name(arg1, arg2, optional_arg=None):
    """
    一句话简明描述（命令式，如"计算..."）。

    详细的多行描述。可以包含背景信息、使用场景、
    算法说明等。段落之间用空行分隔。

    Args:
        arg1 (type): 参数 1 的说明
        arg2 (type): 参数 2 的说明
        optional_arg (type, optional): 可选参数说明，默认值为 None

    Returns:
        type: 返回值的说明。如果是 dict，说明结构：
            {
                'key1': type,
                'key2': type
            }

    Raises:
        ExceptionType: 异常抛出条件说明

    Examples:
        >>> result = function_name(arg1, arg2)
        >>> assert result == expected_value
    """
```

---

**保存位置**: `/Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/docs/learning/M5-python-google-docstring-prompts.md`

**更新日期**: 2026-04-15

**状态**: ✅ 可直接使用
