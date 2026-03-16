# Playwright Demo — Design Document

> Cross-browser test automation framework showcasing Playwright with TypeScript

---

## 1. Project Overview

A production-ready test automation suite demonstrating Playwright's full capabilities: E2E UI testing, API testing, visual regression, and accessibility auditing — all with TypeScript type safety and cross-browser coverage.

**Key Metrics**:
- 38 test cases, 9 spec files, 6 test categories
- 3 browsers (Chromium, Firefox, WebKit) = 114 total executions
- 100% pass rate
- Minimal dependencies (3 devDependencies)

---

## 2. Architecture

### 2.1 Layered Design

```
┌─────────────────────────────────────────────────┐
│  Test Layer (tests/)                            │
│  Spec files organized by category               │
│  Imports fixtures, pages, helpers                │
├─────────────────────────────────────────────────┤
│  Page Object Layer (pages/)                     │
│  BasePage → ExamplePage                         │
│  Accessibility-first locators (getByRole)        │
├──────────────────┬──────────────────────────────┤
│  Fixtures        │  Helpers                     │
│  (fixtures/)     │  (helpers/)                  │
│  DI + test data  │  API wrapper + validators    │
├──────────────────┴──────────────────────────────┤
│  Configuration                                  │
│  playwright.config.ts / tsconfig.json            │
└─────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
playwright-demo/
├── playwright.config.ts          # 5 browser projects, reporters, retry/trace config
├── tsconfig.json                 # Strict TS with path aliases (@pages, @fixtures, @helpers)
├── package.json                  # 3 devDeps, 10 npm scripts
│
├── fixtures/                     # Test data & dependency injection
│   ├── base.fixture.ts           # Custom fixtures: examplePage, apiContext
│   └── test-data.ts              # URLs, viewports, payloads, schemas, budgets
│
├── pages/                        # Page Object Model
│   ├── base.page.ts              # Abstract base: goto, waitForPageReady, screenshot
│   └── example.page.ts           # example.com: heading, description, learnMoreLink
│
├── helpers/                      # Reusable utilities
│   ├── api.helper.ts             # Typed APIHelper class (User/Post interfaces, CRUD methods)
│   └── assertions.helper.ts      # Schema validators, email/content-type checkers
│
├── tests/
│   ├── accessibility/            # axe-core WCAG 2.0 AA audits (3 tests)
│   ├── api/                      # CRUD, chaining, response validation (12 tests)
│   ├── ui/                       # Page load, navigation, responsive, network (14 tests)
│   └── visual/                   # Screenshot baseline comparison (3 tests)
│
└── docs/                         # TEST_CASES.md, TEST_REPORT.md, WBS.md, issues/
```

---

## 3. Design Patterns

### 3.1 Custom Fixtures (Dependency Injection)

Playwright's fixture system replaces traditional `beforeEach` boilerplate. Each test declares its dependencies; the framework provides fresh, isolated instances.

```typescript
// fixtures/base.fixture.ts
type Fixtures = {
  examplePage: ExamplePage;
  apiContext: APIRequestContext;
};

export const test = base.extend<Fixtures>({
  examplePage: async ({ page }, use) => {
    const examplePage = new ExamplePage(page);
    await use(examplePage);
  },
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: TEST_DATA.API_BASE_URL,
    });
    await use(context);
    await context.dispose();   // automatic cleanup
  },
});
```

**Advantages**:
- Zero shared state between tests
- API tests run without browser overhead
- Automatic resource cleanup via `dispose()`

### 3.2 Page Object Model

Abstract base class with accessibility-first locators:

```typescript
// pages/base.page.ts
export abstract class BasePage {
  constructor(protected readonly page: Page) {}
  async goto(url: string): Promise<void>
  async waitForPageReady(): Promise<void>     // networkidle
  async screenshot(name: string): Promise<Buffer>
  getByRole(...): Locator                     // mirrors assistive technology
  getByText(...): Locator
}

// pages/example.page.ts — extends BasePage
// Locators: heading, description, learnMoreLink
// Methods: goto(), getHeadingText(), getLearnMoreHref()
```

**Design decision**: `getByRole()` over CSS selectors — tests simultaneously validate WCAG accessibility.

### 3.3 Centralized Test Data

Single source of truth for all constants:

```typescript
// fixtures/test-data.ts
export const TEST_DATA = {
  API_BASE_URL: 'https://jsonplaceholder.typicode.com',
  EXAMPLE_URL: 'https://example.com',
  VIEWPORTS: {
    mobile:  { width: 375,  height: 667,  label: 'Mobile (375×667)' },
    tablet:  { width: 768,  height: 1024, label: 'Tablet (768×1024)' },
    desktop: { width: 1920, height: 1080, label: 'Desktop (1920×1080)' },
  },
  TEST_POST: { title: '...', body: '...', userId: 1 },
  USER_SCHEMA_KEYS: [...],
  POST_SCHEMA_KEYS: [...],
  PAGE_LOAD_BUDGET_MS: 5_000,
};
```

### 3.4 Typed API Wrapper

Full TypeScript interfaces enforce response shape at compile time:

```typescript
// helpers/api.helper.ts
export interface User { id: number; name: string; email: string; ... }
export interface Post { userId: number; id: number; title: string; body: string; }

export class ApiHelper {
  constructor(private readonly context: APIRequestContext) {}
  async getUsers(): Promise<User[]>
  async getUserById(id: number): Promise<User>
  async createPost(post: Omit<Post, 'id'>): Promise<Post>
  async updatePost(id: number, post: Partial<Post>): Promise<Post>
  async deletePost(id: number): Promise<number>
}
```

### 3.5 Data-Driven Testing

Responsive tests loop over viewport configurations:

```typescript
for (const [device, config] of Object.entries(TEST_DATA.VIEWPORTS)) {
  test.describe(`Responsive — ${config.label}`, () => {
    test.use({ viewport: { width: config.width, height: config.height } });
    // 3 tests per viewport → 9 tests total
  });
}
```

---

## 4. Test Categories

| Category | Tests | Spec Files | Browser Required | Key Capability |
|----------|-------|------------|------------------|----------------|
| Accessibility | 3 | 1 | Yes | axe-core WCAG 2.0 AA audit |
| API — CRUD | 6 | 1 | No | GET/POST/PUT/PATCH/DELETE |
| API — Chained | 2 | 1 | No | Multi-step workflows |
| API — Validation | 4 | 1 | No | Headers, schema, error codes |
| UI — Page Load | 4 | 1 | Yes | Title, meta, performance budget |
| UI — Navigation | 3 | 1 | Yes | Multi-tab (Playwright exclusive) |
| UI — Network | 4 | 1 | Yes | Mock, offline, latency, capture |
| UI — Responsive | 9 | 1 | Yes | 3 viewports × 3 assertions |
| Visual Regression | 3 | 1 | Yes | toHaveScreenshot() baselines |
| **Total** | **38** | **9** | | |

---

## 5. Cross-Browser Strategy

### 5.1 Browser Projects

| Project | Engine | Device Profile | Use Case |
|---------|--------|----------------|----------|
| chromium | Blink | Desktop Chrome | Primary, fastest execution |
| firefox | Gecko | Desktop Firefox | Cross-engine coverage |
| webkit | WebKit | Desktop Safari | iOS/macOS critical path |
| mobile-chrome | Blink | Pixel 5 | Mobile emulation (UA, touch, viewport) |
| mobile-safari | WebKit | iPhone 12 | iOS emulation |

### 5.2 CI Matrix

3 desktop browsers run as parallel GitHub Actions jobs:

```yaml
strategy:
  fail-fast: false          # all browsers complete even if one fails
  matrix:
    browser: [chromium, firefox, webkit]
```

Each job installs only its target browser (~150MB vs ~500MB for all), reducing CI time.

---

## 6. Visual Regression Design

### 6.1 Baseline Management

```
tests/visual/screenshot-comparison.spec.ts-snapshots/
├── full-page-chromium-darwin.png
├── full-page-chromium-linux.png
├── full-page-firefox-darwin.png
├── full-page-firefox-linux.png
├── heading-webkit-darwin.png
├── mobile-view-mobile-safari-darwin.png
└── ...
```

**Naming convention**: `{name}-{browser}-{platform}.png`

**Tolerance**: `maxDiffPixelRatio: 0.05` (5% pixel-level difference allowed)

### 6.2 Comparison Flow

```
First run          → generates baseline screenshots (committed to git)
Subsequent runs    → compares against baselines, fails on drift
Update baselines   → npx playwright test tests/visual/ --update-snapshots
```

---

## 7. CI/CD Integration

### 7.1 Workflow Design

```
┌──────────────────────────────────────────────────┐
│  Trigger: push/PR to main (playwright-demo/**)   │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Chromium  │  │ Firefox  │  │  WebKit  │      │
│  │  Job      │  │  Job     │  │  Job     │      │
│  │  (48s)    │  │  (54s)   │  │  (78s)   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│       ▼              ▼              ▼             │
│  ┌──────────────────────────────────────────┐    │
│  │  Artifacts (per browser, 7-day retention) │    │
│  │  - HTML report (interactive debugging)    │    │
│  │  - JUnit XML (CI dashboard integration)   │    │
│  │  - Trace files (on failure only)          │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 7.2 Configuration Differences (Local vs CI)

| Setting | Local | CI |
|---------|-------|----|
| Workers | auto (CPU cores) | 1 (stability) |
| Retries | 0 | 2 |
| `forbidOnly` | false | true (prevent `.only` leaks) |
| Trace | on-first-retry | on-first-retry |
| Screenshots | only-on-failure | only-on-failure |
| Video | retain-on-failure | retain-on-failure |

---

## 8. Reporter Configuration

```typescript
reporter: [
  ['list'],                                        // Console: real-time test progress
  ['html', { open: 'never' }],                     // HTML: interactive report with traces
  ['junit', { outputFile: 'test-results/junit.xml' }] // JUnit: CI dashboard integration
],
```

| Reporter | Output | Purpose |
|----------|--------|---------|
| list | Console | Developer feedback during local runs |
| html | `playwright-report/index.html` | Interactive debugging with DOM snapshots |
| junit | `test-results/junit.xml` | GitHub Actions / Jenkins integration |

---

## 9. Error Handling & Debugging

### 9.1 Trace on First Retry

```typescript
use: {
  trace: 'on-first-retry',       // captures only when test fails + retries
  screenshot: 'only-on-failure',  // automatic failure screenshots
  video: 'retain-on-failure',     // video recording on failure
}
```

Trace captures: DOM snapshots, network logs, console output, action timeline — without storage overhead on passing tests.

### 9.2 Debugging Workflow

```bash
# Run with headed browser
npm run test:headed

# View HTML report with trace viewer
npm run report

# Debug specific test
npx playwright test tests/ui/navigation.spec.ts --debug
```

---

## 10. TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "paths": {
      "@pages/*": ["pages/*"],
      "@fixtures/*": ["fixtures/*"],
      "@helpers/*": ["helpers/*"]
    }
  }
}
```

Path aliases enable clean imports:
```typescript
import { test } from '@fixtures/base.fixture';
import { ExamplePage } from '@pages/example.page';
import { ApiHelper } from '@helpers/api.helper';
```

---

## 11. Comparison with Cypress

| Capability | Playwright | Cypress |
|------------|-----------|---------|
| Browser engines | 3 (Chromium, Firefox, WebKit) | 2 (Chromium, Firefox) |
| Multi-tab testing | Native `context.newPage()` | Not supported |
| API testing | First-class, no browser overhead | `cy.request()` runs in browser |
| Visual regression | Built-in `toHaveScreenshot()` | Third-party plugin required |
| Parallel execution | Free, built-in workers | Paid dashboard required |
| TypeScript | First-class, ships types | Supported, JS-first |
| Mobile emulation | Device profiles (UA, touch, viewport) | Viewport resizing only |
| Trace debugging | Timeline + DOM snapshots | Time-travel (different model) |
| Test isolation | Fixture-based DI | `beforeEach` hooks |

---

## 12. NPM Scripts

```bash
npm test                # Run all tests (all browsers)
npm run test:chromium   # Chromium only
npm run test:firefox    # Firefox only
npm run test:webkit     # WebKit only
npm run test:api        # API tests only (no browser)
npm run test:ui         # UI tests only
npm run test:visual     # Visual regression only
npm run test:a11y       # Accessibility audit only
npm run test:headed     # Interactive headed mode
npm run report          # Open HTML report
```

---

## 13. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | ^1.49.1 | Test framework + all browser engines |
| `@axe-core/playwright` | ^4.10.1 | WCAG accessibility auditing |
| `typescript` | ^5.7.2 | Type safety and compile-time validation |

3 dependencies total — minimal footprint by design.
