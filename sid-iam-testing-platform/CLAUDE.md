# CLAUDE.md - SID IAM Testing Platform

## Project Purpose

SID IAM (Identity and Access Management) testing platform covering 3 domains: **Authentication Security**, **Data Platform**, and **AI Agent**. All tests run via mock services — no real SID instance required.

**Part of**: Michael Zhou's QA Portfolio (`michael-zhou-qa-portfolio`)

## Project Lifecycle

| Phase | Name | Status |
|-------|------|--------|
| 1 | Requirements | **Complete** |
| 2 | Design | **Complete** |
| 3 | Verification (Implementation) | **Complete** |
| 4 | Iteration | **Complete** |

## Quick Start

```bash
# 激活虚拟环境（仓库根目录）
source venv/bin/activate

cd sid-iam-testing-platform
pip install -r requirements.txt
pytest tests/ -v                    # All 138 tests
pytest tests/test_auth/ -v          # Auth (54 tests)
pytest tests/test_data/ -v          # Data (44 tests)
pytest tests/test_ai/ -v            # AI Agent (40 tests)
pytest tests/ --cov=src --cov-report=html  # Coverage
```

## Architecture

```
tests/           → Pytest test suite (138 tests across 3 domains)
src/mock_services/ → Mock backends (FastAPI SSO, networkx graph, SQLite warehouse)
src/clients/     → API wrappers for auth, data, agent services
src/helpers/     → Token factory, graph helpers, custom assertions
docs/            → Requirements, architecture, test cases, reports
```

## Test Domains

| Domain | Tests | Modules |
|--------|-------|---------|
| Auth | 54 | SSO, LDAP, Kerberos, Zero Trust, Session, MFA |
| Data | 44 | Ontology, Pipeline, Warehouse, Tags, Analytics |
| AI | 40 | Lifecycle, Auth, Data Access, Safety, Integration |

## Mock Services

| Mock | Backend | Purpose |
|------|---------|---------|
| sso_provider | FastAPI | SAML/OIDC endpoints |
| ldap_server | Python dict | Bind, search, modify |
| kerberos_kdc | Token store | Ticket lifecycle |
| graph_db | networkx | Ontology traversal |
| data_warehouse | SQLite :memory: | SQL execution |
| pipeline_engine | Topological sort | DAG orchestration |
| ai_agent | Rule-based | Safety guardrails |

## Key Dependencies

```
pytest, pytest-cov, pytest-html, allure-pytest
fastapi, uvicorn, networkx, pyjwt, cryptography
requests, python-dotenv, pyyaml
black, flake8, pylint, isort
```

## Conventions

- Test IDs: `TC-{DOMAIN}-{MODULE}-{NNN}` (e.g., `TC-AUTH-SSO-001`)
- Markers: `@pytest.mark.auth`, `@pytest.mark.data`, `@pytest.mark.ai`, `@pytest.mark.contract`, `@pytest.mark.P0`
- Fixtures: session-level for mock services, function-level for test state
- Code quality: pylint >= 9.0, black formatted, coverage >= 90%

## Known Pitfalls (from Lessons Learned)

| Pitfall | Detail |
|---------|--------|
| FastAPI param binding | `def foo(x: str)` = **query param**, `def foo(x: str = Header())` = **header**. SSO Provider uses query params for authorization. |
| SAML response type | `create_saml_assertion()` returns `{"assertion": "...", "signature": "..."}` (object, not string) |
| New markers | `--strict-markers` in pytest.ini — always register new markers before use |
| New deps | Any new import must be added to `requirements.txt` or CI will fail |
