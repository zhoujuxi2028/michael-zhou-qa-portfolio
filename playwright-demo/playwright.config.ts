/**
 * Playwright Configuration
 *
 * Interview Talking Point:
 * "Playwright runs tests across Chromium, Firefox, and WebKit from a single config.
 * Unlike Cypress, which only supports Chromium and Firefox, Playwright adds WebKit
 * (Safari's engine) — critical for teams shipping to iOS/macOS users."
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,

  // Interview Talking Point:
  // "We generate HTML, list, and JUnit reports. JUnit integrates with CI dashboards
  // (GitHub Actions, Jenkins). HTML gives developers an interactive debugging view."
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    // Interview Talking Point:
    // "Trace on-first-retry captures DOM snapshots, network logs, and console output
    // only when a test fails and retries. This avoids storage overhead on passing tests
    // while giving full debugging context on failures."
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  // Interview Talking Point:
  // "Five browser projects cover desktop (3 engines) and mobile (2 device emulations).
  // Mobile emulation includes user-agent, touch events, and viewport — not just resizing."
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
