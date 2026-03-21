# QA Portfolio Improvement Plan

Generated: 2026-03-21

## 1. Documentation Gaps ✅ DONE

| Issue                       | Details                                                                                                      | Status |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| **Missing CLAUDE.md**       | 6 of 9 projects lack project-level CLAUDE.md (iwsva-cypress-e2e, k8s, security, cicd, api-testing, selenium) | ✅ Created all 6 |
| **Root CLAUDE.md outdated** | Missing `playwright-demo` from projects table                                                                | ✅ Added |
| **Test count mismatches**   | security-testing-demo: docs say 170, actual ~182                                                             | ✅ Fixed |

## 2. Uncommitted Work

- `sid-iam-testing-platform/tests/test_contract/` — new contract tests sitting untracked
- `.claude/settings.local.json` — modified but not staged

## 3. Missing CI/CD for Some Projects

- `api-testing-demo` and `selenium-demo` have no dedicated GitHub Actions workflows

## 4. Consistency

- Project structures vary (some have `docs/project-management/`, others don't)
- Issue tracking format differs across projects
- Some projects use bilingual docs (中文), others English only

## 5. Potential New Additions

| Idea | Value |
|------|-------|
| **Performance testing project** | Dedicated k6/JMeter project beyond what microservice-testing-platform covers |
| **Mobile testing demo** | Appium or Detox — a gap in the portfolio |
| **AI/LLM testing demo** | Timely given industry trends — prompt testing, hallucination detection |
| **Test reporting dashboard** | Aggregate results from all 9 projects into one view |

## Recommended Priority

1. **Quick wins**: Commit the contract tests, update root CLAUDE.md with playwright-demo
2. **Medium effort**: Add CLAUDE.md to the 6 missing projects, fix test count docs
3. **New features**: Add CI workflows for api-testing and selenium, consider a mobile or AI testing project

## Current Portfolio Summary

| # | Project | Tests | CLAUDE.md | CI/CD |
|---|---------|-------|-----------|-------|
| 1 | iwsva-cypress-e2e | 77 | ✅ | ✅ |
| 2 | k8s-auto-testing-platform | 37 | ✅ | ✅ |
| 3 | security-testing-demo | 182 | ✅ | ✅ |
| 4 | cicd-demo | 34 | ✅ | ✅ |
| 5 | api-testing-demo | 316+ | ✅ | ❌ |
| 6 | playwright-demo | 38 | ✅ | ✅ |
| 7 | selenium-demo | 6+ | ✅ | ❌ |
| 8 | sid-iam-testing-platform | 138 | ✅ | ✅ |
| 9 | microservice-testing-platform | 101 | ✅ | ✅ |

**Total: 700+ tests across 9 projects**

---

## Issue Tracker

| ID | Date | Project | Issue | Root Cause | Fix | Status |
|----|------|---------|-------|------------|-----|--------|
| ISS-001 | 2026-03-21 | sid-iam-testing-platform | PR #7 CI `code-quality` failed: `black --check` on 3 contract test files | conftest.py, test_agent_contract.py, test_sso_contract.py 未经 black 格式化即提交 | `black --line-length 120 tests/test_contract/` | ✅ Fixed |
| ISS-002 | 2026-03-21 | sid-iam-testing-platform | PR #7 CI `code-quality` failed: `isort --check-only` on conftest.py | conftest.py import 顺序不符合 isort 规范 | `isort --profile black tests/test_contract/` | ✅ Fixed |
| ISS-003 | 2026-03-21 | sid-iam-testing-platform | PR #7 CI `unit-tests` failed: `ModuleNotFoundError: No module named 'jsonschema'` | conftest.py 依赖 jsonschema 但 requirements.txt 未声明 | 添加 `jsonschema==4.21.1` 到 requirements.txt | ✅ Fixed |
| ISS-004 | 2026-03-21 | sid-iam-testing-platform | PR #7 CI `unit-tests` failed: `'contract' not found in markers configuration` | `--strict-markers` 要求所有 marker 注册，但 pytest.ini 缺少 `contract` | 在 pytest.ini markers 中添加 `contract: Contract tests` | ✅ Fixed |
| ISS-005 | 2026-03-21 | sid-iam-testing-platform | test_saml_login_success_contract failed: `saml_response is not of type 'string'` | SSO Provider 返回 `{assertion, signature}` 对象，但 contract schema 期望 string | 将 schema 从 `"type": "string"` 改为 `"type": "object"` | ✅ Fixed |
| ISS-006 | 2026-03-21 | sid-iam-testing-platform | test_oidc_userinfo_success_contract failed: expected 200 got 401 | 测试用 `headers=` 传递 authorization，但 endpoint 用 query param 接收 | 改用 `params=` 传递 authorization，与 auth_client.py 一致 | ✅ Fixed |
