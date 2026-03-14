/**
 * Base Page Object
 *
 * Interview Talking Point:
 * "The base page provides shared navigation and utility methods. Every page object
 * extends this class, enforcing consistent patterns across the test suite. This is
 * the same POM pattern used in our Selenium and Cypress projects."
 */

import { type Page, type Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a URL and wait for the network to settle */
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /** Wait for the page to reach a ready state */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /** Take a named screenshot for debugging or visual comparison */
  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }

  /** Get the page title */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** Get a locator by role — preferred accessible selector strategy */
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /** Get a locator by text content */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }
}
