import { sleep } from 'k6';

/**
 * Generate random integer between min and max (inclusive)
 * Replaces jslib.k6.io/k6-utils randomIntBetween to eliminate CDN dependency
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in [min, max]
 */
export function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pause for a random duration (think time in user journey)
 * @param {number} min - Minimum sleep duration in seconds (default 0.5)
 * @param {number} max - Maximum sleep duration in seconds (default 1.0)
 */
export function thinkTime(min = 0.5, max = 1.0) {
  // Use float range for finer granularity in sleep timing
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}
