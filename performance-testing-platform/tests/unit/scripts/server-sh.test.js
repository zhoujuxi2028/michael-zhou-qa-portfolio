const { execSync } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

const SCRIPT = path.join(__dirname, '../../../scripts/server.sh');
const PORT = 3111; // Use non-standard port to avoid conflicts

function run(action, mode, extraArgs) {
  const args = [action, mode || 'single', extraArgs].filter(Boolean);
  return execSync(`bash ${SCRIPT} ${args.join(' ')}`, {
    encoding: 'utf-8',
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'development' },
    timeout: 15000,
  }).trim();
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(true));
    s.once('listening', () => {
      s.close(() => resolve(false));
    });
    s.listen(port);
  });
}

function waitForPort(port, timeout = 5000) {
  const deadline = Date.now() + timeout;
  return new Promise((resolve, reject) => {
    const check = () => {
      isPortInUse(port).then((inUse) => {
        if (inUse) return resolve();
        if (Date.now() > deadline) return reject(new Error('Timeout waiting for port'));
        setTimeout(check, 200);
      });
    };
    check();
  });
}

function forceCleanup() {
  try {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
    execSync('sleep 0.5');
  } catch {
    // ignore
  }
}

beforeEach(() => {
  forceCleanup();
});

afterAll(() => {
  forceCleanup();
});

describe('server.sh', () => {
  // --- Usage ---
  test('shows usage on invalid action', () => {
    expect(() => run('invalid')).toThrow();
  });

  // --- Stop ---
  test('stop: no server → prints message, exits 0', () => {
    const output = run('stop');
    expect(output).toMatch(/[Nn]o server running/);
  });

  // --- Start ---
  test('start: launches server, health check passes', async () => {
    run('start', 'single');
    await waitForPort(PORT);
    const health = execSync(`curl -sf http://localhost:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(health)).toHaveProperty('status', 'ok');
  });

  test('start: duplicate start skips, exits 0', async () => {
    run('start', 'single');
    await waitForPort(PORT);
    const output = run('start', 'single');
    expect(output).toMatch(/[Aa]lready running|[Ss]kipping/);
  });

  // --- Stop running server ---
  test('stop: kills running server, port freed', async () => {
    run('start', 'single');
    await waitForPort(PORT);
    const output = run('stop');
    expect(output).toMatch(/[Ss]topped/);
    const inUse = await isPortInUse(PORT);
    expect(inUse).toBe(false);
  });

  // --- Restart ---
  test('restart: stops then starts, server is running', async () => {
    run('start', 'single');
    await waitForPort(PORT);
    const output = run('restart', 'single');
    expect(output).toMatch(/[Ss]topped|[Ss]tarting/);
    await waitForPort(PORT);
    const health = execSync(`curl -sf http://localhost:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(health)).toHaveProperty('status', 'ok');
  });

  test('restart: no server running → just starts', async () => {
    const output = run('restart', 'single');
    expect(output).toMatch(/[Ss]tarting/);
    await waitForPort(PORT);
    const inUse = await isPortInUse(PORT);
    expect(inUse).toBe(true);
  });

  // --- Restart --clean ---
  test('restart --clean: deletes DB files before starting', async () => {
    run('start', 'single');
    await waitForPort(PORT);

    // Create an order to populate DB
    execSync(
      `curl -sf -X POST http://localhost:${PORT}/api/orders -H 'Content-Type: application/json' -d '{"product_id":1,"quantity":1}'`,
      { encoding: 'utf-8' }
    );

    // Verify DB file exists and has data
    const dbDir = path.join(__dirname, '../../../data');
    const dbFile = path.join(dbDir, 'perf.db');
    expect(fs.existsSync(dbFile)).toBe(true);
    const sizeBefore = fs.statSync(dbFile).size;

    // Restart with --clean
    const output = run('restart', 'single', '--clean');
    expect(output).toMatch(/[Cc]leaning database/i);
    expect(output).toMatch(/[Ss]tarting/);
    await waitForPort(PORT);

    // Trigger DB creation by hitting products endpoint
    execSync(`curl -sf http://localhost:${PORT}/api/products`, {
      encoding: 'utf-8',
    });

    // DB should be recreated (fresh, smaller or equal)
    expect(fs.existsSync(dbFile)).toBe(true);
    const sizeAfter = fs.statSync(dbFile).size;
    expect(sizeAfter).toBeLessThanOrEqual(sizeBefore);
  });

  test('restart --clean: no DB files → starts normally without error', async () => {
    // Ensure no DB files
    const dbDir = path.join(__dirname, '../../../data');
    try {
      fs.rmSync(path.join(dbDir, 'perf.db'), { force: true });
      fs.rmSync(path.join(dbDir, 'perf.db-shm'), { force: true });
      fs.rmSync(path.join(dbDir, 'perf.db-wal'), { force: true });
    } catch {
      // ignore
    }

    const output = run('restart', 'single', '--clean');
    expect(output).toMatch(/[Cc]leaning database/i);
    expect(output).toMatch(/[Ss]tarting/);
    await waitForPort(PORT);

    const health = execSync(`curl -sf http://localhost:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(health)).toHaveProperty('status', 'ok');
  });
});
