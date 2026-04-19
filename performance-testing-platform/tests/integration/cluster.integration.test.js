/**
 * cluster.js 集成测试
 *
 * 验证 Cluster 模式在真实进程环境下的行为：
 * - CLU-INT-01: cluster 模式启动后多个 Worker 均可响应 HTTP 请求
 * - CLU-INT-02: Worker 崩溃后 Master 自动 fork 新 Worker，服务恢复
 * - CLU-INT-03: 所有 Worker 优雅关闭后端口释放
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.join(__dirname, '../..');
const PORT = 3199; // 使用非标准端口避免冲突
const LOG_FILE = `/tmp/cluster-integration-test-${PORT}.log`;

/**
 * 等待端口可连接（同步轮询 curl）
 */
function waitForPort(port, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      execSync(`curl -sf http://127.0.0.1:${port}/health`, {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: 'pipe',
      });
      return;
    } catch {
      execSync('sleep 0.5');
    }
  }
  const log = readLog();
  throw new Error(`Timeout waiting for port ${port}. Log: ${log.slice(0, 500)}`);
}

/**
 * 读取 cluster 日志
 */
function readLog() {
  try {
    return fs.readFileSync(LOG_FILE, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * 强制清理端口占用和临时文件
 */
function forceCleanup() {
  try {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
    execSync('sleep 0.5');
  } catch {
    // ignore
  }
  try { fs.unlinkSync(LOG_FILE); } catch { /* ignore */ }
}

/**
 * 通过 detached spawn 启动 cluster 模式服务器
 */
function startCluster() {
  try { fs.unlinkSync(LOG_FILE); } catch { /* ignore */ }

  const logFd = fs.openSync(LOG_FILE, 'w');
  const child = spawn('node', ['src/cluster.js'], {
    cwd: PROJECT_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
  return child;
}

// ─── 测试套件 ─────────────────────────────────────────────────────────────────

describe('Cluster 模式集成测试', () => {
  beforeEach(() => {
    forceCleanup();
  });

  afterEach(() => {
    forceCleanup();
  });

  test('CLU-INT-01: cluster 模式启动后可响应 HTTP 请求', () => {
    startCluster();
    waitForPort(PORT);

    // 验证 Master 输出包含 Worker 启动信息
    const log = readLog();
    expect(log).toMatch(/Master.*starting.*workers/i);

    // 发送多个请求验证服务可用
    for (let i = 0; i < 5; i++) {
      const result = execSync(`curl -sf http://127.0.0.1:${PORT}/health`, {
        encoding: 'utf-8',
      });
      const body = JSON.parse(result);
      expect(body).toHaveProperty('status', 'ok');
    }
  }, 15000);

  test('CLU-INT-02: Worker 崩溃后服务自动恢复', () => {
    startCluster();
    waitForPort(PORT);

    // 读取 Master PID
    const log1 = readLog();
    const masterMatch = log1.match(/Master\s+(\d+)/);
    expect(masterMatch).not.toBeNull();
    const masterPid = masterMatch[1];

    // 获取 Master 的子进程（即 Worker 进程）
    const workerPids = execSync(`pgrep -P ${masterPid} 2>/dev/null || true`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    expect(workerPids.length).toBeGreaterThanOrEqual(1);

    // kill 第一个 Worker
    const targetPid = workerPids[0];
    try {
      execSync(`kill -9 ${targetPid} 2>/dev/null`);
    } catch {
      // ignore
    }

    // 等待 Master 重启 Worker
    execSync('sleep 3');

    // 验证服务恢复
    waitForPort(PORT, 8000);
    const result = execSync(`curl -sf http://127.0.0.1:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(result)).toHaveProperty('status', 'ok');

    // 验证日志包含重启信息
    const log = readLog();
    expect(log).toMatch(/died.*restarting/i);
  }, 25000);

  test('CLU-INT-03: SIGTERM 后所有进程退出、端口释放', () => {
    startCluster();
    waitForPort(PORT);

    // 确认服务正常
    const result = execSync(`curl -sf http://127.0.0.1:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(result)).toHaveProperty('status', 'ok');

    // 获取所有相关 PID 并发送 SIGTERM
    execSync(`lsof -ti:${PORT} | xargs kill -15 2>/dev/null || true`, { encoding: 'utf-8' });

    // 等待进程退出
    execSync('sleep 2');

    // 验证端口已释放
    const portFree = (() => {
      try {
        execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8', stdio: 'pipe' });
        return false; // 有进程在用
      } catch {
        return true; // 无进程在用
      }
    })();
    expect(portFree).toBe(true);
  }, 15000);
});
