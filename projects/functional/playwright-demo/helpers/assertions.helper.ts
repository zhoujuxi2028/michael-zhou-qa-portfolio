/**
 * Assertion Helpers — Schema and Format Validators
 *
 * Interview Talking Point:
 * "Reusable validators keep test assertions DRY. When we add a new field to the
 * user schema, we update one validator instead of every test that checks users."
 */

import { expect } from '@playwright/test';
import type { User, Post } from './api.helper';
import { TEST_DATA } from '../fixtures/test-data';

/** Validate that an object has all expected user schema keys */
export function validateUserSchema(user: Record<string, unknown>): void {
  for (const key of TEST_DATA.USER_SCHEMA_KEYS) {
    expect(user).toHaveProperty(key);
  }
}

/** Validate that an object has all expected post schema keys */
export function validatePostSchema(post: Record<string, unknown>): void {
  for (const key of TEST_DATA.POST_SCHEMA_KEYS) {
    expect(post).toHaveProperty(key);
  }
}

/** Validate email format with regex */
export function validateEmailFormat(email: string): void {
  expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}

/** Validate that a response has expected content-type header */
export function validateJsonContentType(contentType: string | null): void {
  expect(contentType).toContain('application/json');
}
