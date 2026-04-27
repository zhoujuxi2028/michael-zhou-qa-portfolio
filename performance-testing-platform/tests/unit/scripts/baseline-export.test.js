const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts/analysis/baseline-export.js');

describe('baseline-export.js', () => {
  test('exports baseline from current k6 summary values fields', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-export-'));
    const summaryFile = path.join(tempDir, 'summary.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    fs.writeFileSync(
      summaryFile,
      JSON.stringify({
        metrics: {
          http_req_duration: {
            values: {
              'p(95)': 3.085,
              avg: 1.43,
            },
          },
          http_req_failed: {
            value: 0,
          },
          http_reqs: {
            count: 900,
            rate: 14.92,
          },
        },
        state: {
          testRunDurationMs: 60313,
        },
      })
    );

    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    expect(baseline).toMatchObject({
      p95_ms: 3,
      error_rate: 0,
      throughput_rps: 14.9,
      run_id: 'local',
    });
  });

  test('exports baseline from current k6 summary top-level metric fields', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-export-'));
    const summaryFile = path.join(tempDir, 'summary.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    fs.writeFileSync(
      summaryFile,
      JSON.stringify({
        metrics: {
          http_req_duration: {
            'p(95)': 3.69,
            avg: 5.81,
          },
          http_req_failed: {
            value: 0,
          },
          http_reqs: {
            count: 885,
            rate: 14.72,
          },
        },
        state: {
          testRunDurationMs: 60100,
        },
      })
    );

    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    expect(baseline).toMatchObject({
      p95_ms: 4,
      error_rate: 0,
      throughput_rps: 14.7,
      run_id: 'local',
    });
  });
});
