const { simulateDelay } = require('../../../src/utils/delay');

describe('delay utility', () => {
  test('resolves after specified ms', async () => {
    const start = Date.now();
    await simulateDelay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
    // Upper bound only guards against infinite hangs; event-loop jitter under
    // parallel jest workers can push a 50ms setTimeout well past 200ms.
    expect(elapsed).toBeLessThan(2000);
  });

  test('resolves immediately when delay is 0', async () => {
    const start = Date.now();
    await simulateDelay(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
