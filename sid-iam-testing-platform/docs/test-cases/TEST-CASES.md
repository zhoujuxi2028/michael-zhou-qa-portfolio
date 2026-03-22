# SID IAM 测试平台 — 测试用例目录

# SID IAM Testing Platform — Test Cases

## 编号规则 / Naming Convention

```
TC-{DOMAIN}-{MODULE}-{NNN}

TC     = Test Case
DOMAIN = AUTH / DATA / AI
MODULE = SSO / LDAP / KRB / ZT / SES / MFA
         ONT / PIP / WH / TAG / ANA
         LCY / AUTH / DAT / SAF / INT
NNN    = 001-999
```

---

## 测试用例汇总 / Summary

| 领域 / Domain | 模块 / Module | 数量 / Count | 优先级分布 |
|--------|--------|-------|------------|
| Auth | SSO | 12 | P0×6, P1×4, P2×2 |
| Auth | LDAP | 10 | P0×4, P1×4, P2×2 |
| Auth | Kerberos | 8 | P0×3, P1×3, P2×2 |
| Auth | Zero Trust | 10 | P0×4, P1×4, P2×2 |
| Auth | Session | 8 | P0×4, P1×3, P2×1 |
| Auth | MFA | 6 | P0×2, P1×3, P2×1 |
| Data | Ontology | 10 | P0×4, P1×4, P2×2 |
| Data | Pipeline | 10 | P0×4, P1×4, P2×2 |
| Data | Warehouse | 8 | P0×4, P1×3, P2×1 |
| Data | Tag Platform | 8 | P0×3, P1×3, P2×2 |
| Data | Analytics | 8 | P0×3, P1×3, P2×2 |
| AI | Lifecycle | 8 | P0×3, P1×3, P2×2 |
| AI | Auth | 8 | P0×4, P1×3, P2×1 |
| AI | Data Access | 8 | P0×4, P1×3, P2×1 |
| AI | Safety | 8 | P0×4, P1×3, P2×1 |
| AI | Integration | 8 | P0×4, P1×3, P2×1 |
| | **合计 Total** | **138** | **P0×60, P1×53, P2×25** |

---

## 认证安全 — SSO 测试 (12)

| 编号              | 描述                         | 输入                             | 预期结果                                               | 类型  | 优先级 |
| --------------- | -------------------------- | ------------------------------ | -------------------------------------------------- | --- | --- |
| TC-AUTH-SSO-001 | SAML SSO 登录流程正确性           | 用户名+密码发起 SAML 登录               | 返回有效签名的 SAML Response，subject 匹配用户名                | 功能  | P0  |
| TC-AUTH-SSO-002 | OIDC Authorization Code 流程 | OIDC 授权码请求                     | 返回 access_token、id_token、refresh_token，type=Bearer | 功能  | P0  |
| TC-AUTH-SSO-003 | SAML Assertion 签名验证        | 正常 Assertion + 篡改签名的 Assertion | 正常验证通过；篡改签名抛出 ValueError                           | 安全  | P0  |
| TC-AUTH-SSO-004 | OIDC ID Token 声明验证         | OIDC 登录后解析 ID Token            | JWT 包含 sub/email/name/roles/iss/aud/exp/iat        | 功能  | P0  |
| TC-AUTH-SSO-005 | SSO 登出（SAML SLO）           | 登录后用 session_id 发起登出           | 返回 status=success                                  | 功能  | P0  |
| TC-AUTH-SSO-006 | OIDC Token 刷新              | 用 refresh_token 请求新 token      | 新 access_token 与原始不同                               | 功能  | P0  |
| TC-AUTH-SSO-007 | 多租户 SP 隔离                  | tenant_a 登录后尝试访问 tenant_b      | 本租户登录成功；跨租户访问返回 403                                | 安全  | P1  |
| TC-AUTH-SSO-008 | 无效 SAML Assertion 拒绝       | 不存在的用户凭据                       | 返回 error 状态，code=401                               | 安全  | P1  |
| TC-AUTH-SSO-009 | Token 过期处理                 | 使用已过期的 JWT                     | 验证时抛出异常                                            | 功能  | P1  |
| TC-AUTH-SSO-010 | 并发登录会话管理                   | 同一用户 OIDC 登录 3 次               | 生成 3 个不同的 session_id                               | 功能  | P1  |
| TC-AUTH-SSO-011 | Replay Attack 重放攻击检测       | 同一 Assertion ID 提交两次           | 第一次成功；第二次失败（重放检测）                                  | 安全  | P2  |
| TC-AUTH-SSO-012 | IdP Metadata 解析与验证         | 请求 IdP metadata                | 返回 issuer、sso_url、slo_url、supported_bindings       | 配置  | P2  |

---

## 认证安全 — LDAP 测试 (10)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AUTH-LDAP-001 | Simple Bind 认证成功 | 有效用户名+密码 | 返回非空 connection_id | 功能 | P0 |
| TC-AUTH-LDAP-002 | 无效凭据 Bind 拒绝 | 错误密码 | 抛出 LDAPAuthError | 安全 | P0 |
| TC-AUTH-LDAP-003 | 用户搜索（按 UID/邮箱） | 按 UID 搜索 | 返回 ≥1 条结果，uid 和 email 匹配 | 功能 | P0 |
| TC-AUTH-LDAP-004 | LDAP 注入防御 | 注入 payload（如 `*)(uid=*)`） | 每个 payload 抛出 LDAPInjectionError | 安全 | P0 |
| TC-AUTH-LDAP-005 | 组织树查询（OU 遍历） | 在 ou=students 下子树搜索 | 所有结果 DN 包含 "ou=students" | 功能 | P1 |
| TC-AUTH-LDAP-006 | 用户属性修改 | 修改用户 email 属性 | 修改成功，再次查询返回新 email | 功能 | P1 |
| TC-AUTH-LDAP-007 | 分页查询（大结果集） | page_size=2 分页搜索 | 每页 ≤2 条；总数 >2；分页 cookie 有效 | 功能 | P1 |
| TC-AUTH-LDAP-008 | 连接池管理 | 创建 3 个连接 | 连接池大小=3；所有连接释放成功 | 功能 | P1 |
| TC-AUTH-LDAP-009 | TLS/STARTTLS 连接验证 | 启用 TLS | is_tls_enabled()=True；后续 bind 成功 | 安全 | P2 |
| TC-AUTH-LDAP-010 | Anonymous Bind 限制 | 默认禁用匿名 bind | 匿名 bind 拒绝；启用后允许 bind 但限制 search/modify | 安全 | P2 |

---

## 认证安全 — Kerberos 测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AUTH-KRB-001 | TGT 请求与签发 | principal+密码 | 返回 TGT（type=TGT、principal、realm、session_key） | 功能 | P0 |
| TC-AUTH-KRB-002 | Service Ticket 请求 | 有效 TGT + 服务名 | 返回 ST（type=ST、service 和 principal 匹配） | 功能 | P0 |
| TC-AUTH-KRB-003 | 票据过期与续期 | 有效票据 | 验证通过；续期后 ticket_id 不变 | 功能 | P0 |
| TC-AUTH-KRB-004 | 重放攻击检测（时间戳校验） | 同一 ticket_id+时间戳提交两次 | 第一次成功；第二次抛出 KerberosError | 安全 | P1 |
| TC-AUTH-KRB-005 | 跨域票据授权（cross-realm） | 无信任关系时请求跨域票据 | 抛出 KerberosError；添加信任后成功 | 功能 | P1 |
| TC-AUTH-KRB-006 | 密钥轮换验证 | 请求 TGT→轮换密钥→再请求 TGT | 新 key_version 递增；旧 TGT 保留旧版本 | 安全 | P1 |
| TC-AUTH-KRB-007 | 无效票据拒绝 | 伪造票据 / 无效 principal | 均抛出 KerberosError | 安全 | P2 |
| TC-AUTH-KRB-008 | 票据缓存管理 | 同一 principal 多次请求 TGT，失效其中一个 | 缓存初始 ≥2 条；失效后减少 | 功能 | P2 |

---

## 认证安全 — 零信任测试 (10)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AUTH-ZT-001 | 设备态势评估（合规设备） | 设备信息（OS、杀毒、加密、补丁、防火墙） | compliant=True，score ≥ 60 | 功能 | P0 |
| TC-AUTH-ZT-002 | 不合规设备拒绝访问 | 不合规设备（Win XP、无杀毒/加密/补丁） | compliant=False，score < 60 | 安全 | P0 |
| TC-AUTH-ZT-003 | 上下文感知访问策略 | 正常访问上下文 | allowed=True | 功能 | P0 |
| TC-AUTH-ZT-004 | 地理位置异常检测 | geo_anomaly=True 的上下文 | allowed=False，policy="geo_anomaly" | 安全 | P0 |
| TC-AUTH-ZT-005 | 时间段访问限制 | 工作时间(hour=10) vs 夜间+不合规设备 | 工作时间允许；夜间拒绝 | 功能 | P1 |
| TC-AUTH-ZT-006 | 网络微分段策略 | 内网 IP(10.0.1.50) vs 外网 IP(1.2.3.4) | 内网 allowed=True；外网 allowed=True | 功能 | P1 |
| TC-AUTH-ZT-007 | 风险评分计算 | 低风险(无异常) vs 高风险(地理异常+新设备+失败) | 低风险 score=0；高风险 score>50 | 功能 | P1 |
| TC-AUTH-ZT-008 | 策略规则优先级冲突处理 | geo_anomaly 上下文 | allowed=False，policy="geo_anomaly" | 功能 | P1 |
| TC-AUTH-ZT-009 | 持续验证（会话中重新评估） | 初始正常→中途出现 geo_anomaly | 初始 valid=True；异常后 valid=False | 安全 | P2 |
| TC-AUTH-ZT-010 | 策略变更热加载 | 添加策略后 reload | 策略数量+1；reload 返回正确数量 | 配置 | P2 |

---

## 认证安全 — 会话管理测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AUTH-SES-001 | 会话创建与存储 | user_id + 设备元数据 | session_id 非空，user_id 匹配，valid=True | 功能 | P0 |
| TC-AUTH-SES-002 | 会话超时（绝对/空闲） | 创建会话，等待 1.1s（超时=1s） | 立即有效；超时后抛出 SessionError | 功能 | P0 |
| TC-AUTH-SES-003 | Session Fixation 防御 | 创建会话后 regenerate session_id | 新旧 session_id 不同；旧 id 验证失败 | 安全 | P0 |
| TC-AUTH-SES-004 | 并发会话数限制 | 同一用户创建 3 个会话（max=2） | 前 2 个成功；第 3 个抛出 SessionError | 安全 | P0 |
| TC-AUTH-SES-005 | 会话失效后拒绝请求 | 创建会话后 invalidate | 后续验证抛出 SessionError("invalidated") | 安全 | P1 |
| TC-AUTH-SES-006 | 跨设备会话管理 | 同一用户创建 laptop + mobile 会话 | get_user_sessions ≥ 2，含两种设备 | 功能 | P1 |
| TC-AUTH-SES-007 | 会话数据加密存储 | 含敏感数据的会话 | 原始数据不含明文；解密后可恢复 | 安全 | P1 |
| TC-AUTH-SES-008 | 会话续期机制 | 创建会话→等待→renew | 续期后 expires_at ≥ 原始值 | 功能 | P2 |

---

## 认证安全 — MFA 测试 (6)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AUTH-MFA-001 | TOTP 码生成与验证 | 生成 TOTP 码 | 6 位数字；verify 返回 True | 功能 | P0 |
| TC-AUTH-MFA-002 | MFA 注册流程 | 新用户注册 MFA | 返回 secret + 8 个 recovery_codes；is_registered=True | 功能 | P0 |
| TC-AUTH-MFA-003 | 无效 TOTP 码拒绝 | 验证 "000000" | 抛出 MFAError("Invalid TOTP") | 安全 | P1 |
| TC-AUTH-MFA-004 | MFA 绕过检测 | X-Skip-MFA / X-MFA-Bypass 请求头 | 检测到绕过；空请求头不触发 | 安全 | P1 |
| TC-AUTH-MFA-005 | 恢复码机制 | 同一恢复码使用两次 | 首次成功(remaining=7)；第二次抛出 MFAError | 功能 | P1 |
| TC-AUTH-MFA-006 | TOTP 时间窗口容忍 | 当前窗口 + 相邻时间窗口的 TOTP 码 | 均验证通过 | 功能 | P2 |

---

## 数据平台 — 本体测试 (10)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-DATA-ONT-001 | 实体创建（学生/课程/院系） | 查询 student/course/department 实体 | entity_type 匹配；student name="Alice" | 功能 | P0 |
| TC-DATA-ONT-002 | 关系创建（选修/所属/教授） | 查询 student 和 course 的关系 | student 出边 ≥2；course 入边 ≥2、出边 ≥1 | 功能 | P0 |
| TC-DATA-ONT-003 | 图遍历（BFS/DFS） | 从 student 节点 BFS/DFS 遍历 | BFS 含 student+course；DFS ≥3 个节点 | 功能 | P0 |
| TC-DATA-ONT-004 | 路径查询（最短路径） | student→department 最短路径 | 路径存在；起点 student_001，终点 dept_cs | 功能 | P0 |
| TC-DATA-ONT-005 | 实体更新与删除 | 添加临时实体→更新→删除 | 更新反映新值；删除后访问抛出 GraphDBError | 功能 | P1 |
| TC-DATA-ONT-006 | 关系级联删除 | 删除源实体 | 相关边被移除；目标实体仍存在 | 功能 | P1 |
| TC-DATA-ONT-007 | 循环检测（防止环形关系） | 创建 A→B→C→A 环 | detect_cycles() 返回 >0 个环 | 安全 | P1 |
| TC-DATA-ONT-008 | Schema 迁移（版本演进） | 迁移 schema 到 v2 | 返回 from/to 版本；schema_version=2 | 功能 | P1 |
| TC-DATA-ONT-009 | 大规模图性能（1000+ 节点） | 批量添加 1000 节点并顺序连边 | added=1000；shortest_path(0,999) 长度=1000 | 性能 | P2 |
| TC-DATA-ONT-010 | 孤立节点检测与清理 | 添加孤立节点 | find_isolated_nodes() 包含孤立节点；清理成功 | 功能 | P2 |

---

## 数据平台 — 管道测试 (10)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-DATA-PIP-001 | DAG 定义与拓扑排序 | ETL 管道任务 | extract < transform < load（拓扑顺序） | 功能 | P0 |
| TC-DATA-PIP-002 | 任务顺序执行 | 执行 ETL 管道 | status="completed"；所有任务完成 | 功能 | P0 |
| TC-DATA-PIP-003 | 任务失败重试 | 首次失败的任务 | 第二次 attempt=2；最终 status=completed | 功能 | P0 |
| TC-DATA-PIP-004 | 数据血缘记录 | 执行管道后查询血缘 | 血缘含 extract、transform→load 依赖 | 功能 | P0 |
| TC-DATA-PIP-005 | 并行任务执行 | source→(branch_a, branch_b)→merge | level0=[source]；level1=[a,b]；level2=[merge] | 功能 | P1 |
| TC-DATA-PIP-006 | 幂等性验证（重复执行） | 相同 idempotency_key 执行两次 | 两次返回相同 execution_id | 安全 | P1 |
| TC-DATA-PIP-007 | 循环依赖检测 | a→c, b→a, c→b 循环依赖 | check_circular=True；create_pipeline 抛出 PipelineError | 安全 | P1 |
| TC-DATA-PIP-008 | 任务超时处理 | 0.1s 任务 + 0.01s 超时 | task status="failed" | 功能 | P1 |
| TC-DATA-PIP-009 | 管道暂停与恢复 | 暂停管道→执行→恢复→执行 | 暂停时 skipped；恢复后 completed | 功能 | P2 |
| TC-DATA-PIP-010 | 跨管道依赖 | upstream→downstream 跨管道依赖 | downstream 血缘含 upstream:produce | 功能 | P2 |

---

## 数据平台 — 数仓测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-DATA-WH-001 | 表创建（Schema 定义） | 检查 students/grades 表 | table_exists 均返回 True | 功能 | P0 |
| TC-DATA-WH-002 | 数据插入与查询 | 查询全部 + 按名称过滤 | 总共 3 行；Alice 的 gpa=3.8 | 功能 | P0 |
| TC-DATA-WH-003 | 行级安全（多租户隔离） | 按 tenant 查询 | tenant_a 返回 2 行；tenant_b 返回 1 行 | 安全 | P0 |
| TC-DATA-WH-004 | SQL 注入防御 | SQL 注入 payload | 均抛出 SQLInjectionError | 安全 | P0 |
| TC-DATA-WH-005 | Schema 变更（ALTER TABLE） | ALTER TABLE 添加 major 列 | SELECT major 返回 3 行 | 功能 | P1 |
| TC-DATA-WH-006 | 聚合查询（GROUP BY/HAVING） | 按课程 GROUP BY + AVG | ≥1 条结果；CS101 平均分正确 | 功能 | P1 |
| TC-DATA-WH-007 | 多表联查（JOIN） | students JOIN grades | ≥3 条结果；Alice 有 2 条成绩记录 | 功能 | P1 |
| TC-DATA-WH-008 | 空表/空值边界处理 | 查询空表 + 统计行数 | 空查询返回 []；row_count=0 | 功能 | P2 |

---

## 数据平台 — 标签测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-DATA-TAG-001 | 标签创建与分类 | 查询 root 和 PII 标签 | root name="academic" category="classification"；PII category="sensitivity" | 功能 | P0 |
| TC-DATA-TAG-002 | 标签附加到实体 | 将标签附加到实体 | 实体标签列表含 "undergraduate" | 功能 | P0 |
| TC-DATA-TAG-003 | 标签层级关系（父子标签） | 查询标签层级 | 2 个子标签(undergrad, grad)；hierarchy 显示父路径 | 功能 | P0 |
| TC-DATA-TAG-004 | 按标签查询实体 | 按 tag_id 查询 | 两个已关联实体均被查到 | 功能 | P1 |
| TC-DATA-TAG-005 | 标签治理（审批流） | 提交标签审批 | 状态从 "pending" 变为 "approved" | 功能 | P1 |
| TC-DATA-TAG-006 | 标签批量操作 | 批量创建 3 个标签 + 附加到 3 个实体 | 3 个标签创建成功；3 个实体附加成功 | 功能 | P1 |
| TC-DATA-TAG-007 | 重复标签检测 | 创建同名标签 "unique" 两次 | 第二次抛出 TagError("Duplicate") | 安全 | P2 |
| TC-DATA-TAG-008 | 标签删除影响分析 | 删除含子标签和实体的父标签 | children_orphaned=1，entities_affected=1 | 功能 | P2 |

---

## 数据平台 — 分析测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-DATA-ANA-001 | 仪表板 API 调用 | 创建仪表板+查询，获取结果 | title 匹配；结果含 "total_students" | 功能 | P0 |
| TC-DATA-ANA-002 | 聚合计算正确性 | 按 dept 聚合 sum/avg | CS sum=263；Math avg=85.0 | 功能 | P0 |
| TC-DATA-ANA-003 | 数据导出（CSV/JSON） | 导出为 CSV 和 JSON | CSV 有 6 行含 "CS"；JSON 解析出 5 条 | 功能 | P0 |
| TC-DATA-ANA-004 | 时间序列聚合 | 按月聚合 | ≥2 个时间段；2024-01 count=2 | 功能 | P1 |
| TC-DATA-ANA-005 | 多维度交叉分析 | [dept, date] 交叉分析 | ≥3 条结果，含 department/date/sum 字段 | 功能 | P1 |
| TC-DATA-ANA-006 | 权限过滤（用户只看授权数据） | blocked 用户 vs allowed 用户 | blocked 抛出 AnalyticsError；allowed 返回结果 | 安全 | P1 |
| TC-DATA-ANA-007 | 大数据量分页 | 100 条数据，page_size=10 | 每页 10 条；total_pages=10 | 性能 | P2 |
| TC-DATA-ANA-008 | 空数据集边界处理 | 空数据集的聚合/导出/分页 | 返回 []/空字符串/{data:[], total:0} | 功能 | P2 |

---

## AI Agent — 生命周期测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AI-LCY-001 | Agent 创建 | 指定 agent_id 创建 | agent_id 匹配；state=CREATED | 功能 | P0 |
| TC-AI-LCY-002 | Agent 状态转换 | CREATED→RUNNING→STOPPED | 每次状态转换成功 | 功能 | P0 |
| TC-AI-LCY-003 | Agent 删除与清理 | 创建后删除 agent | 后续操作抛出 AgentError("not found") | 功能 | P0 |
| TC-AI-LCY-004 | 资源限制（最大并发） | max_concurrent=3，创建第 4 个 | 前 3 个成功；第 4 个抛出 AgentError("Max concurrent") | 安全 | P1 |
| TC-AI-LCY-005 | Agent 配置更新 | model="v1"→更新为 v2 | config 更新为 v2，temperature=0.7 | 功能 | P1 |
| TC-AI-LCY-006 | Agent 异常恢复 | ERROR 状态→转为 RUNNING | 恢复成功；state=RUNNING | 功能 | P1 |
| TC-AI-LCY-007 | 非法状态转换拒绝 | STOPPED→RUNNING | 抛出 AgentError（非法转换） | 安全 | P2 |
| TC-AI-LCY-008 | Agent 超时自动停止 | RUNNING + 0.1s 超时，等待 0.15s | timeout=True；agent 自动转为 STOPPED | 功能 | P2 |

---

## AI Agent — 认证上下文测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AI-AUTH-001 | Agent 继承用户 SSO Token | 用户 SSO token + 权限 | auth_context.token 匹配继承的 token | 功能 | P0 |
| TC-AI-AUTH-002 | Agent 权限不超过用户权限 | 检查继承的权限 | read:own_grades 允许；write:grades 拒绝 | 安全 | P0 |
| TC-AI-AUTH-003 | 权限提升攻击防御 | 尝试 admin 权限 | escalation_detected=True；"admin:delete" 在 attempted 中 | 安全 | P0 |
| TC-AI-AUTH-004 | Token 过期后 Agent 操作拒绝 | 过期 token | 抛出 AgentError("Token expired") | 安全 | P0 |
| TC-AI-AUTH-005 | 多角色用户权限合并 | 教师角色上下文 | read:class_grades / write:grades / query:courses 均允许 | 功能 | P1 |
| TC-AI-AUTH-006 | 权限上下文传递 | 带权限的数据查询 | 查询以用户权限执行；返回授权数据 | 功能 | P1 |
| TC-AI-AUTH-007 | 匿名用户 Agent 限制 | 无 auth context 的 agent | check_permission 抛出 AgentError("No auth context") | 安全 | P1 |
| TC-AI-AUTH-008 | 权限缓存一致性 | 中途更新权限 | 旧权限被拒绝；新权限被允许 | 功能 | P2 |

---

## AI Agent — 数据访问测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AI-DAT-001 | 权限范围内数据查询 | 带用户权限的查询 | 返回 [95, 88] | 功能 | P0 |
| TC-AI-DAT-002 | 越权查询拒绝 | 请求 read:all_grades | 权限检查返回 False | 安全 | P0 |
| TC-AI-DAT-003 | PII 自动脱敏 | 含手机/邮箱/SSN 的数据 | PII 被掩码；原始值不可见；含 PHONE_MASKED 标记 | 安全 | P0 |
| TC-AI-DAT-004 | 数据检索结果准确性 | 带预期结果的查询 | 结果与预期结构完全匹配 | 功能 | P0 |
| TC-AI-DAT-005 | 多数据源聚合查询 | 查询 graph + SQL 数据源 | graph 返回 nodes=10；SQL 返回 rows=5 | 功能 | P1 |
| TC-AI-DAT-006 | 查询结果缓存 | 同一查询执行两次 | 两次结果完全相同 | 功能 | P1 |
| TC-AI-DAT-007 | 数据访问审计记录 | 查询数据后获取审计日志 | 日志含 "data_query" action + query 详情 | 安全 | P1 |
| TC-AI-DAT-008 | 大结果集截断处理 | 10000 条数据 | 查询返回全部 10000 条 | 功能 | P2 |

---

## AI Agent — 安全护栏测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AI-SAF-001 | Prompt 注入检测（直接注入） | 注入 payload | 所有 payload detected=True | 安全 | P0 |
| TC-AI-SAF-002 | Prompt 注入检测（间接注入） | document_content 中嵌入注入 | detected=True，source="document_content"；安全内容 detected=False | 安全 | P0 |
| TC-AI-SAF-003 | 系统提示词泄漏防御 | 响应中含 "My instructions are:" | 泄漏 detected=True；正常响应 detected=False | 安全 | P0 |
| TC-AI-SAF-004 | 幻觉检测（事实核查） | 正确 GPA vs 错误 GPA | 正确数据 hallucination=False；错误数据 hallucination=True(expected=3.8, got=4.5) | 安全 | P0 |
| TC-AI-SAF-005 | 敏感输出过滤 | 含 password/api_key/token 的输出 | 所有敏感值替换为 [REDACTED] | 安全 | P1 |
| TC-AI-SAF-006 | 操作审计日志完整性 | 执行多个操作后查日志 | 日志含 create_agent/inherit_auth/state_transition/data_query | 功能 | P1 |
| TC-AI-SAF-007 | 速率限制（防滥用） | 连续 6 次查询（限制=5） | 前 5 次成功；第 6 次抛出 AgentError("Rate limit") | 安全 | P1 |
| TC-AI-SAF-008 | 安全事件告警 | 触发权限提升检测 | 安全告警含 "Privilege escalation" 详情 | 功能 | P2 |

---

## AI Agent — E2E 集成测试 (8)

| 编号 | 描述 | 输入 | 预期结果 | 类型 | 优先级 |
|------|------|------|----------|------|--------|
| TC-AI-INT-001 | 完整链路：登录→Agent→查询→响应 | SSO 登录→创建 Agent→查询数据 | 登录成功；Agent 继承 token；返回授权数据；PII 脱敏 | E2E | P0 |
| TC-AI-INT-002 | 学生查成绩 E2E（权限范围） | 学生权限查询成绩 | 返回 1 行(s001)；跨租户数据(s002)被排除 | E2E | P0 |
| TC-AI-INT-003 | 教师查班级数据 E2E（行级安全） | 教师权限查询班级数据 | tenant_a 返回 2 行；tenant_b 行被排除 | E2E | P0 |
| TC-AI-INT-004 | 攻击链路：注入→权限提升→数据泄漏 | 注入 payload + 提权尝试 | 注入被检测；提权被检测；数据查询阻断注入 | E2E | P0 |
| TC-AI-INT-005 | 认证服务故障时 Agent 降级 | 无 auth context 操作 | check_permission 抛出 AgentError | E2E | P1 |
| TC-AI-INT-006 | 数据服务故障时 Agent 降级 | 降级数据服务下查询 | fallback 返回空 results=[] | E2E | P1 |
| TC-AI-INT-007 | 并发用户 Agent 隔离 | 两个不同权限的 Agent | Agent A: write:grades=False；Agent B(教师): write:grades=True | E2E | P1 |
| TC-AI-INT-008 | 全链路审计日志验证 | 完整生命周期操作 | 日志含 create/inherit_auth/状态转换/query/security_alert；≥5 条 | E2E | P2 |

---

## 优先级说明 / Priority

| 优先级 | 说明 | 数量 |
|--------|------|------|
| P0 | 核心功能 + 安全，必须通过 | 60 |
| P1 | 重要功能，应该通过 | 53 |
| P2 | 增强功能，可选通过 | 25 |

## 执行命令 / Commands

```bash
# 激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 运行所有测试
pytest tests/ -v

# 按领域运行
pytest tests/test_auth/ -v          # 认证 (54)
pytest tests/test_data/ -v          # 数据 (44)
pytest tests/test_ai/ -v            # AI Agent (40)

# 按优先级运行
pytest tests/ -v -m P0              # 核心用例 (60)
pytest tests/ -v -m "P0 or P1"     # 核心 + 重要 (113)

# 按类型运行
pytest tests/ -v -m integration     # 集成测试
pytest tests/ -v -m security        # 安全测试

# 覆盖率
pytest tests/ --cov=src --cov-report=html
```

---

*文档版本: 1.0*
