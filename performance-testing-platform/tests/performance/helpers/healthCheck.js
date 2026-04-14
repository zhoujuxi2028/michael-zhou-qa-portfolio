/**
 * Health check helper for setup() phase validation
 * Ensures API is responsive before running load tests
 */
import http from 'k6/http';
import { fail } from 'k6';

/**
 * Verify API health endpoint responds
 * @param {string} baseUrl - API base URL
 * @throws {Error} if health check fails
 */
export function verifyHealth(baseUrl) {
  const response = http.get(`${baseUrl}/health`);

  if (response.status !== 200) {
    fail(
      `Health check failed: expected status 200, got ${response.status}. ` +
        `URL: ${baseUrl}/health`
    );
  }

  try {
    const body = JSON.parse(response.body);
    if (!body.status || body.status !== 'ok') {
      fail(`Health check returned non-ok status: ${body.status}`);
    }
  } catch (e) {
    fail(`Health check response not valid JSON: ${response.body}`);
  }
}
