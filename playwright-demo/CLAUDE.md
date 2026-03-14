# CLAUDE.md - Playwright Demo Project

This file provides guidance to Claude Code when working with the Playwright demonstration project within the QA Portfolio.

## Project Purpose

This is a **Playwright test automation demo** showcasing:
- Cross-browser testing (Chromium, Firefox, WebKit)
- TypeScript-first test automation
- Playwright-exclusive features (multi-tab, visual comparison, API testing)
- Page Object Model with dependency injection fixtures
- Accessibility testing with axe-core

**Part of**: Michael Zhou's QA Portfolio (`michael-zhou-qa-portfolio`)
**Related Projects**: `cypress-tests/`, `cicd-demo/`, `postman-tests/`, `selenium-tests/`

## Quick Start

```bash
cd playwright-demo

# Install dependencies and browsers
npm install
npx playwright install

# Run all tests
npm test

# Run by browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run by category
npm run test:api          # API tests (no browser needed)
npm run test:ui           # UI tests
npm run test:visual       # Visual regression tests
npm run test:a11y         # Accessibility tests

# Interactive / debugging
npm run test:headed       # Run with visible browser
npm run report            # Open HTML report
```

## Architecture Overview

### Layered Structure

```
playwright-demo/
├── fixtures/          # Custom test fixtures (DI for page objects + API context)
├── pages/             # Page Object Model (base + example.com)
├── helpers/           # API wrapper + assertion utilities
└── tests/
    ├── api/           # API tests (12 tests, no browser)
    ├── ui/            # UI tests (14 tests, cross-browser)
    ├── visual/        # Screenshot comparison (3 tests)
    └── accessibility/ # axe-core audit (3 tests)
```

### Key Patterns

1. **Custom Fixtures** (`fixtures/base.fixture.ts`) — Dependency injection for page objects and API context. Import `{ test, expect }` from here instead of `@playwright/test`.
2. **Page Objects** (`pages/`) — All locators use `getByRole`/`getByText` for accessibility-first selectors.
3. **API Helper** (`helpers/api.helper.ts`) — Typed JSONPlaceholder wrapper with full CRUD methods.
4. **Test Data** (`fixtures/test-data.ts`) — Centralized constants (URLs, viewports, payloads).

### Test Categories

| Category | Tests | Browser Required | Key Feature |
|----------|-------|-----------------|-------------|
| API | 12 | No | First-class request fixture |
| UI | 14 | Yes | Auto-wait, multi-tab |
| Visual | 3 | Yes | Built-in toHaveScreenshot |
| A11y | 3 | Yes | axe-core integration |

## Common Commands

```bash
# Run specific test file
npx playwright test tests/api/crud-operations.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Debug mode (opens inspector)
npx playwright test --debug

# Update visual baselines
npx playwright test tests/visual/ --update-snapshots

# Generate code with codegen
npx playwright codegen https://example.com
```

## Interview Talking Points

### Why Playwright Over Cypress?
> "Playwright adds WebKit (Safari), multi-tab testing, and built-in visual comparison — features Cypress doesn't support. Its API testing doesn't require a browser context, and parallel execution is free without a paid dashboard."

### Fixtures / Dependency Injection
> "Playwright fixtures are like constructor injection. Each test declares its dependencies (examplePage, apiContext), and the framework provides isolated instances. This eliminates beforeEach boilerplate and guarantees test isolation."

### Cross-Browser Testing
> "One test suite runs on 3 browser engines. The CI matrix runs them in parallel. This caught a WebKit-specific rendering bug that Cypress couldn't have detected."

## Portfolio Context

This project is part of Michael Zhou's QA Portfolio demonstrating Playwright expertise alongside Cypress, Selenium, and Postman.

**For portfolio-wide guidance, see** the root `CLAUDE.md`.
