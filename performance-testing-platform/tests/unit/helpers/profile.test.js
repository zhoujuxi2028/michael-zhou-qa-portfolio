const { loadProfile } = require('../../../src/utils/profile-parser');

describe('loadProfile', () => {
  test('UT-PROF-01: parses valid profile JSON with stages and thresholds', () => {
    const json = JSON.stringify({
      stages: [{ duration: '1m', target: 20 }],
      thresholds: { http_req_duration: ['p(95)<500'] },
    });
    const result = loadProfile(json);
    expect(result.stages).toHaveLength(1);
    expect(result.thresholds).toHaveProperty('http_req_duration');
  });

  test('UT-PROF-02: throws error for invalid JSON string', () => {
    expect(() => loadProfile('not json')).toThrow('Invalid profile JSON');
  });

  test('UT-PROF-03: throws error when missing both stages and vus', () => {
    const json = JSON.stringify({ thresholds: { http_req_duration: ['p(95)<500'] } });
    expect(() => loadProfile(json)).toThrow();
  });

  test('UT-PROF-04: throws error when stages is empty array', () => {
    const json = JSON.stringify({
      stages: [],
      thresholds: { http_req_duration: ['p(95)<500'] },
    });
    expect(() => loadProfile(json)).toThrow('must not be empty');
  });

  test('UT-PROF-05: throws error when stage missing duration or target', () => {
    const json = JSON.stringify({
      stages: [{ duration: '1m' }],
      thresholds: { http_req_duration: ['p(95)<500'] },
    });
    expect(() => loadProfile(json)).toThrow('Stage 0');
  });

  test('UT-PROF-06: throws error when thresholds object is missing', () => {
    const json = JSON.stringify({ stages: [{ duration: '1m', target: 5 }] });
    expect(() => loadProfile(json)).toThrow('thresholds');
  });

  test('UT-PROF-07: returns complete options object (stages + thresholds)', () => {
    const json = JSON.stringify({
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 50 },
      ],
      thresholds: { http_req_duration: ['p(95)<2000'], http_req_failed: ['rate<0.01'] },
    });
    const result = loadProfile(json);
    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].target).toBe(20);
    expect(result.thresholds.http_req_failed).toEqual(['rate<0.01']);
  });

  test('UT-PROF-08: preserves optional fields (e.g., setupTimeout)', () => {
    const json = JSON.stringify({
      stages: [{ duration: '1m', target: 5 }],
      thresholds: { http_req_duration: ['p(95)<500'] },
      setupTimeout: '30s',
    });
    const result = loadProfile(json);
    expect(result.setupTimeout).toBe('30s');
  });

  test('UT-PROF-09: supports vus + duration mode (no stages)', () => {
    const json = JSON.stringify({
      vus: 5,
      duration: '60s',
      thresholds: { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.01'] },
    });
    const result = loadProfile(json);
    expect(result.vus).toBe(5);
    expect(result.duration).toBe('60s');
    expect(result.thresholds).toHaveProperty('http_req_duration');
    expect(result).not.toHaveProperty('stages');
  });

  test('UT-PROF-10: supports observer metadata for multi-scenario profile', () => {
    const json = JSON.stringify({
      stages: [{ duration: '1m', target: 10 }],
      thresholds: {
        'http_req_duration{scenario:load}': ['p(95)<500'],
        'http_req_failed{scenario:load}': ['rate<0.01'],
      },
      observer: {
        enabled: true,
        exec: 'observeMetrics',
        vus: 1,
      },
    });
    const result = loadProfile(json);
    expect(result.observer).toEqual(
      expect.objectContaining({
        enabled: true,
        exec: 'observeMetrics',
        vus: 1,
      })
    );
  });

  test('UT-PROF-11: rejects observer config with non-boolean enabled flag', () => {
    const json = JSON.stringify({
      stages: [{ duration: '1m', target: 10 }],
      thresholds: { 'http_req_duration{scenario:load}': ['p(95)<500'] },
      observer: {
        enabled: 'yes',
        vus: 1,
      },
    });
    expect(() => loadProfile(json)).toThrow('observer.enabled');
  });

  test('UT-PROF-12: rejects observer config with invalid vus value', () => {
    const json = JSON.stringify({
      stages: [{ duration: '1m', target: 10 }],
      thresholds: { 'http_req_duration{scenario:load}': ['p(95)<500'] },
      observer: {
        enabled: true,
        vus: 0,
      },
    });
    expect(() => loadProfile(json)).toThrow('observer.vus');
  });
});
