# Playwright Demo — Test Cases

> **Total**: 38 test cases across 9 spec files, 6 test categories
> **Cross-browser**: Each test runs on Chromium, Firefox, WebKit (114 total executions)

---

## 1. Accessibility Audit (3 tests)

**Spec**: `tests/accessibility/a11y-audit.spec.ts`
**Target**: example.com

| ID | Test Case | Validation |
|----|-----------|------------|
| A11Y-001 | should have no critical accessibility violations | axe-core scan with WCAG2A/2AA tags; zero critical/serious violations |
| A11Y-002 | should have proper heading hierarchy | Exactly one `<h1>` with meaningful text content |
| A11Y-003 | should have accessible link text | All links have non-empty descriptive text and `href` attributes |

---

## 2. API — Chained Requests (2 tests)

**Spec**: `tests/api/chained-requests.spec.ts`
**Target**: JSONPlaceholder API

| ID | Test Case | Validation |
|----|-----------|------------|
| API-CHAIN-001 | CRUD lifecycle — create, read, update, delete | POST 201 with id; PUT 200 with correct title; DELETE 200 |
| API-CHAIN-002 | user, posts relationship — fetch user then their posts | GET user 200; GET posts returns array; all posts match userId; schema validation |

---

## 3. API — CRUD Operations (6 tests)

**Spec**: `tests/api/crud-operations.spec.ts`
**Target**: JSONPlaceholder API

| ID | Test Case | Validation |
|----|-----------|------------|
| API-CRUD-001 | GET /users — retrieve all users | Status 200; returns non-empty Array |
| API-CRUD-002 | GET /users/:id — retrieve a specific user | Status 200; has id, name, email properties |
| API-CRUD-003 | POST /posts — create a new post | Status 201; response id exists; title/body/userId match; schema validation |
| API-CRUD-004 | PUT /posts/:id — update an existing post | Status 200; updated title and body match sent data |
| API-CRUD-005 | PATCH /posts/:id — partially update a post | Status 200; patched title matches; other fields preserved |
| API-CRUD-006 | DELETE /posts/:id — delete a post | Status 200 |

---

## 4. API — Response Validation (4 tests)

**Spec**: `tests/api/response-validation.spec.ts`
**Target**: JSONPlaceholder API

| ID | Test Case | Validation |
|----|-----------|------------|
| API-VAL-001 | should return correct content-type header | content-type is application/json |
| API-VAL-002 | should return valid user schema structure | User schema matches expected shape; email format valid |
| API-VAL-003 | should return 404 for non-existent resource | Non-existent user ID (99999) returns 404 |
| API-VAL-004 | should include expected headers in response | Status 200; has content-type and access-control-allow-credentials headers |

---

## 5. UI Tests (20 tests)

### 5.1 Page Load (4 tests)

**Spec**: `tests/ui/page-load.spec.ts`
**Target**: example.com

| ID | Test Case | Validation |
|----|-----------|------------|
| UI-LOAD-001 | should load the homepage with correct title | page.title() equals "Example Domain" |
| UI-LOAD-002 | should display the main heading and description | Heading visible with text "Example Domain"; description contains expected text |
| UI-LOAD-003 | should have proper meta charset | characterSet is UTF-8 or windows-1252 |
| UI-LOAD-004 | should load within performance budget | Navigation load time < PAGE_LOAD_BUDGET_MS |

### 5.2 Navigation (3 tests)

**Spec**: `tests/ui/navigation.spec.ts`
**Target**: example.com

| ID | Test Case | Validation |
|----|-----------|------------|
| UI-NAV-001 | learn-more link should point to IANA | Link href contains "iana.org" |
| UI-NAV-002 | should handle navigation to external link | Link href is truthy and contains "iana.org" |
| UI-NAV-003 | multi-tab — should open a new tab and verify content | Two independent tabs show same heading and title; tabs independently closable |

### 5.3 Network Interception (4 tests)

**Spec**: `tests/ui/network-interception.spec.ts`
**Target**: example.com

| ID | Test Case | Validation |
|----|-----------|------------|
| UI-NET-001 | should mock an API response | route.fulfill() intercepts /api/users; page loads with mock |
| UI-NET-002 | should simulate offline mode by aborting requests | CSS requests aborted; heading still visible (page renders without CSS) |
| UI-NET-003 | should inject latency into responses | 100ms delay injected; page heading still visible after latency |
| UI-NET-004 | should capture and inspect network requests | Document request captured; method is GET; requests array populated |

### 5.4 Responsive (9 tests)

**Spec**: `tests/ui/responsive.spec.ts`
**Target**: example.com

| ID | Viewport | Test Case | Validation |
|----|----------|-----------|------------|
| UI-RES-001 | Mobile (375x667) | should render heading | Heading visible with text "Example Domain" |
| UI-RES-002 | Mobile (375x667) | should render description | Description paragraph visible |
| UI-RES-003 | Mobile (375x667) | should render learn-more link | Link visible |
| UI-RES-004 | Tablet (768x1024) | should render heading | Heading visible with text "Example Domain" |
| UI-RES-005 | Tablet (768x1024) | should render description | Description paragraph visible |
| UI-RES-006 | Tablet (768x1024) | should render learn-more link | Link visible |
| UI-RES-007 | Desktop (1920x1080) | should render heading | Heading visible with text "Example Domain" |
| UI-RES-008 | Desktop (1920x1080) | should render description | Description paragraph visible |
| UI-RES-009 | Desktop (1920x1080) | should render learn-more link | Link visible |

---

## 6. Visual Regression (3 tests)

**Spec**: `tests/visual/screenshot-comparison.spec.ts`
**Target**: example.com

| ID | Test Case | Validation |
|----|-----------|------------|
| VIS-001 | full page should match baseline screenshot | fullPage screenshot matches `full-page.png`; maxDiffPixelRatio 0.05 |
| VIS-002 | heading element should match baseline | Heading element screenshot matches `heading.png`; maxDiffPixelRatio 0.05 |
| VIS-003 | page should match across viewport sizes | Mobile viewport (375x667) fullPage screenshot matches baseline |

---

## Test Coverage Matrix

| Category | Tests | Browser-Independent | Spec Files |
|----------|-------|---------------------|------------|
| Accessibility | 3 | No | 1 |
| API — Chained | 2 | Yes | 1 |
| API — CRUD | 6 | Yes | 1 |
| API — Validation | 4 | Yes | 1 |
| UI — Page Load | 4 | No | 1 |
| UI — Navigation | 3 | No | 1 |
| UI — Network | 4 | No | 1 |
| UI — Responsive | 9 | No | 1 |
| Visual Regression | 3 | No | 1 |
| **Total** | **38** | | **9** |

## Reporters Configuration

```
Console   → list reporter (real-time output)
HTML      → playwright-report/index.html (interactive debugging)
JUnit XML → test-results/junit.xml (CI integration)
```
