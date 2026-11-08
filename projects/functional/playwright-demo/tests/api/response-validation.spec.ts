/**
 * API Response Validation Tests
 *
 * Interview Talking Point:
 * "Beyond status codes, we validate headers, response schemas, and error behavior.
 * This catches regressions where an API returns 200 but with a broken payload."
 */

import { test, expect } from '../../fixtures/base.fixture';
import { validateUserSchema, validateEmailFormat, validateJsonContentType } from '../../helpers/assertions.helper';

test.describe('API Response Validation', () => {

  test('should return correct content-type header', async ({ apiContext }) => {
    const response = await apiContext.get('/users');

    validateJsonContentType(response.headers()['content-type']);
  });

  test('should return valid user schema structure', async ({ apiContext }) => {
    // Interview Talking Point:
    // "Schema validation catches subtle backend changes — a renamed field or changed
    // type that wouldn't cause a status code error but would break the frontend."
    const response = await apiContext.get('/users/1');
    const user = await response.json();

    validateUserSchema(user);
    validateEmailFormat(user.email);
  });

  test('should return 404 for non-existent resource', async ({ apiContext }) => {
    // Interview Talking Point:
    // "Unlike Cypress, Playwright doesn't throw on non-2xx by default, so we can
    // naturally assert error status codes without special configuration."
    const response = await apiContext.get('/users/99999');

    expect(response.status()).toBe(404);
  });

  test('should include expected headers in response', async ({ apiContext }) => {
    const response = await apiContext.get('/posts/1');

    expect(response.status()).toBe(200);
    expect(response.headers()).toHaveProperty('content-type');
    // JSONPlaceholder returns cache and CORS headers
    expect(response.headers()).toHaveProperty('access-control-allow-credentials');
  });
});
