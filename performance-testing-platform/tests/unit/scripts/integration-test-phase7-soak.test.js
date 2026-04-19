const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../../../');
const PHASE7_SCRIPT = path.join(PROJECT_ROOT, 'scripts/integration-test-phase7-soak.sh');
const MAIN_SCRIPT = path.join(PROJECT_ROOT, 'scripts/integration-test.sh');

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

describe('integration-test-phase7-soak.sh', () => {
  test('fails fast with actionable message when docker daemon is unavailable', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-108-docker-'));

    writeExecutable(
      path.join(tempDir, 'docker'),
      `#!/bin/sh
if [ "$1" = "info" ]; then
  echo "Cannot connect to the Docker daemon" >&2
  exit 1
fi
exit 1
`
    );

    writeExecutable(
      path.join(tempDir, 'bash'),
      `#!/bin/sh
exit 0
`
    );

    const result = spawnSync('/bin/bash', [PHASE7_SCRIPT], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH}`,
      },
      timeout: 30000,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Docker daemon not running');
  });

  test('accepts current soak dashboard and alert assets without requiring rules.yml', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-108-'));
    const logFile = path.join(tempDir, 'curl.log');
    const stateFile = path.join(tempDir, 'state.json');

    writeExecutable(
      path.join(tempDir, 'docker'),
      `#!/bin/sh
echo "docker $*" >> "${logFile}"
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'sleep'),
      `#!/bin/sh
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'k6'),
      `#!/bin/sh
echo "k6 $*" >> "${logFile}"
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'bash'),
      `#!/bin/sh
echo "bash $*" >> "${logFile}"
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'curl'),
      `#!/usr/bin/env node
const fs = require('fs');
const logFile = ${JSON.stringify(logFile)};
const stateFile = ${JSON.stringify(stateFile)};
const args = process.argv.slice(2);
const url = args[args.length - 1] || '';
fs.appendFileSync(logFile, url + '\\n');
let state = { countQueryCalls: 0 };
if (fs.existsSync(stateFile)) {
  state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}
let body = '';
if (url.includes('/health') && url.includes(':3000')) {
  body = '{"status":"ok"}';
} else if (url.includes('/ping')) {
  body = '';
} else if (url.includes('/api/health')) {
  body = '{"database":"ok"}';
} else if (url.includes('COUNT(value)')) {
  state.countQueryCalls += 1;
  body = state.countQueryCalls === 1
    ? '{"results":[{"series":[{"values":[["1970-01-01T00:00:00Z",0]]}]}]}'
    : '{"results":[{"series":[{"values":[["1970-01-01T00:00:00Z",12]]}]}]}';
} else if (url.includes('SELECT%20*%20FROM%20soak_heap_used_mb')) {
  body = '{"results":[{"series":[{"name":"soak_heap_used_mb","values":[["1970-01-01T00:00:00Z",42]]}]}]}';
} else if (url.includes('PERCENTILE(value,%2095)')) {
  body = '{"results":[{"series":[{"values":[["1970-01-01T00:00:00Z",650]]}]}]}';
} else if (url.includes('/api/dashboards/uid/soak-results')) {
  body = '{"dashboard":{"title":"Soak Test Results — Memory & Business Metrics","panels":[{"title":"Response Time p95","alert":{"name":"p95 Latency High"}},{"title":"Error Rate","alert":{"name":"Error Rate High"}}]}}';
} else {
  body = '{}';
}
fs.writeFileSync(stateFile, JSON.stringify(state));
process.stdout.write(body);
`
    );

    const result = spawnSync('/bin/bash', [PHASE7_SCRIPT], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH}`,
      },
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('K6-SOAK-INT-01');
    expect(result.stdout).toContain('K6-SOAK-INT-02');

    const curlLog = fs.readFileSync(logFile, 'utf8');
    expect(curlLog).toContain('/api/dashboards/uid/soak-results');
    expect(result.stdout).not.toContain('Alert rules provisioning file not found');
  });

  test('treats Grafana health JSON with whitespace as healthy', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-108-grafana-health-'));
    const logFile = path.join(tempDir, 'curl.log');
    const stateFile = path.join(tempDir, 'state.json');

    writeExecutable(
      path.join(tempDir, 'docker'),
      `#!/bin/sh
echo "docker $*" >> "${logFile}"
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'sleep'),
      `#!/bin/sh
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'k6'),
      `#!/bin/sh
echo "k6 $*" >> "${logFile}"
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'bash'),
      `#!/bin/sh
echo "bash $*" >> "${logFile}"
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, 'curl'),
      `#!/usr/bin/env node
const fs = require('fs');
const logFile = ${JSON.stringify(logFile)};
const stateFile = ${JSON.stringify(stateFile)};
const args = process.argv.slice(2);
const url = args[args.length - 1] || '';
fs.appendFileSync(logFile, url + '\\n');
let state = { countQueryCalls: 0 };
if (fs.existsSync(stateFile)) {
  state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}
let body = '';
if (url.includes('/health') && url.includes(':3000')) {
  body = '{"status":"ok"}';
} else if (url.includes('/ping')) {
  body = '';
} else if (url.includes('/api/health')) {
  body = '{\\n  "commit": "abc123",\\n  "database": "ok",\\n  "version": "10.2.0"\\n}';
} else if (url.includes('COUNT(value)')) {
  state.countQueryCalls += 1;
  body = state.countQueryCalls === 1
    ? '{"results":[{"series":[{"values":[["1970-01-01T00:00:00Z",0]]}]}]}'
    : '{"results":[{"series":[{"values":[["1970-01-01T00:00:00Z",12]]}]}]}';
} else if (url.includes('SELECT%20*%20FROM%20soak_heap_used_mb')) {
  body = '{"results":[{"series":[{"name":"soak_heap_used_mb","values":[["1970-01-01T00:00:00Z",42]]}]}]}';
} else if (url.includes('PERCENTILE(value,%2095)')) {
  body = '{"results":[{"series":[{"values":[["1970-01-01T00:00:00Z",650]]}]}]}';
} else if (url.includes('/api/dashboards/uid/soak-results')) {
  body = '{"dashboard":{"title":"Soak Test Results — Memory & Business Metrics","panels":[{"title":"Response Time p95","alert":{"name":"p95 Latency High"}},{"title":"Error Rate","alert":{"name":"Error Rate High"}}]}}';
} else {
  body = '{}';
}
fs.writeFileSync(stateFile, JSON.stringify(state));
process.stdout.write(body);
`
    );

    const result = spawnSync('/bin/bash', [PHASE7_SCRIPT], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH}`,
      },
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Grafana API responding, database connected');
  });

  test('main integration runner delegates phase 4 soak verification instead of hard-coded skip', () => {
    const script = fs.readFileSync(MAIN_SCRIPT, 'utf8');
    expect(script).toContain('bash scripts/integration-test-phase7-soak.sh');
    expect(script).not.toContain('SOAK-TC-04" "SKIP"');
    expect(script).not.toContain('SOAK-TC-05" "SKIP"');
  });
});
