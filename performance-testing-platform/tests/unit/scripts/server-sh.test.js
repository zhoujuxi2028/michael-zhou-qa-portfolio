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

  // --- stop-collect ---
  test('stop-collect: no PID file → prints message, exits 0', () => {
    // 确保 PID 文件不存在
    try { fs.unlinkSync('/tmp/metrics-collector.pid'); } catch { /* ignore */ }
    const output = run('stop-collect');
    expect(output).toMatch(/[Nn]o collector PID file/);
  });

  test('stop-collect: stale PID file → cleans up, exits 0', () => {
    // 写入一个不存在的 PID
    fs.writeFileSync('/tmp/metrics-collector.pid', '999999');
    const output = run('stop-collect');
    expect(output).toMatch(/[Nn]o running collector/);
    expect(fs.existsSync('/tmp/metrics-collector.pid')).toBe(false);
  });

  test('collect + stop-collect: starts collector, saves PID, stop-collect kills it', () => {
    const csvPath = path.join(__dirname, '../../../reports/test-metrics.csv');
    try { fs.unlinkSync(csvPath); } catch { /* ignore */ }
    try { fs.unlinkSync('/tmp/metrics-collector.pid'); } catch { /* ignore */ }

    // 在后台启动 collector
    const child = require('child_process').spawn(
      'bash',
      [SCRIPT, 'collect', '100', 'reports/test-metrics.csv'],
      {
        env: { ...process.env, PORT: String(PORT), NODE_ENV: 'development' },
        detached: true,
        stdio: 'ignore',
      }
    );
    child.unref();

    // 等待 PID 文件创建
    const deadline = Date.now() + 5000;
    while (!fs.existsSync('/tmp/metrics-collector.pid') && Date.now() < deadline) {
      execSync('sleep 0.2');
    }
    expect(fs.existsSync('/tmp/metrics-collector.pid')).toBe(true);

    const pid = fs.readFileSync('/tmp/metrics-collector.pid', 'utf-8').trim();
    expect(pid).toMatch(/^\d+$/);

    // 等待 CSV 数据写入
    execSync('sleep 1');
    expect(fs.existsSync(csvPath)).toBe(true);

    // 调用 stop-collect 停止采集器
    const output = run('stop-collect');
    expect(output).toMatch(/[Ss]topping collector|[Ss]topped/);
    expect(fs.existsSync('/tmp/metrics-collector.pid')).toBe(false);

    // 验证进程已被终止
    try {
      execSync(`kill -0 ${pid} 2>/dev/null`);
      // 如果没抛出异常，说明进程还在 — 清理并失败
      execSync(`kill -9 ${pid} 2>/dev/null || true`);
      throw new Error('Collector process should have been killed');
    } catch (e) {
      if (e.message === 'Collector process should have been killed') throw e;
      // kill -0 失败 = 进程已终止，符合预期
    }

    // 清理测试文件
    try { fs.unlinkSync(csvPath); } catch { /* ignore */ }
  });
});
