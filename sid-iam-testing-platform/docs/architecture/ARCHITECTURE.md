# SID IAM 测试平台 — 架构设计

# SID IAM Testing Platform — Architecture

## 系统概览 / System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SID IAM Testing Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Pytest     │────▶│   Clients    │────▶│    Mock      │        │
│  │  Test Suite  │     │  (API 封装)   │     │  Services    │        │
│  │  (138 tests) │     │              │     │  (7 个服务)   │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│         │                                         │                  │
│         ▼                                         ▼                  │
│  ┌──────────────┐                         ┌──────────────┐          │
│  │   Reports    │                         │   Helpers    │          │
│  │  (HTML/Allure)│                        │ (Token/Graph) │          │
│  └──────────────┘                         └──────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 分层架构 / Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    测试层 Test Layer                              │
│  tests/test_auth/  │  tests/test_data/  │  tests/test_ai/      │
│    (54 tests)      │    (44 tests)      │    (40 tests)        │
├─────────────────────────────────────────────────────────────────┤
│                    Fixture 层 Fixture Layer                      │
│  conftest.py (root)  │  conftest.py (domain-level × 3)         │
│  session-level: mock services  │  function-level: test state   │
├─────────────────────────────────────────────────────────────────┤
│                    客户端层 Client Layer                          │
│  auth_client.py  │  data_client.py  │  agent_client.py         │
│  封装认证 API     │  封装数据平台 API  │  封装 AI Agent API       │
├─────────────────────────────────────────────────────────────────┤
│                    Mock 服务层 Mock Service Layer                 │
│  sso_provider  │ ldap_server │ kerberos_kdc │ graph_db         │
│  data_warehouse│ pipeline_engine │ tag_store │ ai_agent        │
├─────────────────────────────────────────────────────────────────┤
│                    工具层 Helper Layer                            │
│  token_factory.py  │  graph_helpers.py  │  assertion_helpers.py│
└─────────────────────────────────────────────────────────────────┘
```

## Mock 服务架构 / Mock Service Architecture

### 认证域 / Auth Domain

```
┌─────────────────────────────────────────────────────────────────┐
│                    认证 Mock 服务                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  sso_provider   │  │  ldap_server    │  │ kerberos_kdc   │  │
│  │  (FastAPI)      │  │  (Python dict)  │  │ (Token store)  │  │
│  ├─────────────────┤  ├─────────────────┤  ├────────────────┤  │
│  │ POST /saml/sso  │  │ bind(dn, pwd)   │  │ request_tgt()  │  │
│  │ POST /oidc/token│  │ search(base,    │  │ request_st()   │  │
│  │ POST /saml/slo  │  │        filter)  │  │ validate()     │  │
│  │ GET /oidc/      │  │ modify(dn,      │  │ check_replay() │  │
│  │     userinfo    │  │        changes) │  │ renew()        │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                  │
│  测试流程:                                                       │
│  User → sso_provider(SAML/OIDC) → token_factory(JWT) → assert  │
│  User → ldap_server(bind/search) → assert                       │
│  User → kerberos_kdc(TGT→ST) → assert                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 数据域 / Data Domain

```
┌─────────────────────────────────────────────────────────────────┐
│                    数据平台 Mock 服务                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   graph_db      │  │ pipeline_engine │  │ data_warehouse │  │
│  │ (networkx)      │  │ (拓扑排序)       │  │ (SQLite)       │  │
│  ├─────────────────┤  ├─────────────────┤  ├────────────────┤  │
│  │ add_entity()    │  │ add_task()      │  │ create_table() │  │
│  │ add_relation()  │  │ execute_dag()   │  │ execute_sql()  │  │
│  │ traverse()      │  │ get_lineage()   │  │ row_security() │  │
│  │ query_path()    │  │ retry_task()    │  │ schema_mgmt()  │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   tag_store     │  │  analytics API  │                      │
│  │  (Dict store)   │  │  (聚合计算)      │                      │
│  ├─────────────────┤  ├─────────────────┤                      │
│  │ create_tag()    │  │ aggregate()     │                      │
│  │ attach_tag()    │  │ dashboard()     │                      │
│  │ hierarchy()     │  │ export()        │                      │
│  │ governance()    │  │ time_series()   │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                  │
│  数据流:                                                         │
│  Source → pipeline_engine(DAG) → data_warehouse(SQL)            │
│       → tag_store(标签) → analytics(聚合/导出)                   │
│  graph_db: 独立的本体管理（实体-关系图）                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Agent 域 / AI Agent Domain

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Agent Mock 服务                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    ai_agent (规则引擎)                     │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  create_agent()   → Agent CRUD + 状态转换                │    │
│  │  inherit_auth()   → 继承调用者权限上下文                   │    │
│  │  query_data()     → 权限范围内数据检索                     │    │
│  │  check_safety()   → Prompt 注入检测 + PII 脱敏            │    │
│  │  audit_log()      → 操作审计记录                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                        │
│         ┌───────────────┼───────────────┐                       │
│         ▼               ▼               ▼                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ Auth Mock  │  │ Data Mock  │  │ Safety     │                │
│  │ (权限继承)  │  │ (数据检索)  │  │ Guardrails │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                  │
│  E2E 流程:                                                      │
│  User → ai_agent → inherit_auth(SSO token)                      │
│       → query_data(warehouse + graph_db)                        │
│       → check_safety(injection + PII)                           │
│       → Response                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Fixture 层级 / Fixture Hierarchy

```
conftest.py (root)
├── @pytest.fixture(scope="session")
│   ├── sso_provider      → FastAPI TestClient
│   ├── ldap_server        → Mock LDAP 实例
│   ├── kerberos_kdc       → Mock KDC 实例
│   ├── graph_db           → networkx.DiGraph 实例
│   ├── data_warehouse     → SQLite :memory: 连接
│   ├── pipeline_engine    → DAG 执行引擎
│   ├── tag_store          → 标签注册中心
│   └── ai_agent           → 规则引擎 Agent
│
├── tests/test_auth/conftest.py
│   ├── @pytest.fixture(scope="function")
│   │   ├── test_user       → 测试用户凭据
│   │   ├── saml_request    → SAML AuthnRequest
│   │   ├── oidc_request    → OIDC Authorization
│   │   ├── ldap_connection → LDAP 绑定连接
│   │   └── kerberos_ticket → TGT/ST
│
├── tests/test_data/conftest.py
│   ├── @pytest.fixture(scope="function")
│   │   ├── sample_ontology → 预填充图数据
│   │   ├── sample_pipeline → DAG 定义
│   │   ├── sample_schema   → 数仓表结构
│   │   ├── sample_tags     → 标签集合
│   │   └── sample_data     → 测试数据行
│
└── tests/test_ai/conftest.py
    ├── @pytest.fixture(scope="function")
    │   ├── agent_instance  → Agent 实例
    │   ├── user_context    → 用户权限上下文
    │   ├── injection_payloads → 注入攻击向量
    │   └── pii_samples     → PII 测试数据
```

## 跨域交互 / Cross-Domain Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                    E2E Integration Flow                        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  1. 用户认证                                                    │
│     User ──SSO──▶ sso_provider ──JWT──▶ token                 │
│                                                                │
│  2. Agent 继承权限                                              │
│     token ──▶ ai_agent.inherit_auth() ──▶ agent_context       │
│                                                                │
│  3. 数据查询（权限范围内）                                        │
│     agent_context ──▶ data_warehouse.execute_sql()             │
│                  ──▶ graph_db.traverse()                       │
│                  ──▶ tag_store.query()                         │
│                                                                │
│  4. 安全检查                                                    │
│     response ──▶ check_safety(injection + hallucination)       │
│              ──▶ mask_pii(response)                            │
│                                                                │
│  5. 审计记录                                                    │
│     ai_agent.audit_log(user, action, result)                   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## CI/CD 流水线 / CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                GitHub Actions (sid-iam-ci.yml)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐                                              │
│  │ Code Quality  │ ── black --check / flake8 / pylint           │
│  └───────────────┘                                              │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────┐                                              │
│  │  Unit Tests   │ ── pytest tests/ -m "not integration"        │
│  │  (108 tests)  │    --cov=src --cov-report=xml                │
│  └───────────────┘                                              │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────┐                                              │
│  │  Integration  │ ── pytest tests/ -m integration              │
│  │  (30 tests)   │    跨域交互测试                                │
│  └───────────────┘                                              │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────┐                                              │
│  │  Coverage     │ ── 覆盖率 ≥ 90% 门禁                         │
│  │  Report       │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构 / Directory Structure

```
sid-iam-testing-platform/
├── tests/                              # 测试套件 (138)
│   ├── conftest.py                     # 根级 fixture + markers
│   ├── test_auth/                      # 认证测试 (54)
│   │   ├── conftest.py                 # 认证 fixture
│   │   ├── test_sso.py               # SSO (12)
│   │   ├── test_ldap.py              # LDAP (10)
│   │   ├── test_kerberos.py          # Kerberos (8)
│   │   ├── test_zero_trust.py        # 零信任 (10)
│   │   ├── test_session.py           # 会话 (8)
│   │   └── test_mfa.py               # MFA (6)
│   ├── test_data/                      # 数据平台测试 (44)
│   │   ├── conftest.py                 # 数据 fixture
│   │   ├── test_ontology.py          # 本体 (10)
│   │   ├── test_pipeline.py          # 管道 (10)
│   │   ├── test_warehouse.py         # 数仓 (8)
│   │   ├── test_tag_platform.py      # 标签 (8)
│   │   └── test_analytics.py         # 分析 (8)
│   └── test_ai/                        # AI Agent 测试 (40)
│       ├── conftest.py                 # AI fixture
│       ├── test_agent_lifecycle.py    # 生命周期 (8)
│       ├── test_agent_auth.py         # 认证上下文 (8)
│       ├── test_agent_data_access.py  # 数据访问 (8)
│       ├── test_agent_safety.py       # 安全护栏 (8)
│       └── test_integration.py        # E2E 集成 (8)
├── src/
│   ├── config.py                       # 集中配置
│   ├── mock_services/                  # Mock 后端
│   │   ├── sso_provider.py           # FastAPI SSO
│   │   ├── ldap_server.py            # Mock LDAP
│   │   ├── kerberos_kdc.py           # Mock KDC
│   │   ├── graph_db.py               # networkx 图库
│   │   ├── data_warehouse.py         # SQLite 数仓
│   │   ├── pipeline_engine.py        # DAG 引擎
│   │   ├── tag_store.py              # 标签注册中心
│   │   └── ai_agent.py               # Mock Agent
│   ├── clients/                        # API 封装
│   │   ├── auth_client.py
│   │   ├── data_client.py
│   │   └── agent_client.py
│   └── helpers/                        # 工具函数
│       ├── token_factory.py           # JWT/SAML/Kerberos 令牌
│       ├── graph_helpers.py           # 图查询构建器
│       └── assertion_helpers.py       # 自定义断言
├── docs/                               # 文档
├── scripts/                            # 运行脚本
├── reports/                            # 测试报告输出
├── pytest.ini
├── pyproject.toml
├── requirements.txt
├── .gitignore
├── .env.example
├── CLAUDE.md
└── README.md
```

---

**Author**: Michael Zhou
**Version**: 1.0
