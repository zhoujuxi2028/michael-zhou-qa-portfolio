# Playwright Demo — Work Breakdown Structure (WBS)

## Overview

**Total**: 20 tasks, ~32 tests, 18 files
**Test Coverage**: API (12), UI (14), Visual (3), Accessibility (3)
**Browsers**: Chromium, Firefox, WebKit (+ mobile-chrome, mobile-safari emulation)

---

## Execution Order & Dependencies

```
WBS 1.0 (Scaffolding)
  └──> WBS 2.0 (Infrastructure)
         ├──> WBS 3.0 (API Tests)      — can parallel with 4.0
         ├──> WBS 4.0 (UI Tests)       — can parallel with 3.0
         └──> WBS 5.0 (Visual/A11y)    — depends on pages from 2.0
                └──> WBS 6.0 (CI/CD)
                       └──> WBS 7.0 (Docs)
                              └──> WBS 8.0 (Verification)
```

---

## WBS 1.0 — Project Scaffolding

| ID | Task | Files | Status |
|----|------|-------|--------|
| 1.1 | Create `package.json` with scripts and deps | `package.json` | ✅ Complete |
| 1.2 | Create TypeScript config | `tsconfig.json` | ✅ Complete |
| 1.3 | Create Playwright config (5 browser projects, reporters, trace) | `playwright.config.ts` | ✅ Complete |
| 1.4 | Create `.gitignore` | `.gitignore` | ✅ Complete |
| 1.5 | Install dependencies & browsers | — (shell) | ✅ Complete |

## WBS 2.0 — Infrastructure Layer (Page Objects, Fixtures, Helpers)

| ID | Task | Files | Status |
|----|------|-------|--------|
| 2.1 | Base page object (abstract, reusable navigation/screenshot) | `pages/base.page.ts` | ✅ Complete |
| 2.2 | Example.com page object (getByRole locators) | `pages/example.page.ts` | ✅ Complete |
| 2.3 | Custom test fixture (DI for page objects + API context) | `fixtures/base.fixture.ts` | ✅ Complete |
| 2.4 | Test data constants (URLs, viewports, user data) | `fixtures/test-data.ts` | ✅ Complete |
| 2.5 | API helper (typed JSONPlaceholder wrapper) | `helpers/api.helper.ts` | ✅ Complete |
| 2.6 | Assertion helper (schema validation) | `helpers/assertions.helper.ts` | ✅ Complete |

## WBS 3.0 — API Tests (12 tests)

| ID | Task | Files | Tests | Status |
|----|------|-------|-------|--------|
| 3.1 | CRUD operations (GET/POST/PUT/PATCH/DELETE) | `tests/api/crud-operations.spec.ts` | 6 | ✅ Complete |
| 3.2 | Response validation (headers, schema, 404) | `tests/api/response-validation.spec.ts` | 4 | ✅ Complete |
| 3.3 | Chained requests (lifecycle, user→posts) | `tests/api/chained-requests.spec.ts` | 2 | ✅ Complete |

## WBS 4.0 — UI Tests (14 tests)

| ID | Task | Files | Tests | Status |
|----|------|-------|-------|--------|
| 4.1 | Page load (title, meta, content, perf budget) | `tests/ui/page-load.spec.ts` | 4 | ✅ Complete |
| 4.2 | Responsive design (mobile/tablet/desktop viewports) | `tests/ui/responsive.spec.ts` | 3×3 | ✅ Complete |
| 4.3 | Navigation + multi-tab handling (Playwright exclusive) | `tests/ui/navigation.spec.ts` | 3 | ✅ Complete |
| 4.4 | Network interception (mock, offline, latency, capture) | `tests/ui/network-interception.spec.ts` | 4 | ✅ Complete |

## WBS 5.0 — Visual & Accessibility Tests (6 tests)

| ID | Task | Files | Tests | Status |
|----|------|-------|-------|--------|
| 5.1 | Screenshot comparison (toHaveScreenshot, cross-browser) | `tests/visual/screenshot-comparison.spec.ts` | 3 | ✅ Complete |
| 5.2 | Accessibility audit (axe-core, violations, heading hierarchy) | `tests/accessibility/a11y-audit.spec.ts` | 3 | ✅ Complete |

## WBS 6.0 — CI/CD Integration

| ID | Task | Files | Status |
|----|------|-------|--------|
| 6.1 | GitHub Actions workflow (matrix: 3 browsers, artifacts) | `.github/workflows/playwright-tests.yml` | ✅ Complete |
| 6.2 | Verify all tests pass in CI environment | — | ⬜ Pending |

## WBS 7.0 — Documentation

| ID | Task | Files | Status |
|----|------|-------|--------|
| 7.1 | README.md (overview, quickstart, comparison table, talking points) | `playwright-demo/README.md` | ✅ Complete |
| 7.2 | CLAUDE.md (AI guidance, matching cicd-demo style) | `playwright-demo/CLAUDE.md` | ✅ Complete |
| 7.3 | WBS.md (this document) | `playwright-demo/docs/WBS.md` | ✅ Complete |

## WBS 8.0 — Verification & Polish

| ID | Task | Status |
|----|------|--------|
| 8.1 | Run full suite locally across 3 browsers | ⬜ Pending |
| 8.2 | Verify HTML report + trace generation | ⬜ Pending |
| 8.3 | Review interview comments for accuracy | ✅ Complete |
| 8.4 | Push branch, open PR, verify CI | ⬜ Pending |

---

## Key Playwright Features Showcased (vs Cypress)

| Feature | Playwright | Cypress |
|---|---|---|
| Cross-browser | Chromium + Firefox + **WebKit** | Chromium + Firefox only |
| Multi-tab | Native `context.newPage()` | Not supported |
| API testing | First-class `request` fixture, no browser | `cy.request()` in browser context |
| Visual comparison | Built-in `toHaveScreenshot()` | Requires plugin |
| Parallelism | Built-in workers | Requires paid Dashboard |
| TypeScript | First-class, ships types | Supported but JS-first |
| Mobile emulation | Device profiles (UA + touch + viewport) | Viewport only |
| Trace viewer | Built-in | Time-travel (different model) |
| Fixtures/DI | Dependency injection | beforeEach hooks |
