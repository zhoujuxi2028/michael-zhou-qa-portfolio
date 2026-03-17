# SID IAM Testing Platform

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Pytest](https://img.shields.io/badge/Pytest-7.4+-green.svg)](https://pytest.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Mock%20Services-009688.svg)](https://fastapi.tiangolo.com/)

---

## 目录

- [项目简介](#项目简介)
- [测试领域](#测试领域)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [Mock 服务架构](#mock-服务架构)
- [技术栈](#技术栈)
- [文档](#文档)

---

## 项目简介

高校 IAM 产品（SID）测试平台，覆盖**认证安全**、**数据平台**和 **AI Agent** 三大领域。所有测试通过 mock 服务运行，无需真实 SID 环境。

| 指标 | 数值 |
|-----|------|
| 测试用例 | 138 |
| 测试领域 | 3（认证、数据、AI） |
| Mock 服务 | 12 |
| 覆盖率 | 81%（Mock 服务 80-94%） |
| 全部通过 | 138/138 PASSED |

## 测试领域

### 1. 认证安全（54 测试）

| 模块 | 用例数 | 关键场景 |
|------|-------|---------|
| SSO | 12 | SAML/OIDC 流程、登出、多租户 |
| LDAP | 10 | 绑定、搜索、注入防御、TLS |
| Kerberos | 8 | TGT、服务票据、重放检测 |
| 零信任 | 10 | 设备态势、上下文感知 |
| 会话 | 8 | 超时、固定、并发限制 |
| MFA | 6 | TOTP、注册、绕过检测 |

### 2. 数据平台（44 测试）

| 模块 | 用例数 | 关键场景 |
|------|-------|---------|
| 本体 | 10 | 实体 CRUD、图遍历、迁移 |
| 管道 | 10 | DAG 执行、血缘、重试、幂等 |
| 数仓 | 8 | Schema、查询、行级安全 |
| 标签 | 8 | 标签 CRUD、层级、治理 |
| 分析 | 8 | 仪表板 API、聚合、导出 |

### 3. AI Agent（40 测试）

| 模块 | 用例数 | 关键场景 |
|------|-------|---------|
| 生命周期 | 8 | CRUD、状态转换、资源限制 |
| 认证 | 8 | 上下文继承、权限提升 |
| 数据访问 | 8 | 权限范围查询、PII 脱敏 |
| 安全 | 8 | Prompt 注入、幻觉、审计 |
| 集成 | 8 | E2E 跨域、故障级联 |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio

# 激活虚拟环境
python3 -m venv venv
source venv/bin/activate

cd sid-iam-testing-platform

# 安装依赖
pip install -r requirements.txt

# 运行所有测试
pytest tests/ -v

# 按领域运行
pytest tests/test_auth/ -v      # 认证 (54)
pytest tests/test_data/ -v      # 数据 (44)
pytest tests/test_ai/ -v        # AI Agent (40)

# 覆盖率
pytest tests/ --cov=src --cov-report=html
```

## 项目结构

```
sid-iam-testing-platform/
├── tests/                              # Pytest 测试套件 (138)
│   ├── conftest.py                     # 根级 fixture、markers、配置
│   ├── test_auth/                      # 认证测试 (54)
│   │   ├── conftest.py                 # 认证 fixture（mock LDAP/Kerberos）
│   │   ├── test_sso.py                # SSO 登录流程 (12)
│   │   ├── test_ldap.py               # LDAP 认证与目录 (10)
│   │   ├── test_kerberos.py           # Kerberos 票据生命周期 (8)
│   │   ├── test_zero_trust.py         # 零信任策略引擎 (10)
│   │   ├── test_session.py            # 会话管理 (8)
│   │   └── test_mfa.py                # 多因素认证 (6)
│   ├── test_data/                      # 数据平台测试 (44)
│   │   ├── conftest.py                 # 数据 fixture（mock 图库/数仓）
│   │   ├── test_ontology.py           # 本体 CRUD 与图遍历 (10)
│   │   ├── test_pipeline.py           # 数据管道编排 (10)
│   │   ├── test_warehouse.py          # 数仓查询与 Schema (8)
│   │   ├── test_tag_platform.py       # 标签管理与治理 (8)
│   │   └── test_analytics.py          # 分析 API 与聚合 (8)
│   └── test_ai/                        # AI Agent 测试 (40)
│       ├── conftest.py                 # AI fixture（mock LLM/Agent）
│       ├── test_agent_lifecycle.py     # Agent CRUD 与状态 (8)
│       ├── test_agent_auth.py          # Agent 认证上下文 (8)
│       ├── test_agent_data_access.py   # Agent 数据检索 (8)
│       ├── test_agent_safety.py        # 安全护栏 (8)
│       └── test_integration.py         # 跨域 E2E 集成 (8)
├── src/
│   ├── config.py                       # 集中配置
│   ├── mock_services/                  # Mock 后端服务 (12)
│   │   ├── sso_provider.py            # FastAPI SAML/OIDC 模拟
│   │   ├── ldap_server.py             # 字典实现的 LDAP
│   │   ├── kerberos_kdc.py            # Mock 密钥分发中心
│   │   ├── zero_trust_engine.py       # 零信任策略引擎
│   │   ├── session_manager.py         # 会话管理（超时/加密）
│   │   ├── mfa_provider.py            # TOTP 多因素认证
│   │   ├── graph_db.py                # networkx 图数据库
│   │   ├── data_warehouse.py          # SQLite :memory: 数仓
│   │   ├── pipeline_engine.py         # DAG 执行引擎
│   │   ├── tag_store.py               # 标签注册中心
│   │   ├── analytics_engine.py        # 分析聚合引擎
│   │   └── ai_agent.py                # 规则引擎 mock Agent
│   ├── clients/                        # API 封装层
│   │   ├── auth_client.py             # 认证 API 封装
│   │   ├── data_client.py             # 数据平台 API 封装
│   │   └── agent_client.py            # AI Agent API 封装
│   └── helpers/                        # 工具函数
│       ├── token_factory.py           # JWT/SAML/Kerberos 令牌生成
│       ├── graph_helpers.py           # 图查询构建器
│       └── assertion_helpers.py       # 自定义断言
├── docs/                               # 项目文档
│   ├── REQUIREMENTS.md                # 需求文档
│   ├── WBS.md                         # 工作分解结构
│   ├── ARCHITECTURE.md                # 架构设计
│   ├── TEST-CASES.md                  # 测试用例目录
│   ├── DESIGN-DECISIONS.md            # 设计决策
│   ├── TEST-REPORT.md                 # 测试报告（Phase 4）
│   └── FAQ.md                         # 常见问题（Phase 4）
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

## Mock 服务架构

| Mock 服务 | 实现方式 | 用途 |
|-----------|---------|------|
| sso_provider | FastAPI（session fixture） | SAML/OIDC 端点模拟 |
| ldap_server | Python dict + LDAP 风格 API | 绑定、搜索、修改 |
| kerberos_kdc | 令牌存储 + 时间戳校验 | 票据生命周期管理 |
| zero_trust_engine | 策略规则引擎 | 设备态势、风险评分 |
| session_manager | 内存存储 + 加密 | 会话超时、并发限制 |
| mfa_provider | TOTP 算法 | 多因素认证、恢复码 |
| graph_db | networkx.DiGraph | 本体图遍历 |
| data_warehouse | SQLite `:memory:` | 真实 SQL 执行 |
| pipeline_engine | Dict + 拓扑排序 | DAG 编排执行 |
| tag_store | Dict 存储 | 标签 CRUD、层级、治理 |
| analytics_engine | 聚合计算 | 仪表板、导出、分页 |
| ai_agent | 规则匹配引擎 | 安全护栏模拟 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | Python 3.9+ |
| 测试框架 | Pytest, pytest-cov, pytest-html, Allure |
| Mock 服务 | FastAPI, networkx, SQLite |
| 令牌处理 | PyJWT, cryptography |
| 代码质量 | pylint, flake8, black, isort |
| CI/CD | GitHub Actions |

## 文档

- [需求文档](docs/REQUIREMENTS.md) — 功能与非功能需求
- [WBS](docs/WBS.md) — 工作分解结构
- [架构设计](docs/ARCHITECTURE.md) — 分层架构、Mock 服务、Fixture 层级
- [测试用例目录](docs/TEST-CASES.md) — 138 个用例详细定义
- [设计决策](docs/DESIGN-DECISIONS.md) — 10 个关键设计决策
- 测试报告（Phase 4）

---

## Author

**Michael Zhou** | [GitHub](https://github.com/zhoujuxi2028) | zhou_juxi@hotmail.com

---

*阶段: 实现完成 | License: MIT*
