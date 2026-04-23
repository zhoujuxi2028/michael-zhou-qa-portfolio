/**
 * LEAK-INT-01~03: 内存泄漏检测集成测试
 *
 * 验证内存泄漏检测工具的阈值判断逻辑。
 * 跨模块集成：leak-detection.js + metrics middleware
 */
const { checkMemoryLeak } = require('../../../src/utils/leak-detection');

describe('内存泄漏检测集成测试 (LEAK-INT)', () => {
  // LEAK-INT-01: 正常内存增长 → ok
  test('LEAK-INT-01: 内存增长低于 25% 应判定为 ok', () => {
    // Arrange: 10% 增长
    const baseline = 100 * 1024 * 1024; // 100MB
    const final = 110 * 1024 * 1024; // 110MB

    // Act
    const result = checkMemoryLeak(baseline, final);

    // Assert
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
    expect(result.ratio).toBeCloseTo(0.1, 1);
  });

  // LEAK-INT-02: 超过 50% 增长 → critical
  test('LEAK-INT-02: 内存增长超过 50% 应判定为 critical', () => {
    // Arrange: 60% 增长
    const baseline = 100 * 1024 * 1024;
    const final = 160 * 1024 * 1024;

    // Act
    const result = checkMemoryLeak(baseline, final);

    // Assert
    expect(result.leaked).toBe(true);
    expect(result.level).toBe('critical');
    expect(result.ratio).toBeCloseTo(0.6, 1);
  });

  // LEAK-INT-03: 25%~50% 增长 → warning
  test('LEAK-INT-03: 内存增长 25%~50% 应判定为 warning', () => {
    // Arrange: 35% 增长
    const baseline = 100 * 1024 * 1024;
    const final = 135 * 1024 * 1024;

    // Act
    const result = checkMemoryLeak(baseline, final);

    // Assert
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('warning');
    expect(result.ratio).toBeCloseTo(0.35, 1);
  });
});
