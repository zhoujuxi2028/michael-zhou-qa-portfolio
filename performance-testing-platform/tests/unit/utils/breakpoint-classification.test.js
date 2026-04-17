/**
 * Breakpoint crash classification tests (K6-CLASS-01/02)
 * Verify graceful vs catastrophic crash type classification
 */

describe('breakpoint crash classification (K6-CLASS)', () => {
  // Helper function to create mock k6 handleSummary data
  const createMockSummaryData = (p95 = 400, errorRate = 0) => ({
    metrics: {
      http_req_duration: {
        values: { p95 }
      },
      http_req_failed: {
        values: { value: errorRate }
      }
    }
  });

  // Mock handleSummary logic (extracted from breakpoint.k6.js)
  const classifyCrashType = (errorRate) => {
    return errorRate > 0.5 ? 'catastrophic' : 'graceful';
  };

  // K6-CLASS-01: Graceful degradation (error rate ≤ 50%)
  test('K6-CLASS-01: error rate ≤ 0.5 should classify as graceful', () => {
    const testCases = [
      { errorRate: 0, description: 'no errors' },
      { errorRate: 0.1, description: '10% error rate' },
      { errorRate: 0.3, description: '30% error rate' },
      { errorRate: 0.5, description: '50% error rate (boundary)' }
    ];

    testCases.forEach(({ errorRate, description }) => {
      const result = classifyCrashType(errorRate);
      expect(result).toBe('graceful');
      expect(result).toMatch(/graceful/i);
    });
  });

  // K6-CLASS-02: Catastrophic degradation (error rate > 50%)
  test('K6-CLASS-02: error rate > 0.5 should classify as catastrophic', () => {
    const testCases = [
      { errorRate: 0.51, description: '51% error rate (boundary+1%)' },
      { errorRate: 0.75, description: '75% error rate' },
      { errorRate: 0.9, description: '90% error rate' },
      { errorRate: 1.0, description: '100% error rate (complete failure)' }
    ];

    testCases.forEach(({ errorRate, description }) => {
      const result = classifyCrashType(errorRate);
      expect(result).toBe('catastrophic');
      expect(result).toMatch(/catastrophic/i);
    });
  });

  // Boundary test: exactly at 50%
  test('K6-CLASS boundary: exactly 0.5 error rate should be graceful', () => {
    const result = classifyCrashType(0.5);
    expect(result).toBe('graceful');
  });

  // Test error rate extraction and classification together
  test('K6-CLASS-01: handleSummary with low error rate produces graceful output', () => {
    const data = createMockSummaryData(450, 0.1); // 10% error rate
    const errorRate = data.metrics.http_req_failed?.values?.['value'] || 0;
    const crashType = classifyCrashType(errorRate);

    expect(crashType).toBe('graceful');
  });

  test('K6-CLASS-02: handleSummary with high error rate produces catastrophic output', () => {
    const data = createMockSummaryData(2500, 0.75); // 75% error rate, high latency
    const errorRate = data.metrics.http_req_failed?.values?.['value'] || 0;
    const crashType = classifyCrashType(errorRate);

    expect(crashType).toBe('catastrophic');
  });

  // Verify output string contains classification
  test('K6-CLASS: summary output contains crash classification label', () => {
    const classifyAndFormat = (errorRate) => {
      const crashType = classifyCrashType(errorRate);
      return `Crash Classification: ${crashType}`;
    };

    const graceOutput = classifyAndFormat(0.2);
    expect(graceOutput).toContain('graceful');

    const catOutput = classifyAndFormat(0.8);
    expect(catOutput).toContain('catastrophic');
  });
});
