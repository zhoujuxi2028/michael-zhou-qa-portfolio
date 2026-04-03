const {
  checkMemoryLeak,
  LEAK_THRESHOLD,
  WARN_THRESHOLD,
} = require('../../../src/utils/leak-detection');

describe('checkMemoryLeak', () => {
  test('UT-SOAK-01: no leak — stable heap (10% growth)', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 110 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
    expect(result.ratio).toBeCloseTo(0.1, 1);
  });

  test('UT-SOAK-02: warning — 30% growth', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 130 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('warning');
    expect(result.ratio).toBeCloseTo(0.3, 1);
  });

  test('UT-SOAK-03: critical leak — 60% growth', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 160 * 1024 * 1024);
    expect(result.leaked).toBe(true);
    expect(result.level).toBe('critical');
    expect(result.ratio).toBeCloseTo(0.6, 1);
  });

  test('UT-SOAK-04: zero baseline — no crash', () => {
    const result = checkMemoryLeak(0, 50 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
    expect(result.ratio).toBe(0);
  });

  test('UT-SOAK-05: negative growth — heap shrunk', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 80 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
  });
});

describe('thresholds', () => {
  test('UT-SOAK-06: LEAK_THRESHOLD is 0.50', () => {
    expect(LEAK_THRESHOLD).toBe(0.5);
  });

  test('UT-SOAK-07: WARN_THRESHOLD is 0.25', () => {
    expect(WARN_THRESHOLD).toBe(0.25);
  });
});
