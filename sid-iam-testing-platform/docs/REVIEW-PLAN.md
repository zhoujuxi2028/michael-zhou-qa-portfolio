# SID IAM 测试用例复习计划（5 天）

基于 138 个测试用例，按「认证 → 数据 → AI」依赖顺序，每天 1-2 个模块，逐步深入。

## 复习策略

每个模块 4 步：
1. **读用例**（TEST-CASES.md）— 理解测什么
2. **读代码**（tests/）— 理解怎么测
3. **读实现**（src/mock_services/）— 理解被测系统
4. **跑测试**（pytest）— 验证理解

---

## Day 1：认证基础（SSO + LDAP + MFA = 28 tests）⭐⭐

### 上午：SSO（12 tests）— 「门禁刷卡」

| 重点 | 文件 |
|------|------|
| 测试用例 | TEST-CASES.md 第 44-60 行 |
| 测试代码 | tests/test_auth/test_sso.py |
| 底层实现 | src/mock_services/sso_provider.py |

```bash
pytest tests/test_auth/test_sso.py -v
```

**核心问题：**
- SAML 和 OIDC 的区别？（两种刷卡方式）
- 篡改签名为什么抛异常？（防伪造门禁卡）
- 多租户隔离怎么实现？（A 公司的卡进不了 B 公司）

### 下午：LDAP（10 tests）+ MFA（6 tests）— 「通讯录 + 双重验证」

| 重点 | 文件 |
|------|------|
| LDAP 测试 | tests/test_auth/test_ldap.py |
| LDAP 实现 | src/mock_services/ldap_server.py |
| MFA 测试 | tests/test_auth/test_mfa.py |

```bash
pytest tests/test_auth/test_ldap.py tests/test_auth/test_mfa.py -v
```

**核心问题：**
- LDAP 注入和 SQL 注入有什么类似？（都是往查询里塞恶意代码）
- TOTP 时间窗口容忍是什么？（手机时间差几秒也能验证通过）

### Day 1 验证

```bash
pytest tests/test_auth/test_sso.py tests/test_auth/test_ldap.py tests/test_auth/test_mfa.py -v
```

---

## Day 2：认证进阶（Kerberos + Zero Trust + Session = 26 tests）⭐⭐⭐

### 上午：Kerberos（8 tests）— 「电影票系统」

| 重点 | 文件 |
|------|------|
| 测试用例 | TEST-CASES.md 第 80-92 行 |
| 测试代码 | tests/test_auth/test_kerberos.py |
| 底层实现 | src/mock_services/kerberos_kdc.py |

```bash
pytest tests/test_auth/test_kerberos.py -v
```

**核心问题：**
- TGT 和 ST 的关系？（先买会员卡 TGT，再换电影票 ST）
- 重放攻击怎么防？（同一张票不能用两次）
- 跨域授权是什么场景？（A 电影院的卡能不能去 B 电影院用）

### 下午：Zero Trust（10 tests）+ Session（8 tests）— 「每次都查身份 + 会话管理」

| 重点 | 文件 |
|------|------|
| 零信任测试 | tests/test_auth/test_zero_trust.py |
| 会话测试 | tests/test_auth/test_session.py |

```bash
pytest tests/test_auth/test_zero_trust.py tests/test_auth/test_session.py -v
```

**核心问题：**
- 零信任 vs 传统安全？（传统：进门就信任；零信任：每次开门都刷卡）
- 设备态势评估看什么？（OS、杀毒、补丁、加密）
- Session Fixation 攻击？（偷别人的会话 ID 冒充身份）

### Day 2 验证

```bash
pytest tests/test_auth/test_kerberos.py tests/test_auth/test_zero_trust.py tests/test_auth/test_session.py -v
```

---

## Day 3：数据平台（Ontology + Pipeline + Warehouse = 28 tests）⭐⭐

### 上午：Ontology（10 tests）+ Pipeline（10 tests）— 「关系图 + 流水线」

| 重点 | 文件 |
|------|------|
| 本体测试 | tests/test_data/test_ontology.py |
| 本体实现 | src/mock_services/graph_db.py |
| 管道测试 | tests/test_data/test_pipeline.py |
| 管道实现 | src/mock_services/pipeline_engine.py |

```bash
pytest tests/test_data/test_ontology.py tests/test_data/test_pipeline.py -v
```

**核心问题：**
- BFS vs DFS？（BFS 一层层扩散；DFS 一条路走到黑）
- DAG 为什么不能有环？（流水线会死循环）
- 幂等性？（同一操作执行两次，结果不变）

### 下午：Warehouse（8 tests）— 「带权限的数据库」

| 重点 | 文件 |
|------|------|
| 数仓测试 | tests/test_data/test_warehouse.py |
| 数仓实现 | src/mock_services/data_warehouse.py |

```bash
pytest tests/test_data/test_warehouse.py -v
```

**核心问题：**
- 行级安全怎么实现？（按 tenant_id 过滤）
- SQL 注入的 5 种模式？

### Day 3 验证

```bash
pytest tests/test_data/test_ontology.py tests/test_data/test_pipeline.py tests/test_data/test_warehouse.py -v
```

---

## Day 4：数据平台 + AI Agent 基础（Tag + Analytics + Lifecycle + Auth = 30 tests）⭐⭐⭐

### 上午：Tag（8 tests）+ Analytics（8 tests）— 「便利贴 + 报表」

| 重点 | 文件 |
|------|------|
| 标签测试 | tests/test_data/test_tag_platform.py |
| 标签实现 | src/mock_services/tag_store.py |
| 分析测试 | tests/test_data/test_analytics.py |
| 分析实现 | src/mock_services/analytics_engine.py |

```bash
pytest tests/test_data/test_tag_platform.py tests/test_data/test_analytics.py -v
```

### 下午：AI Lifecycle（8 tests）+ AI Auth（8 tests）— 「实习生的入职和权限」

| 重点 | 文件 |
|------|------|
| 生命周期测试 | tests/test_ai/test_agent_lifecycle.py |
| 认证上下文测试 | tests/test_ai/test_agent_auth.py |
| AI 实现 | src/mock_services/ai_agent.py |

```bash
pytest tests/test_ai/test_agent_lifecycle.py tests/test_ai/test_agent_auth.py -v
```

**核心问题：**
- Agent 状态机合法转换？（CREATED→RUNNING→STOPPED，不可逆）
- 权限继承核心原则？（Agent 权限 ≤ 用户权限）

### Day 4 验证

```bash
pytest tests/test_data/test_tag_platform.py tests/test_data/test_analytics.py tests/test_ai/test_agent_lifecycle.py tests/test_ai/test_agent_auth.py -v
```

---

## Day 5：AI Agent 高级 + 全链路（Data Access + Safety + Integration = 24 tests）⭐⭐⭐⭐

### 上午：Data Access（8 tests）+ Safety（8 tests）— 「查数据 + 安全护栏」

| 重点 | 文件 |
|------|------|
| 数据访问测试 | tests/test_ai/test_agent_data_access.py |
| 安全护栏测试 | tests/test_ai/test_agent_safety.py |

```bash
pytest tests/test_ai/test_agent_data_access.py tests/test_ai/test_agent_safety.py -v
```

**核心问题：**
- PII 脱敏的 4 种正则？（手机、邮箱、SSN、身份证）
- query_data() 的 5 道安全关卡？
- Prompt 注入的直接 vs 间接区别？

### 下午：E2E Integration（8 tests）— 「全链路串联」

| 重点 | 文件 |
|------|------|
| 集成测试 | tests/test_ai/test_integration.py |

```bash
pytest tests/test_ai/test_integration.py -v
```

**关键链路：**
- 登录 → Agent 继承权限 → 查数据 → PII 脱敏 → 返回
- 攻击链路：注入 → 提权 → 数据泄漏（全部被拦截）

### Day 5 验证

```bash
pytest tests/test_ai/test_agent_data_access.py tests/test_ai/test_agent_safety.py tests/test_ai/test_integration.py -v
```

---

## 最终验证

```bash
# 全部 138 个测试
pytest tests/ -v
```

## 进度汇总

| 天数 | 领域 | 模块 | 测试数 | 难度 |
|------|------|------|--------|------|
| Day 1 | Auth | SSO + LDAP + MFA | 28 | ⭐⭐ |
| Day 2 | Auth | Kerberos + Zero Trust + Session | 26 | ⭐⭐⭐ |
| Day 3 | Data | Ontology + Pipeline + Warehouse | 28 | ⭐⭐ |
| Day 4 | Data + AI | Tag + Analytics + Lifecycle + Auth | 30 | ⭐⭐⭐ |
| Day 5 | AI | Data Access + Safety + Integration | 24 | ⭐⭐⭐⭐ |
| **合计** | | **16 个模块** | **136** | |
