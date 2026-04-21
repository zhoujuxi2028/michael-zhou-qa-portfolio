/**
 * cluster.js 集成测试
 *
 * 验证 Cluster 模式在真实进程环境下的行为：
 * - CLU-INT-01: cluster 模式启动后多个 Worker 均可响应 HTTP 请求
 * - CLU-INT-02: Worker 崩溃后 Master 自动 fork 新 Worker，服务恢复
 * - CLU-INT-03: 所有 Worker 优雅关闭后端口释放
 *
 * 稳定性设计（RCA-2026-04-19 修复）：
 * - 以 HTTP 健康检查为主要验证手段，日志模式匹配为辅助
 * - 每次断言失败时输出诊断日志，便于 CI 调试
 * - 使用渐进式等待替代固定 sleep
 * - 进程组清理 + 端口释放双重保障
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.join(__dirname, '../..');
const PORT = 3199;
const LOG_FILE = `/tmp/cluster-integration-test-${PORT}.log`;
const RESTART_PATTERN = /died.*restarting/i;
const PORT_RELEASE_TIMEOUT_MS = 15000;

/** 最近一次 startCluster() 返回的子进程引用 */
let clusterChild = null;

/** 端口等待超时（CI 并行运行时需要更长时间） */
const WAIT_PORT_TIMEOUT_MS = 60000;

/**
 * 等待端口可连接并验证服务稳定（同步轮询 curl）
 * 要求连续 STABILITY_COUNT 次成功才认为服务就绪
 */
const STABILITY_COUNT = 3;

function waitForPort(port, timeout = WAIT_PORT_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  let consecutiveOk = 0;
  while (Date.now() < deadline) {
    try {
      execSync(`curl -sf --connect-timeout 2 --max-time 5 http://127.0.0.1:${port}/health`, {
        encoding: 'utf-8',
        timeout: 8000,
        stdio: 'pipe',
      });
      consecutiveOk++;
      if (consecutiveOk >= STABILITY_COUNT) return;
      execSync('sleep 0.2');
    } catch {
      consecutiveOk = 0;
      execSync('sleep 0.3');
    }
  }
  const log = readLog();
  throw new Error(`Timeout waiting for port ${port}.\nLog tail:\n${log.slice(-1000)}`);
}

/**
 * 带超时和重试的健康检查
 */
function curlHealth(port, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return execSync(`curl -sf --connect-timeout 2 --max-time 5 http://127.0.0.1:${port}/health`, {
        encoding: 'utf-8',
        timeout: 8000,
        stdio: 'pipe',
      });
    } catch {
      if (i === retries - 1)
        throw new Error(`Health check failed after ${retries} attempts on port ${port}`);
      execSync('sleep 0.3');
    }
  }
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
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8', stdio: 'pipe' });
      try {
        execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
      } catch {
        /* ignore */
      }
      execSync('sleep 0.3');
    } catch {
      break;
    }
  }
  try {
    fs.unlinkSync(LOG_FILE);
  } catch {
    /* ignore */
  }
}

/**
 * 通过 detached spawn 启动 cluster 模式服务器
 */
function startCluster() {
  try {
    fs.unlinkSync(LOG_FILE);
  } catch {
    /* ignore */
  }

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

    const log = readLog();
    expect(log).toMatch(/Master.*starting.*workers/i);

    for (let i = 0; i < 5; i++) {
      const body = JSON.parse(curlHealth(PORT));
      expect(body).toHaveProperty('status', 'ok');
    }
  }, 90000);

  test('CLU-INT-02: Worker 崩溃后服务自动恢复', () => {
    startCluster();
    waitForPort(PORT);

    // 获取 Master PID
    const log1 = readLog();
    const masterMatch = log1.match(/Master\s+(\d+)/);
    expect(masterMatch).not.toBeNull();
    const masterPid = masterMatch[1];

    // 获取 Worker PID
    const workerPids = execSync(`pgrep -P ${masterPid} 2>/dev/null || true`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    expect(workerPids.length).toBeGreaterThanOrEqual(1);

    // kill 第一个 Worker（SIGKILL 确保立即终止）
    const targetPid = Number(workerPids[0]);
    try {
      process.kill(targetPid, 9);
    } catch {
      // ignore
    }

    // === 主要验证：HTTP 服务恢复 ===
    // Worker 崩溃后，Master 会 fork 新 Worker，等待服务重新可用
    // 这比轮询日志更可靠，因为 HTTP 可达 = 服务真正恢复
    waitForPort(PORT);
    const body = JSON.parse(curlHealth(PORT));
    expect(body).toHaveProperty('status', 'ok');

    // === 辅助验证：日志包含重启信息 ===
    // 给日志一点额外时间刷盘（非阻塞重试）
    let logHasRestart = false;
    for (let i = 0; i < 10; i++) {
      const currentLog = readLog();
      if (RESTART_PATTERN.test(currentLog)) {
        logHasRestart = true;
        break;
      }
      execSync('sleep 0.3');
    }

    // 如果日志未匹配，输出诊断信息但不作为主要断言
    if (!logHasRestart) {
      const diagLog = readLog();
      // eslint-disable-next-line no-console
      console.warn(
        `[CLU-INT-02 诊断] 日志未匹配 RESTART_PATTERN，可能是 I/O 延迟。日志内容:\n${diagLog.slice(-500)}`
      );
    }
    // 日志验证为辅助断言 — 服务已恢复即代表 Worker 已重启
    expect(logHasRestart).toBe(true);
  }, 120000);

  test('CLU-INT-03: SIGTERM 后所有进程退出、端口释放', () => {
    const child = startCluster();
    waitForPort(PORT);

    expect(JSON.parse(curlHealth(PORT))).toHaveProperty('status', 'ok');

    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // 进程可能已退出
    }

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
  }, 90000);
});
