# QA Portfolio Improvement Plan

Generated: 2026-03-21

## 1. Documentation Gaps ✅ DONE

| Issue                       | Details                                                                                                      | Status |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| **Missing CLAUDE.md**       | 6 of 9 projects lack project-level CLAUDE.md (iwsva-cypress-e2e, k8s, security, cicd, api-testing, selenium) | ✅ Created all 6 |
| **Root CLAUDE.md outdated** | Missing `playwright-demo` from projects table                                                                | ✅ Added |
| **Test count mismatches**   | security-testing-demo: docs say 170, actual ~182                                                             | ✅ Fixed |

## 2. Uncommitted Work ✅ DONE

- `sid-iam-testing-platform/tests/test_contract/` — ✅ Committed in PR #7
- `.claude/settings.local.json` — local only, gitignored

## 3. Missing CI/CD for Some Projects ✅ DONE

| Item | Issue | Status |
|------|-------|--------|
| Add CI for api-testing-demo | [#14](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/14) | ✅ Done (PR #23) |
| Add CI for selenium-demo | [#15](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/15) | ✅ Done (PR #23) |

## 4. Consistency ✅ DONE

| Item | Issue | Status |
|------|-------|--------|
| Standardize project directory structure | [#16](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/16) | ✅ Done (PR #26) |

## 5. Potential New Additions

| Idea | Value | Issue | Status |
|------|-------|-------|--------|
| **Performance testing project** | Dedicated k6/JMeter project | [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | 📋 Todo |
| **Mobile testing demo** | Appium or Detox — fills portfolio gap | [#18](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/18) | 📋 Todo |
| **AI/LLM testing demo** | Prompt testing, hallucination detection | [#19](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/19) | 📋 Todo |
| **Test reporting dashboard** | Aggregate results from all 9 projects | [#20](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/20) | 📋 Todo |

## Roadmap

**GitHub Project Board**: https://github.com/users/zhoujuxi2028/projects/1

### Priority

| Priority | Issues | Category | Status |
|----------|--------|----------|--------|
| ~~🔴 High~~ | #14, #15 | CI/CD gaps | ✅ Done |
| ~~🟡 Medium~~ | #16 | Consistency | ✅ Done |
| 🔵 Future | [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17), [#18](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/18), [#19](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/19), [#20](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/20) | New projects | 📋 Todo |

## Current Portfolio Summary

| # | Category | Project | Tests | CLAUDE.md | CI/CD | docs/ |
|---|----------|---------|-------|-----------|-------|-------|
| 1 | 功能测试 | iwsva-cypress-e2e | 77 | ✅ | ✅ | ✅ |
| 2 | DevOps | cicd-demo | 34 | ✅ | ✅ | ✅ |
| 3 | 功能测试 | api-testing-demo | 316+ | ✅ | ✅ | ✅ |
| 4 | 功能测试 | playwright-demo | 38 | ✅ | ✅ | ✅ |
| 5 | 功能测试 | selenium-demo | 6+ | ✅ | ✅ | ✅ |
| 6 | 安全测试 | security-testing-demo | 182 | ✅ | ✅ | ✅ |
| 7 | 平台测试 | sid-iam-testing-platform | 163 | ✅ | ✅ | ✅ |
| 8 | 平台测试 | microservice-testing-platform | 101 | ✅ | ✅ | ✅ |
| 9 | 稳定性测试 | k8s-auto-testing-platform | 37 | ✅ | ✅ | ✅ |

**Total: 700+ tests across 9 projects | 9/9 CI ✅ | 9/9 docs/ standardized ✅**

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
| ISS-007 | 2026-03-22 | selenium-demo | PR #23 CI `code-quality` failed: `flake8: command not found` (exit 127) | CI workflow 使用 flake8 但 requirements.txt 未声明 | 添加 `flake8==7.0.0` 到 requirements.txt | ✅ Fixed |
| ISS-008 | 2026-03-22 | api-testing-demo | PR #23 CI Newman test failures: user missing `username` field | db.json 数据不完整 + todos 嵌套数组 + post 缺字段 | 修复 db.json + 添加 pre-commit hook + .gitattributes merge=ours | ✅ Fixed |
