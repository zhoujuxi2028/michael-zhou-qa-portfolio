/**
 * Responsive Design Tests — Mobile, Tablet, Desktop Viewports
 *
 * Interview Talking Point:
 * "Playwright's test.use({ viewport }) sets the viewport per describe block
 * declaratively. Combined with mobile device emulation (user-agent, touch events),
 * this goes beyond Cypress's cy.viewport() which only resizes the window."
 */

import { test, expect } from '../../fixtures/base.fixture';
import { TEST_DATA } from '../../fixtures/test-data';

const { VIEWPORTS } = TEST_DATA;

for (const [device, config] of Object.entries(VIEWPORTS)) {
  test.describe(`Responsive — ${config.label}`, () => {
    test.use({ viewport: { width: config.width, height: config.height } });

    test(`should render heading on ${device}`, async ({ examplePage }) => {
      await examplePage.navigate();

      await expect(examplePage.heading).toBeVisible();
      await expect(examplePage.heading).toHaveText('Example Domain');
    });

    test(`should render description on ${device}`, async ({ examplePage }) => {
      await examplePage.navigate();

      await expect(examplePage.description).toBeVisible();
    });

    test(`should render learn-more link on ${device}`, async ({ examplePage }) => {
      await examplePage.navigate();

      await expect(examplePage.learnMoreLink).toBeVisible();
    });
  });
}
