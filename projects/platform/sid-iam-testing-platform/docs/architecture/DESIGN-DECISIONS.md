# SID IAM 测试平台 — 设计决策

# SID IAM Testing Platform — Design Decisions

## DD-1: 全 Mock 架构 / Full Mock Architecture

| 项目       | 内容                                              |
| -------- | ----------------------------------------------- |
| **决策**   | 所有测试通过 Mock 服务运行，不依赖真实 SID 实例                   |
| **备选方案** | A) 搭建真实 SID 环境 B) 使用 Docker 模拟 C) 全 Mock        |
| **选择理由** | 作品集项目无法获取真实 SID；Docker 增加 CI 复杂度；Mock 可控、快速、可复现 |
| **影响**   | 需要为 7 个服务编写 Mock 实现；测试覆盖的是"接口契约"而非"真实行为"        |

## DD-2: Mock 服务技术选型 / Mock Service Tech Stack

| Mock 服务 | 选型 | 理由 |
|-----------|------|------|
| sso_provider | FastAPI | 需要真实 HTTP 端点；FastAPI 自带 TestClient，session fixture 启停方便 |
| ldap_server | Python dict | LDAP 协议复杂，只需模拟 bind/search/modify 语义即可 |
| kerberos_kdc | Token store | 只需验证票据生命周期逻辑，不需要真实加密 |
| graph_db | networkx | 成熟的图算法库，支持 BFS/DFS/最短路径，API 直观 |
| data_warehouse | SQLite :memory: | 支持真实 SQL 执行，内存数据库无需清理，测试隔离性好 |
| pipeline_engine | Dict + 拓扑排序 | DAG 执行核心是拓扑排序，Python stdlib 即可实现 |
| ai_agent | 规则匹配 | 不需要真实 LLM；规则引擎可精确控制安全场景的输入输出 |

## DD-3: Fixture 生命周期 / Fixture Lifecycle

| 项目 | 内容 |
|------|------|
| **决策** | Mock 服务用 `session` scope，测试状态用 `function` scope |
| **理由** | Mock 服务启动有开销（FastAPI），session 级复用提升速度；function 级保证测试隔离 |
| **具体实现** | `conftest.py`(root) 定义 session fixture；各 domain 的 `conftest.py` 定义 function fixture |

## DD-4: 测试 ID 规范 / Test ID Convention

| 项目 | 内容 |
|------|------|
| **决策** | `TC-{DOMAIN}-{MODULE}-{NNN}` 格式 |
| **理由** | 与 k8s-auto-testing-platform 的命名风格一致；便于按领域/模块筛选和追溯 |
| **示例** | `TC-AUTH-SSO-001`、`TC-DATA-ONT-005`、`TC-AI-SAF-003` |

## DD-5: Client 层设计 / Client Layer

| 项目 | 内容 |
|------|------|
| **决策** | 在 Mock 服务和测试之间增加 Client 封装层 |
| **备选方案** | A) 测试直接调用 Mock B) 通过 Client 间接调用 |
| **选择理由** | Client 层屏蔽 Mock 实现细节；测试代码只关注业务语义；未来替换为真实 API 只需改 Client |
| **结构** | `auth_client.py`（认证）、`data_client.py`（数据）、`agent_client.py`（AI） |

## DD-6: AI Agent 用规则引擎而非 LLM / Rule Engine over LLM

| 项目 | 内容 |
|------|------|
| **决策** | AI Agent Mock 使用规则匹配引擎，不接入真实 LLM |
| **理由** | LLM 输出不确定，无法写确定性断言；规则引擎可精确模拟注入检测、PII 脱敏、幻觉等场景 |
| **权衡** | 牺牲了"真实 AI 行为"测试，但保证了测试可复现性和 CI 稳定性 |

## DD-7: 安全测试策略 / Security Testing Strategy

| 项目 | 内容 |
|------|------|
| **决策** | 安全测试嵌入各领域（而非独立安全测试套件） |
| **理由** | 安全是每个领域的横切关注点；LDAP 注入属于 Auth、SQL 注入属于 Data、Prompt 注入属于 AI |
| **标记** | 安全相关用例同时标记 `@pytest.mark.security` 和领域 marker |

## DD-8: 代码质量标准 / Code Quality Standards

| 工具 | 标准 | 理由 |
|------|------|------|
| black | 默认格式化 | 统一风格，消除格式争论 |
| flake8 | 默认规则 | 捕获语法问题和未使用导入 |
| pylint | ≥ 9.0 分 | 与 k8s-auto-testing-platform 一致 |
| isort | black profile | 导入排序与 black 兼容 |
| pytest-cov | ≥ 90% | 作品集项目需要展示高覆盖率 |

## DD-9: Python 版本 / Python Version

| 项目 | 内容 |
|------|------|
| **决策** | Python 3.9+ |
| **理由** | 3.9 支持 `dict` 类型提示（无需 `typing.Dict`）；FastAPI 最低要求 3.8；CI 用 3.11 |

## DD-10: 目录结构 / Directory Structure

| 项目 | 内容 |
|------|------|
| **决策** | `tests/` 按领域分子目录，`src/` 按职责分子目录 |
| **理由** | 领域隔离清晰；每个子目录有独立 `conftest.py`；与 README 的测试领域章节一一对应 |
| **结构** | `tests/{test_auth,test_data,test_ai}/`、`src/{mock_services,clients,helpers}/` |

---

*文档版本: 1.0*
