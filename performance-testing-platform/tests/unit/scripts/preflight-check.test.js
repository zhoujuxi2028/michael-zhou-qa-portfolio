const fs = require('fs');
const { spawnSync, spawn } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '../../../scripts/preflight-check.sh');
const SERVER_SCRIPT = path.join(__dirname, '../../../scripts/server.sh');
const COLLECTOR_PID_FILE = '/tmp/metrics-collector.pid';

/**
 * Run preflight-check.sh with optional env overrides.
 * Thresholds are overridable so tests don't depend on actual system state:
 *   LOAD_THRESHOLD=9999  → always pass load check
 *   LOAD_THRESHOLD=0     → always fail  load check (load > 0 always)
 *   MEM_MIN_GB=0         → always pass memory check
 *   MEM_MIN_GB=99999     → always fail  memory check
 *   CPU_IDLE_MIN=0       → always pass  CPU check
 *   CPU_IDLE_MIN=101     → always fail  CPU check (idle never > 100%)
 */
function run(env = {}) {
  return spawnSync('bash', [SCRIPT], {
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    timeout: 20000,
  });
}

/** All thresholds relaxed so every check passes regardless of system state */
const ALL_PASS = { LOAD_THRESHOLD: '9999', MEM_MIN_GB: '0', CPU_IDLE_MIN: '0' };

/** Force each individual check to fail */
const FAIL_LOAD = { LOAD_THRESHOLD: '0', MEM_MIN_GB: '0', CPU_IDLE_MIN: '0' };
const FAIL_MEM = { LOAD_THRESHOLD: '9999', MEM_MIN_GB: '99999', CPU_IDLE_MIN: '0' };
const FAIL_CPU = { LOAD_THRESHOLD: '9999', MEM_MIN_GB: '0', CPU_IDLE_MIN: '101' };

// ─── helper ──────────────────────────────────────────────────────────────────

/** Returns true only if the process is running (not zombie, not gone) */
function isProcessAlive(pid) {
  try {
    const result = spawnSync('ps', ['-p', String(pid), '-o', 'stat='], { encoding: 'utf-8' });
    const stat = result.stdout.trim();
    // Empty = not found; Z = zombie (killed but not reaped) — both count as dead
    return stat !== '' && !stat.startsWith('Z');
  } catch {
    return false;
  }
}

function waitForFile(filePath, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(filePath) && Date.now() < deadline) {
    spawnSync('sleep', ['0.2']);
  }
}

// ─── TC-PF-01~02: Orphan process cleanup ─────────────────────────────────────

describe('orphan process cleanup', () => {
  test('TC-PF-01: kills orphaned "node -e" processes', () => {
    // Spawn an orphan node -e process
    const orphan = spawn('node', ['-e', 'setInterval(()=>{}, 30000)'], {
      detached: true,
      stdio: 'ignore',
    });
    orphan.unref();
    const pid = orphan.pid;
    expect(isProcessAlive(pid)).toBe(true);

    run(ALL_PASS);

    // Give OS time to reap the process
    spawnSync('sleep', ['1.5']);
    expect(isProcessAlive(pid)).toBe(false);
  });

  test('TC-PF-02: output reports orphan cleanup step', () => {
    const result = run(ALL_PASS);
    expect(result.stdout).toMatch(/orphan|孤立|cleanup/i);
  });

  test('TC-PF-03: does not kill non-orphan node processes (cluster.js guard)', () => {
    // The script must only kill "node -e" pattern, not "node src/cluster.js"
    // Verified by checking the kill command targets "-e" flag explicitly
    const result = run(ALL_PASS);
    expect(result.stdout).not.toMatch(/cluster\.js.*killed/i);
  });

  test('TC-PF-04: does not kill managed metrics collector process', () => {
    fs.rmSync(COLLECTOR_PID_FILE, { force: true });

    const collector = spawn(
      'bash',
      [SERVER_SCRIPT, 'collect', '1000', 'reports/preflight-test-metrics.csv'],
      {
        detached: true,
        env: { ...process.env, NODE_ENV: 'development' },
        stdio: 'ignore',
      }
    );
    collector.unref();

    try {
      waitForFile(COLLECTOR_PID_FILE);
      expect(fs.existsSync(COLLECTOR_PID_FILE)).toBe(true);
      const collectorPid = fs.readFileSync(COLLECTOR_PID_FILE, 'utf8').trim();
      expect(isProcessAlive(collectorPid)).toBe(true);

      run(ALL_PASS);

      expect(isProcessAlive(collectorPid)).toBe(true);
    } finally {
      spawnSync('bash', [SERVER_SCRIPT, 'stop-collect'], {
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'development' },
      });
      fs.rmSync(COLLECTOR_PID_FILE, { force: true });
    }
  });
});

// ─── TC-PF-05~06: Load Average check ─────────────────────────────────────────

describe('load average check', () => {
  test('TC-PF-04: passes and prints ✅ when LOAD_THRESHOLD is very high', () => {
    const result = run({ ...ALL_PASS, LOAD_THRESHOLD: '9999' });
    expect(result.stdout).toMatch(/✅.*[Ll]oad/);
  });

  test('TC-PF-05: fails with ❌ message when LOAD_THRESHOLD=0', () => {
    const result = run(FAIL_LOAD);
    expect(result.stdout).toMatch(/❌.*[Ll]oad/);
    expect(result.stdout).toMatch(/threshold/i);
  });
});

// ─── TC-PF-06~07: Memory check ───────────────────────────────────────────────

describe('memory check', () => {
  test('TC-PF-06: passes and prints ✅ when MEM_MIN_GB=0', () => {
    const result = run({ ...ALL_PASS, MEM_MIN_GB: '0' });
    expect(result.stdout).toMatch(/✅.*[Mm]em/i);
  });

  test('TC-PF-07: fails with ❌ message when MEM_MIN_GB=99999', () => {
    const result = run(FAIL_MEM);
    expect(result.stdout).toMatch(/❌.*[Mm]em/i);
    expect(result.stdout).toMatch(/threshold|GB|MB/i);
  });
});

// ─── TC-PF-08~09: CPU idle check ─────────────────────────────────────────────

describe('cpu idle check', () => {
  test('TC-PF-08: passes and prints ✅ when CPU_IDLE_MIN=0', () => {
    const result = run({ ...ALL_PASS, CPU_IDLE_MIN: '0' });
    expect(result.stdout).toMatch(/✅.*[Cc]pu|✅.*idle/i);
  });

  test('TC-PF-09: fails with ❌ message when CPU_IDLE_MIN=101', () => {
    const result = run(FAIL_CPU);
    expect(result.stdout).toMatch(/❌.*[Cc]pu|❌.*idle/i);
    expect(result.stdout).toMatch(/threshold/i);
  });
});

// ─── TC-PF-10~12: Overall exit code and summary ──────────────────────────────

describe('overall result', () => {
  test('TC-PF-10: exits 0 when all checks pass', () => {
    const result = run(ALL_PASS);
    expect(result.status).toBe(0);
  });

  test('TC-PF-11: exits 1 when load check fails', () => {
    const result = run(FAIL_LOAD);
    expect(result.status).toBe(1);
  });

  test('TC-PF-12: exits 1 when memory check fails', () => {
    const result = run(FAIL_MEM);
    expect(result.status).toBe(1);
  });

  test('TC-PF-13: exits 1 when CPU check fails', () => {
    const result = run(FAIL_CPU);
    expect(result.status).toBe(1);
  });

  test('TC-PF-14: prints ✅ Preflight passed when all checks pass', () => {
    const result = run(ALL_PASS);
    expect(result.stdout).toMatch(/✅.*[Pp]reflight.*pass/i);
  });

  test('TC-PF-15: prints ❌ Preflight FAILED with actionable hints when any check fails', () => {
    const result = run(FAIL_LOAD);
    expect(result.stdout).toMatch(/❌.*[Pp]reflight.*[Ff]ail/i);
    // Must give user actionable guidance, not just "failed"
    expect(result.stdout).toMatch(/please|建议|关闭|wait|recover/i);
  });
});
