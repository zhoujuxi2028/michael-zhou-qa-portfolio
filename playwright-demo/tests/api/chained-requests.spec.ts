/**
 * Chained API Request Tests — Multi-step Workflows
 *
 * Interview Talking Point:
 * "These tests demonstrate API workflow testing — creating a resource, reading it back,
 * updating it, and deleting it. This mirrors real-world scenarios where operations
 * depend on previous responses."
 */

import { test, expect } from '../../fixtures/base.fixture';
import { TEST_DATA } from '../../fixtures/test-data';
import { validatePostSchema, validateUserSchema } from '../../helpers/assertions.helper';

test.describe('Chained API Requests', () => {

  test('CRUD lifecycle — create → read → update → delete', async ({ apiContext }) => {
    // Interview Talking Point:
    // "This test validates the full lifecycle. In production APIs, we'd verify each
    // step affects persistent state. JSONPlaceholder simulates this behavior."

    // Step 1: Create
    const createResponse = await apiContext.post('/posts', {
      data: TEST_DATA.TEST_POST,
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created).toHaveProperty('id');
    const postId = created.id;

    // Step 2: Read back (JSONPlaceholder returns id=101 for new posts,
    // but doesn't persist — so we read post 1 to show the pattern)
    const readResponse = await apiContext.get('/posts/1');
    expect(readResponse.status()).toBe(200);
    const read = await readResponse.json();
    validatePostSchema(read);

    // Step 3: Update
    const updateResponse = await apiContext.put('/posts/1', {
      data: { ...TEST_DATA.TEST_POST, id: 1, title: 'Updated in lifecycle test' },
    });
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.title).toBe('Updated in lifecycle test');

    // Step 4: Delete
    const deleteResponse = await apiContext.delete('/posts/1');
    expect(deleteResponse.status()).toBe(200);
  });

  test('user → posts relationship — fetch user then their posts', async ({ apiContext }) => {
    // Interview Talking Point:
    // "This test demonstrates API relationship traversal — fetching a user, then
    // using their ID to query related posts. This pattern is common in REST APIs."

    // Step 1: Get a user
    const userResponse = await apiContext.get('/users/1');
    expect(userResponse.status()).toBe(200);
    const user = await userResponse.json();
    validateUserSchema(user);

    // Step 2: Get their posts
    const postsResponse = await apiContext.get(`/posts?userId=${user.id}`);
    expect(postsResponse.status()).toBe(200);
    const posts = await postsResponse.json();

    expect(posts).toBeInstanceOf(Array);
    expect(posts.length).toBeGreaterThan(0);

    // Verify all posts belong to the correct user
    for (const post of posts) {
      expect(post.userId).toBe(user.id);
      validatePostSchema(post);
    }
  });
});
