# Playwright Demo — Cross-Browser Test Automation

Part of [Michael Zhou's QA Portfolio](../README.md). Demonstrates Playwright test automation with TypeScript across Chromium, Firefox, and WebKit.

## Quick Start

```bash
cd playwright-demo
npm install
npx playwright install
npm test
```

## Test Suite Overview

| Category | Tests | Spec Files | Description |
|----------|-------|------------|-------------|
| **Accessibility** | 3 | 1 | axe-core WCAG 2.0 AA audit (violations, heading hierarchy, link text) |
| **API — CRUD** | 6 | 1 | GET/POST/PUT/PATCH/DELETE against JSONPlaceholder |
| **API — Chained** | 2 | 1 | Multi-step workflows (CRUD lifecycle, relationship traversal) |
| **API — Validation** | 4 | 1 | Headers, schema structure, 404 handling |
| **UI — Page Load** | 4 | 1 | Title, meta charset, heading, performance budget |
| **UI — Navigation** | 3 | 1 | External links, multi-tab handling (Playwright exclusive) |
| **UI — Network** | 4 | 1 | Mock responses, offline simulation, latency injection, request capture |
| **UI — Responsive** | 9 | 1 | 3 viewports (mobile/tablet/desktop) x 3 assertions |
| **Visual Regression** | 3 | 1 | Built-in `toHaveScreenshot()` baseline comparison |
| **Total** | **38** | **9** | **114 executions** across 3 browsers |

## Project Structure

```
playwright-demo/
├── playwright.config.ts        # 5 browser projects, reporters, trace config
├── tsconfig.json               # Strict TS with path aliases (@pages, @fixtures, @helpers)
├── package.json                # 3 devDeps, 10 npm scripts
│
├── fixtures/
│   ├── base.fixture.ts         # Custom fixtures — DI for page objects + API context
│   └── test-data.ts            # Shared constants, viewports, payloads, schemas
│
├── pages/
│   ├── base.page.ts            # Abstract base: goto, waitForPageReady, screenshot
│   └── example.page.ts         # example.com POM with getByRole locators
│
├── helpers/
│   ├── api.helper.ts           # Typed APIHelper class (User/Post interfaces, CRUD)
│   └── assertions.helper.ts    # Schema validators, email/content-type checkers
│
├── tests/
│   ├── accessibility/          # axe-core WCAG audit (3 tests)
│   ├── api/                    # CRUD, chaining, validation (12 tests, no browser)
│   ├── ui/                     # Page load, navigation, responsive, network (14 tests)
│   └── visual/                 # Screenshot baseline comparison (3 tests)
│
└── docs/
    ├── DESIGN.md               # Architecture and design patterns
    ├── TEST_CASES.md           # All 38 test cases with validation details
    ├── TEST_REPORT.md          # CI execution report (114/114 pass)
    └── WBS.md                  # Work Breakdown Structure
```

## Available Scripts

```bash
npm test              # Run all tests (all browsers)
npm run test:chromium # Chromium only
npm run test:firefox  # Firefox only
npm run test:webkit   # WebKit (Safari) only
npm run test:api      # API tests only (fast, no browser)
npm run test:ui       # UI tests only
npm run test:visual   # Visual regression tests
npm run test:a11y     # Accessibility tests
npm run test:headed   # Run with visible browser
npm run report        # Open HTML report
```

## Architecture

### Layered Design

```
┌─────────────────────────────────────────────┐
│  Test Layer (tests/)                        │
│  9 spec files organized by category         │
├─────────────────────────────────────────────┤
│  Page Object Layer (pages/)                 │
│  BasePage → ExamplePage                     │
│  Accessibility-first locators (getByRole)   │
├──────────────────┬──────────────────────────┤
│  Fixtures (DI)   │  Helpers                 │
│  Page + API      │  API wrapper + validators│
│  context inject  │  TypeScript interfaces   │
├──────────────────┴──────────────────────────┤
│  Config (playwright.config.ts + tsconfig)   │
└─────────────────────────────────────────────┘
```

### Design Patterns

| Pattern | File | Purpose |
|---------|------|---------|
| Custom Fixtures (DI) | `fixtures/base.fixture.ts` | Fresh, isolated page/API instances per test |
| Page Object Model | `pages/base.page.ts` | Encapsulate interactions, accessibility-first selectors |
| Centralized Test Data | `fixtures/test-data.ts` | Single source of truth for URLs, viewports, payloads |
| Typed API Wrapper | `helpers/api.helper.ts` | TypeScript interfaces enforce response shape at compile time |
| Assertion Helpers | `helpers/assertions.helper.ts` | Reusable validators for schema, email, content-type |
| Data-Driven Testing | `tests/ui/responsive.spec.ts` | Loop over viewports, single code → 9 tests |

## Key Features Demonstrated

### 1. Cross-Browser Testing
Tests run on **Chromium, Firefox, and WebKit** from a single codebase. WebKit coverage is a Playwright exclusive — Cypress doesn't support Safari's engine.

### 2. API Testing Without Browser
Playwright's `request` fixture provides a first-class HTTP client. API tests run without launching a browser, making them significantly faster than Cypress's `cy.request()`.

### 3. Multi-Tab Handling
Navigation tests demonstrate opening and controlling multiple browser tabs — impossible in Cypress, native in Playwright via `context.newPage()`.

### 4. Visual Regression
Built-in `toHaveScreenshot()` generates and compares baseline screenshots with `maxDiffPixelRatio: 0.05` — no third-party plugins needed.

### 5. Accessibility Auditing
Integrated `@axe-core/playwright` runs WCAG 2.0 AA checks in CI, catching critical/serious accessibility violations before production.

### 6. Dependency Injection Fixtures
Custom fixtures provide page objects and API contexts via Playwright's DI system, replacing `beforeEach` boilerplate with clean, declarative test setup.

### 7. Network Interception
`page.route()` enables mocking API responses, simulating offline mode, injecting latency, and capturing/inspecting network requests.

### 8. Performance Budgets
Page load tests enforce a performance budget (`< 5000ms`) using the Navigation Timing API.

## Playwright vs Cypress Comparison

| Feature | Playwright | Cypress |
|---------|-----------|---------|
| Cross-browser | Chromium + Firefox + **WebKit** | Chromium + Firefox only |
| Multi-tab | Native `context.newPage()` | Not supported |
| API testing | First-class `request` fixture | `cy.request()` in browser context |
| Visual comparison | Built-in `toHaveScreenshot()` | Requires plugin |
| Parallelism | Built-in workers (free) | Requires paid Dashboard |
| TypeScript | First-class, ships types | Supported but JS-first |
| Mobile emulation | Device profiles (UA + touch + viewport) | Viewport only |
| Trace viewer | Built-in timeline + DOM snapshots | Time-travel (different model) |
| Fixtures / DI | Dependency injection pattern | beforeEach hooks |
| Network interception | `page.route()` with abort/fulfill/continue | `cy.intercept()` |

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/playwright-tests.yml`) runs tests across all 3 browsers in parallel:

- **Trigger**: PRs and pushes to `main` branch, filtered to `playwright-demo/**`
- **Matrix**: Chromium, Firefox, WebKit running as parallel jobs
- **Artifacts**: HTML report + JUnit XML + trace files per browser (7-day retention)
- **fail-fast: false**: All browsers complete even if one fails
- **Retries**: 2 retries in CI, traces captured on first retry

### Latest CI Results

| Browser | Tests | Result | Duration |
|---------|-------|--------|----------|
| Chromium | 38 | PASS | 13.2s |
| Firefox | 38 | PASS | 17.2s |
| WebKit | 38 | PASS | 24.5s |
| **Total** | **114** | **114/114** | |

## Documentation

| Document | Description |
|----------|-------------|
| [DESIGN.md](docs/DESIGN.md) | Architecture, design patterns, cross-browser strategy |
| [TEST_CASES.md](docs/TEST_CASES.md) | All 38 test cases with IDs and validation details |
| [TEST_REPORT.md](docs/TEST_REPORT.md) | CI execution report with per-browser results |
| [WBS.md](docs/WBS.md) | Work Breakdown Structure (8 phases) |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | ^1.49.1 | Test framework + all browser engines |
| `@axe-core/playwright` | ^4.10.1 | WCAG accessibility auditing |
| `typescript` | ^5.7.2 | Type safety and compile-time validation |

3 dependencies — minimal footprint by design.

## FAQ

**Q: Why Playwright over Cypress?**
A: WebKit support, multi-tab testing, built-in visual comparison, and free parallel execution. These are gaps in Cypress that matter for production coverage.

**Q: How does the fixture system work?**
A: Dependency injection — tests declare what they need (`examplePage`, `apiContext`), and the framework provides isolated instances. No shared state between tests.

**Q: How do you handle cross-browser differences?**
A: Same test code runs on all engines. The config defines browser projects with device-specific settings. CI matrix runs them in parallel.

**Q: What about flaky tests?**
A: Playwright auto-waits for elements. CI configures 2 retries. Traces capture on first retry for debugging without manual reproduction.

---

*Part of the [QA Automation Portfolio](../README.md) — also includes Cypress, Selenium, Postman/Newman, and CI/CD demos.*
