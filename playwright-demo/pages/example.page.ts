/**
 * Example.com Page Object
 *
 * Interview Talking Point:
 * "We use getByRole locators instead of CSS selectors. These mirror how assistive
 * technology finds elements, making tests more resilient and validating accessibility
 * at the same time. If a heading changes from h1 to h2, the test catches it."
 */

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ExamplePage extends BasePage {
  // Interview Talking Point:
  // "Locators are defined as properties, not resolved eagerly. Playwright auto-waits
  // when you interact with them — no explicit waits or retries needed."
  readonly heading: Locator;
  readonly description: Locator;
  readonly learnMoreLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.description = page.locator('p').first();
    this.learnMoreLink = page.getByRole('link', { name: /learn more/i });
  }

  async navigate(): Promise<void> {
    await this.goto('https://example.com');
  }

  async getHeadingText(): Promise<string> {
    return (await this.heading.textContent()) ?? '';
  }

  async getDescriptionText(): Promise<string> {
    return (await this.description.textContent()) ?? '';
  }

  async clickLearnMore(): Promise<void> {
    await this.learnMoreLink.click();
  }

  async getLearnMoreHref(): Promise<string | null> {
    return this.learnMoreLink.getAttribute('href');
  }
}
