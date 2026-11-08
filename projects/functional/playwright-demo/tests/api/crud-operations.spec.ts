/**
 * API CRUD Operations Tests
 *
 * Interview Talking Point:
 * "Playwright's API testing is first-class — no browser overhead. These tests use
 * the request fixture directly, making them significantly faster than Cypress's
 * cy.request() which always runs inside a browser context."
 */

import { test, expect } from '../../fixtures/base.fixture';
import { TEST_DATA } from '../../fixtures/test-data';
import { ApiHelper } from '../../helpers/api.helper';
import { validatePostSchema } from '../../helpers/assertions.helper';

test.describe('API CRUD Operations — JSONPlaceholder', () => {
  let api: ApiHelper;

  test.beforeEach(async ({ apiContext }) => {
    api = new ApiHelper(apiContext);
  });

  // ── GET ─────────────────────────────────────────────────────────

  test('GET /users — should retrieve all users', async ({ apiContext }) => {
    const response = await apiContext.get('/users');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const users = await response.json();
    expect(users).toBeInstanceOf(Array);
    expect(users.length).toBeGreaterThan(0);
  });

  test('GET /users/:id — should retrieve a specific user', async ({ apiContext }) => {
    const response = await apiContext.get('/users/1');

    expect(response.status()).toBe(200);

    const user = await response.json();
    expect(user).toHaveProperty('id', 1);
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
  });

  // ── POST ────────────────────────────────────────────────────────

  test('POST /posts — should create a new post', async ({ apiContext }) => {
    // Interview Talking Point:
    // "We send typed payloads and validate the response shape matches expectations.
    // JSONPlaceholder returns 201 with the created resource including a server-assigned ID."
    const response = await apiContext.post('/posts', {
      data: TEST_DATA.TEST_POST,
    });

    expect(response.status()).toBe(201);

    const post = await response.json();
    expect(post).toHaveProperty('id');
    expect(post.title).toBe(TEST_DATA.TEST_POST.title);
    expect(post.body).toBe(TEST_DATA.TEST_POST.body);
    expect(post.userId).toBe(TEST_DATA.TEST_POST.userId);
    validatePostSchema(post);
  });

  // ── PUT ─────────────────────────────────────────────────────────

  test('PUT /posts/:id — should update an existing post', async ({ apiContext }) => {
    const updatedData = {
      id: 1,
      title: 'Updated Post Title',
      body: 'Updated post body content',
      userId: 1,
    };

    const response = await apiContext.put('/posts/1', { data: updatedData });

    expect(response.status()).toBe(200);

    const post = await response.json();
    expect(post.title).toBe(updatedData.title);
    expect(post.body).toBe(updatedData.body);
  });

  // ── PATCH ───────────────────────────────────────────────────────

  test('PATCH /posts/:id — should partially update a post', async ({ apiContext }) => {
    const response = await apiContext.patch('/posts/1', {
      data: { title: 'Patched Title' },
    });

    expect(response.status()).toBe(200);

    const post = await response.json();
    expect(post.title).toBe('Patched Title');
    expect(post).toHaveProperty('body'); // other fields preserved
  });

  // ── DELETE ──────────────────────────────────────────────────────

  test('DELETE /posts/:id — should delete a post', async ({ apiContext }) => {
    const response = await apiContext.delete('/posts/1');

    expect(response.status()).toBe(200);
  });
});
