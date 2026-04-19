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
const RESTART_PATTERN = /died.*restarting/i;
const RUNNING_PATTERN = /running on port/g;
const PORT_RELEASE_TIMEOUT_MS = 15000;

/** 最近一次 startCluster() 返回的子进程引用，用于按进程组清理 */
let clusterChild = null;

/**
 * 等待端口可连接（同步轮询 curl）
 * 使用 --connect-timeout 控制单次连接超时，避免在高负载时 curl 进程被 execSync timeout 杀死
 */
function waitForPort(port, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      execSync(`curl -sf --connect-timeout 2 --max-time 5 http://127.0.0.1:${port}/health`, {
        encoding: 'utf-8',
        timeout: 8000,
        stdio: 'pipe',
      });
      return;
    } catch {
      execSync('sleep 0.3');
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
 * 强制清理端口占用和临时文件，等待端口真正释放
 */
function forceCleanup() {
  // 优先按进程组杀死（detached: true 创建了独立进程组）
  if (clusterChild && clusterChild.pid) {
    try {
      process.kill(-clusterChild.pid, 'SIGKILL');
    } catch {
      // 进程可能已退出
    }
    clusterChild = null;
  }
  try {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
  } catch {
    // ignore
  }
  // 等待端口真正释放
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8', stdio: 'pipe' });
      try {
        execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
      } catch { /* ignore */ }
      execSync('sleep 0.3');
    } catch {
      break;
    }
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
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', CLUSTER_WORKERS: '2' },
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
  clusterChild = child;
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
  }, 40000);

  test('CLU-INT-02: Worker 崩溃后服务自动恢复', () => {
    startCluster();
    waitForPort(PORT);

    // 记录初始 "running on port" 出现次数
    const log1 = readLog();
    const initialRunning = (log1.match(RUNNING_PATTERN) || []).length;
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
    const targetPid = Number(workerPids[0]);
    try {
      process.kill(targetPid, 9);
    } catch {
      // ignore
    }

    // 等待日志确认 Worker 已重启（比轮询 curl 更可靠）
    const restartDeadline = Date.now() + 30000;
    let logConfirmed = false;
    while (Date.now() < restartDeadline) {
      const currentLog = readLog();
      const hasRestart = RESTART_PATTERN.test(currentLog);
      const currentRunning = (currentLog.match(RUNNING_PATTERN) || []).length;
      if (hasRestart && currentRunning > initialRunning) {
        logConfirmed = true;
        break;
      }
      execSync('sleep 0.5');
    }
    expect(logConfirmed).toBe(true);

    // Worker 日志确认恢复后验证 HTTP 可达
    waitForPort(PORT);
    const result = execSync(`curl -sf http://127.0.0.1:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(result)).toHaveProperty('status', 'ok');

    // 验证日志包含重启信息
    const log = readLog();
    expect(log).toMatch(RESTART_PATTERN);
  }, 70000);

  test('CLU-INT-03: SIGTERM 后所有进程退出、端口释放', () => {
    const child = startCluster();
    waitForPort(PORT);

    // 确认服务正常
    const result = execSync(`curl -sf http://127.0.0.1:${PORT}/health`, {
      encoding: 'utf-8',
    });
    expect(JSON.parse(result)).toHaveProperty('status', 'ok');

    // 向整个进程组发送 SIGTERM（确保 master 收到并触发优雅关闭）
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // 进程可能已退出
    }

    // 轮询等待端口释放（比固定 sleep 更可靠）
    const portDeadline = Date.now() + PORT_RELEASE_TIMEOUT_MS;
    let portFree = false;
    while (Date.now() < portDeadline) {
      try {
        execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8', stdio: 'pipe' });
        execSync('sleep 0.5');
      } catch {
        portFree = true;
        break;
      }
    }
    expect(portFree).toBe(true);
  }, 40000);
});