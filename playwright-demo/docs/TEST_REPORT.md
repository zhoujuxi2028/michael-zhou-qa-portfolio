# Playwright Demo — Test Report

> **Run**: GitHub Actions #23112956542
> **Branch**: feature/playwright-demo
> **Trigger**: workflow_dispatch
> **Date**: 2026-03-15
> **Result**: PASS (114/114)

---

## Executive Summary

All 38 test cases passed across 3 browsers (Chromium, Firefox, WebKit), totaling 114 successful test executions with zero failures.

| Browser | Tests | Passed | Failed | Duration |
|---------|-------|--------|--------|----------|
| Chromium | 38 | 38 | 0 | 13.2s |
| Firefox | 38 | 38 | 0 | 17.2s |
| WebKit | 38 | 38 | 0 | 24.5s |
| **Total** | **114** | **114** | **0** | — |

---

## Results by Category

### Accessibility (3/3 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 1 | No critical a11y violations | PASS | PASS | PASS |
| 2 | Proper heading hierarchy | PASS | PASS | PASS |
| 3 | Accessible link text | PASS | PASS | PASS |

### API — Chained Requests (2/2 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 4 | CRUD lifecycle (create/read/update/delete) | PASS | PASS | PASS |
| 5 | User-posts relationship traversal | PASS | PASS | PASS |

### API — CRUD Operations (6/6 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 6 | GET /users — all users | PASS | PASS | PASS |
| 7 | GET /users/:id — specific user | PASS | PASS | PASS |
| 8 | POST /posts — create post | PASS | PASS | PASS |
| 9 | PUT /posts/:id — full update | PASS | PASS | PASS |
| 10 | PATCH /posts/:id — partial update | PASS | PASS | PASS |
| 11 | DELETE /posts/:id — delete | PASS | PASS | PASS |

### API — Response Validation (4/4 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 12 | Correct content-type header | PASS | PASS | PASS |
| 13 | Valid user schema structure | PASS | PASS | PASS |
| 14 | 404 for non-existent resource | PASS | PASS | PASS |
| 15 | Expected headers in response | PASS | PASS | PASS |

### UI — Page Load (4/4 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 16 | Homepage title correct | PASS | PASS | PASS |
| 17 | Main heading and description | PASS | PASS | PASS |
| 18 | Proper meta charset | PASS | PASS | PASS |
| 19 | Performance budget met | PASS | PASS | PASS |

### UI — Navigation (3/3 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 20 | Learn-more link points to IANA | PASS | PASS | PASS |
| 21 | External link navigation | PASS | PASS | PASS |
| 22 | Multi-tab content verification | PASS | PASS | PASS |

### UI — Network Interception (4/4 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 23 | Mock API response | PASS | PASS | PASS |
| 24 | Simulate offline mode | PASS | PASS | PASS |
| 25 | Inject latency | PASS | PASS | PASS |
| 26 | Capture network requests | PASS | PASS | PASS |

### UI — Responsive (9/9 passed)

| # | Viewport | Test | Chromium | Firefox | WebKit |
|---|----------|------|----------|---------|--------|
| 27 | Mobile (375x667) | Heading | PASS | PASS | PASS |
| 28 | Mobile (375x667) | Description | PASS | PASS | PASS |
| 29 | Mobile (375x667) | Link | PASS | PASS | PASS |
| 30 | Tablet (768x1024) | Heading | PASS | PASS | PASS |
| 31 | Tablet (768x1024) | Description | PASS | PASS | PASS |
| 32 | Tablet (768x1024) | Link | PASS | PASS | PASS |
| 33 | Desktop (1920x1080) | Heading | PASS | PASS | PASS |
| 34 | Desktop (1920x1080) | Description | PASS | PASS | PASS |
| 35 | Desktop (1920x1080) | Link | PASS | PASS | PASS |

### Visual Regression (3/3 passed)

| # | Test | Chromium | Firefox | WebKit |
|---|------|----------|---------|--------|
| 36 | Full page baseline match | PASS | PASS | PASS |
| 37 | Heading element baseline match | PASS | PASS | PASS |
| 38 | Cross-viewport baseline match | PASS | PASS | PASS |

---

## CI Pipeline Details

| Step | Chromium | Firefox | WebKit |
|------|----------|---------|--------|
| Set up job | OK | OK | OK |
| Checkout code | OK | OK | OK |
| Setup Node.js | OK | OK | OK |
| Install dependencies | OK | OK | OK |
| Install Playwright browser | OK | OK | OK |
| Run Playwright tests | OK | OK | OK |
| Upload HTML report | OK | OK | OK |
| Upload test results | OK | OK | OK |
| **Job Duration** | **48s** | **54s** | **1m18s** |

## Artifacts

| Artifact | Description |
|----------|-------------|
| playwright-report-chromium | Interactive HTML report (Chromium) |
| playwright-report-firefox | Interactive HTML report (Firefox) |
| playwright-report-webkit | Interactive HTML report (WebKit) |
| test-results-chromium | JUnit XML + trace files (Chromium) |
| test-results-firefox | JUnit XML + trace files (Firefox) |
| test-results-webkit | JUnit XML + trace files (WebKit) |

**Download**: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/23112956542

## Annotations

- Node.js 20 deprecation warning: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` will require Node.js 24 after 2026-06-02. Non-blocking.
