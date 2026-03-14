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

| Category | Tests | Description |
|----------|-------|-------------|
| **API** | 12 | CRUD operations, schema validation, chained requests |
| **UI** | 14 | Page load, responsive design, multi-tab, network interception |
| **Visual** | 3 | Built-in screenshot comparison (`toHaveScreenshot`) |
| **Accessibility** | 3 | axe-core WCAG 2.0 AA audit |
| **Total** | **32** | Across 3 browsers (Chromium, Firefox, WebKit) |

## Project Structure

```
playwright-demo/
├── playwright.config.ts        # 5 browser projects, reporters, trace config
├── fixtures/
│   ├── base.fixture.ts         # Custom fixtures — DI for page objects + API
│   └── test-data.ts            # Shared constants, viewports, test payloads
├── pages/
│   ├── base.page.ts            # Abstract base page object
│   └── example.page.ts         # example.com POM with getByRole locators
├── helpers/
│   ├── api.helper.ts           # Typed JSONPlaceholder API wrapper
│   └── assertions.helper.ts    # Schema + format validators
└── tests/
    ├── api/                    # API tests (no browser needed)
    ├── ui/                     # UI + cross-browser tests
    ├── visual/                 # Screenshot comparison
    └── accessibility/          # axe-core integration
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

## Key Features Demonstrated

### 1. Cross-Browser Testing
Tests run on **Chromium, Firefox, and WebKit** from a single codebase. WebKit coverage is a Playwright exclusive — Cypress doesn't support Safari's engine.

### 2. API Testing Without Browser
Playwright's `request` fixture provides a first-class HTTP client. API tests run without launching a browser, making them significantly faster than Cypress's `cy.request()`.

### 3. Multi-Tab Handling
Navigation tests demonstrate opening and controlling multiple browser tabs — impossible in Cypress, native in Playwright.

### 4. Visual Regression
Built-in `toHaveScreenshot()` generates and compares baseline screenshots without third-party plugins.

### 5. Accessibility Auditing
Integrated `@axe-core/playwright` runs WCAG 2.0 AA checks in CI, catching accessibility violations before production.

### 6. Dependency Injection Fixtures
Custom fixtures provide page objects and API contexts via Playwright's DI system, replacing `beforeEach` boilerplate with clean, declarative test setup.

## Playwright vs Cypress Comparison

| Feature | Playwright | Cypress |
|---|---|---|
| Cross-browser | Chromium + Firefox + **WebKit** | Chromium + Firefox only |
| Multi-tab | Native `context.newPage()` | Not supported |
| API testing | First-class `request` fixture | `cy.request()` in browser context |
| Visual comparison | Built-in `toHaveScreenshot()` | Requires plugin |
| Parallelism | Built-in workers | Requires paid Dashboard |
| TypeScript | First-class, ships types | Supported but JS-first |
| Mobile emulation | Device profiles (UA + touch + viewport) | Viewport only |
| Trace viewer | Built-in timeline + DOM snapshots | Time-travel (different model) |
| Fixtures / DI | Dependency injection pattern | beforeEach hooks |

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/playwright-tests.yml`) runs tests across all 3 browsers in parallel using matrix strategy:

- **Trigger**: PRs to `portfolio` branch + pushes, filtered to `playwright-demo/**`
- **Matrix**: Chromium, Firefox, WebKit running in parallel
- **Artifacts**: HTML report + test results per browser
- **fail-fast: false**: All browsers complete even if one fails

## Interview Talking Points

1. **"Why Playwright?"** — WebKit support, multi-tab testing, built-in visual comparison, and free parallel execution. These are gaps in Cypress.

2. **"How does the fixture system work?"** — Dependency injection: tests declare what they need (`examplePage`, `apiContext`), and the framework provides isolated instances. No shared state between tests.

3. **"How do you handle cross-browser differences?"** — Same test code runs on all engines. The config defines browser projects with device-specific settings. CI matrix runs them in parallel.

4. **"What about flaky tests?"** — Playwright auto-waits for elements. Retries are configured in CI (2 retries). Traces capture on first retry for debugging without reproduction.

---

*Part of the [QA Automation Portfolio](../README.md) — also includes Cypress, Selenium, Postman/Newman, and CI/CD demos.*
