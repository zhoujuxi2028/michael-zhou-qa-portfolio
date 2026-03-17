# SID IAM 测试平台 — 需求文档

# SID IAM Testing Platform — Requirements

## 1. 产品领域分析 / Product Domain Analysis

SID 是高校 IAM 产品（以 SSO 为核心），扩展至数据分析（本体、管道、数仓、标签、分析）并具备 AI Agent 能力。

SID is a university IAM product (SSO core), expanding into data analytics (ontology, pipelines, warehouse, tags, analytics) with AI Agent capabilities.

| 领域 / Domain | 组件 / Components | 数据流 / Data Flow | 质量风险 / Quality Risks |
| ------------ | ---------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| **认证 Auth** | SSO, LDAP, Kerberos, MFA, Zero Trust | User→IdP→SP（令牌流） | 权限提升、会话劫持、注入、重放 |
| **数据 Data** | Ontology, Pipeline, Warehouse, Tags, Analytics | Source→Pipeline→Warehouse→Tags→Analytics | 数据丢失、Schema 漂移、权限泄漏 |
| **AI Agent** | Engine, Auth Proxy, Data Retrieval, Safety | User→Agent→(Auth+Data)→Response | Prompt 注入、权限提升、幻觉、PII 泄漏 |

## 2. 核心概念 / Key Concepts

### 认证 / Authentication

| 概念 / Concept | 定义 / Definition | 在 SID 中的作用 / Role in SID |
| -------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **IAM** | 身份与访问管理 Identity and Access Management | 核心定位 — 管理"谁能访问什么" |
| **SSO** | 单点登录 Single Sign-On | 基础功能 — 一次登录访问所有校园系统 |
| **SAML 2.0** | 基于 XML 的认证协议 | SSO 协议 — IdP 向 SP 发送 Assertion |
| **OIDC** | OpenID Connect（OAuth 2.0 身份层） | SSO 协议 — 返回 JWT ID Token |
| **IdP** | 身份提供者 Identity Provider | SID 本身 — 验证用户身份 |
| **SP** | 服务提供者 Service Provider | 依赖 SID 认证的校园应用 |
| **LDAP** | 轻量级目录访问协议 | 用户/组织目录（姓名、部门、角色） |
| **Kerberos** | 基于票据的网络认证协议 | 通过 KDC 签发 TGT + 服务票据的企业认证 |
| **MFA** | 多因素认证 Multi-Factor Authentication | TOTP/SMS 作为第二因素 |
| **Zero Trust** | "永不信任，始终验证" | 每次访问均需验证身份 + 设备 + 上下文 |
| **Session Fixation** | 攻击者预设 Session ID | 认证后必须重新生成 Session ID |

### 数据平台 / Data Platform

| 概念 / Concept | 定义 / Definition | 在 SID 中的作用 / Role in SID |
|---------|-----------|-------------|
| **Ontology** | 形式化知识表示 | 图模型：学生-选修-课程-所属-院系 |
| **Graph DB** | 节点/边存储（如 Neo4j） | 存储本体，支持关系遍历 |
| **Pipeline** | 自动化数据处理流程 | ETL：从教务系统抽取→转换→加载到数仓 |
| **DAG** | 有向无环图 Directed Acyclic Graph | 管道执行顺序的任务依赖图 |
| **Data Warehouse** | 面向分析的数据存储 | 集中式数据，用于报表和 BI |
| **Tag Platform** | 实体标签系统 | 标记学生（如"荣誉生"、"助学金"）用于分析 |
| **Data Lineage** | 端到端数据追踪 | 追溯报表数据来源 — 审计与调试 |
| **Row-Level Security** | 按用户行级过滤 | A 院系只能看到 A 院系的数据 |

### AI Agent

| 概念 / Concept | 定义 / Definition | 在 SID 中的作用 / Role in SID |
|---------|-----------|-------------|
| **AI Agent** | 具有工具访问能力的自主任务执行 AI | 用户通过对话查询数据、生成报告 |
| **Permission Inheritance** | Agent 继承调用者权限 | 学生的 Agent 只能查询自己的成绩 |
| **Prompt Injection** | 精心构造的输入欺骗 AI 执行非预期操作 | 攻击者试图泄漏系统提示词或提升权限 |
| **Hallucination** | AI 生成看似合理但虚假的信息 | Agent 声称"GPA 4.0"但数据库无记录 |
| **PII Masking** | 隐藏个人身份信息 | 在 Agent 响应中遮蔽身份证号、手机号 |
| **Guardrails** | 输入/输出安全检查 | 检测注入、过滤敏感输出、验证事实 |

## 3. 功能需求 / Functional Requirements

### FR-1: 认证安全 / Authentication Security

| ID | 需求 / Requirement | 优先级 / Priority | 验证方式 / Verification |
|----|------------|----------|-------------|
| FR-1.1 | SSO 登录流程（SAML/OIDC）正确性 | P0 | Mock IdP + 断言验证 |
| FR-1.2 | LDAP 认证与目录查询 | P0 | Mock LDAP 服务 |
| FR-1.3 | Kerberos 票据生命周期管理 | P1 | Mock KDC |
| FR-1.4 | 零信任策略引擎评估 | P1 | 策略规则引擎测试 |
| FR-1.5 | 会话管理（超时、并发、固定） | P0 | 状态机验证 |
| FR-1.6 | MFA 多因素认证 | P1 | TOTP 算法验证 |
| FR-1.7 | 安全防御（注入、重放、劫持） | P0 | 攻击模式模拟 |

### FR-2: 数据平台 / Data Platform

| ID | 需求 / Requirement | 优先级 / Priority | 验证方式 / Verification |
|----|------------|----------|-------------|
| FR-2.1 | 本体模型 CRUD 与图遍历 | P0 | networkx 图操作 |
| FR-2.2 | 管道 DAG 编排与执行 | P0 | 拓扑排序 + 状态跟踪 |
| FR-2.3 | 数仓 Schema 管理与查询正确性 | P1 | SQLite 执行验证 |
| FR-2.4 | 标签平台层级管理与治理 | P1 | CRUD + 审批流模拟 |
| FR-2.5 | 分析 API 与聚合计算 | P1 | 结果对比验证 |
| FR-2.6 | 数据血缘追踪 | P2 | 管道元数据记录 |
| FR-2.7 | 行级安全（多租户数据隔离） | P0 | 权限上下文切换 |

### FR-3: AI Agent

| ID | 需求 / Requirement | 优先级 / Priority | 验证方式 / Verification |
|----|------------|----------|-------------|
| FR-3.1 | Agent 生命周期管理 | P1 | 状态转换验证 |
| FR-3.2 | Agent 继承用户认证上下文 | P0 | 权限链验证 |
| FR-3.3 | Agent 数据访问权限控制 | P0 | 角色切换测试 |
| FR-3.4 | Prompt 注入防御 | P0 | 攻击向量库 |
| FR-3.5 | 幻觉检测与护栏 | P1 | 事实核查规则 |
| FR-3.6 | PII 脱敏 | P0 | 模式匹配验证 |
| FR-3.7 | 审计日志完整性 | P1 | 日志断言 |
| FR-3.8 | 跨域 E2E 集成 | P0 | 全链路场景 |

## 4. 非功能需求 / Non-Functional Requirements

| ID | 需求 / Requirement | 标准 / Standard | 验证方式 / Verification |
|----|------------|----------|-------------|
| NFR-1 | 测试独立运行 | 不依赖真实 SID | 全 Mock 架构 |
| NFR-2 | 代码质量 | pylint ≥ 9.0, black 格式化, 覆盖率 ≥ 90% | CI 质量门禁 |
| NFR-3 | 文档完整性 | 架构、测试目录、执行报告 | 文档审查 |
| NFR-4 | CI/CD 集成 | GitHub Actions 自动运行 | 工作流验证 |
| NFR-5 | 可维护性 | 模块化 fixture，client-mock 分离 | 代码审查 |
| NFR-6 | 作品集呈现 | 清晰 README、专业结构、技术深度 | 同行评审 |

## 5. 测试策略 / Test Strategy

```
测试金字塔 / Test Pyramid:
    ┌─────────┐
    │ E2E (8) │ ← 跨域（Agent→Auth→Data→Response）
    ├─────────┤
    │集成 Intg.│ ← 组件交互（Auth+Data, Agent+Auth）
    │  (30)   │
    ├─────────┤
    │  单元   │ ← 单组件（各 Mock 服务独立测试）
    │  (100)  │
    └─────────┘
```

| 类型 / Type | 数量 / Count | 频率 / Frequency | Mock 层级 / Mock Level |
|------|-------|-----------|-----------|
| 单元 Unit | ~100 | 每次提交 Every commit | 单服务 Single service |
| 集成 Integration | ~30 | 每次提交 Every commit | 多服务 Multi-service |
| E2E | ~8 | PR / 手动 manual | 全链路 Full chain |

## 6. 测试覆盖矩阵 / Test Coverage Matrix

| 领域 / Domain | 模块 / Module | 用例数 / Tests | TC ID 范围 / TC ID Range | 关键场景 / Key Scenarios |
|--------|--------|-------|-------------|---------------|
| Auth | test_sso | 12 | TC-AUTH-SSO-001~012 | SAML/OIDC 流程、登出、多租户 |
| Auth | test_ldap | 10 | TC-AUTH-LDAP-001~010 | 绑定、搜索、注入防御、TLS |
| Auth | test_kerberos | 8 | TC-AUTH-KRB-001~008 | TGT、服务票据、重放检测 |
| Auth | test_zero_trust | 10 | TC-AUTH-ZT-001~010 | 设备态势、上下文感知、微分段 |
| Auth | test_session | 8 | TC-AUTH-SES-001~008 | 超时、固定、并发限制 |
| Auth | test_mfa | 6 | TC-AUTH-MFA-001~006 | TOTP、注册、绕过检测 |
| Data | test_ontology | 10 | TC-DATA-ONT-001~010 | 实体 CRUD、图遍历、迁移 |
| Data | test_pipeline | 10 | TC-DATA-PIP-001~010 | DAG 执行、血缘、重试、幂等 |
| Data | test_warehouse | 8 | TC-DATA-WH-001~008 | Schema、查询、行级安全 |
| Data | test_tag_platform | 8 | TC-DATA-TAG-001~008 | 标签 CRUD、层级、治理 |
| Data | test_analytics | 8 | TC-DATA-ANA-001~008 | 仪表板 API、聚合、导出 |
| AI | test_agent_lifecycle | 8 | TC-AI-LCY-001~008 | CRUD、状态转换、资源限制 |
| AI | test_agent_auth | 8 | TC-AI-AUTH-001~008 | 上下文继承、权限提升 |
| AI | test_agent_data | 8 | TC-AI-DAT-001~008 | 权限范围查询、PII 脱敏 |
| AI | test_agent_safety | 8 | TC-AI-SAF-001~008 | Prompt 注入、幻觉、审计 |
| AI | test_integration | 8 | TC-AI-INT-001~008 | E2E 跨域、故障级联 |
| | **合计 Total** | **138** | | |

## 7. Mock 服务架构 / Mock Service Architecture

| Mock 服务 | 实现方式 / Implementation | 用途 / Purpose |
|------|---------------|---------|
| sso_provider | FastAPI（session fixture） | SAML/OIDC 端点模拟 |
| ldap_server | Python dict + LDAP 风格 API | 绑定、搜索、修改 |
| kerberos_kdc | 令牌存储 + 时间戳校验 | 票据生命周期管理 |
| graph_db | networkx.DiGraph | 本体图遍历 |
| data_warehouse | SQLite `:memory:` | 真实 SQL 执行 |
| pipeline_engine | Dict + 拓扑排序 | DAG 编排执行 |
| ai_agent | 规则匹配引擎 | 安全护栏模拟 |

## 8. 约束与假设 / Constraints & Assumptions

**约束 / Constraints:**
- 无真实 SID 实例 → 全 Mock 架构
- 作品集项目 → 代码质量和文档 > 功能完整性
- 遵循现有作品集结构约定

**假设 / Assumptions:**
- SID SSO 基于标准 SAML 2.0 / OIDC
- 数据平台 API 遵循 RESTful 设计
- AI Agent 通过 API 与认证/数据服务交互
- 图数据库用于本体管理（实体-关系建模）

## 9. 实施阶段 / Implementation Phases

| 子阶段 / Sub-phase | 内容 / Content | 新增测试 / New Tests | 累计 / Cumulative |
|-----------|---------|-----------|------------|
| 3.1 | 脚手架 + 认证核心（SSO, LDAP） | 22 | 22 |
| 3.2 | 认证完成（Kerberos, ZT, Session, MFA） | 32 | 54 |
| 3.3 | 数据平台（全部 5 个模块） | 44 | 98 |
| 3.4 | AI Agent（全部 5 个模块） | 40 | 138 |
