/**
 * ClusterManager 单元测试
 *
 * 验证 ClusterManager 的核心逻辑（依赖注入 mock，无真实进程）：
 * - CLU-01: Primary 进程 fork Worker
 * - CLU-02: Worker 进程加载 server
 * - CLU-03: Worker 崩溃自动重启
 * - CLU-04: 边界条件（单核 CPU）
 * - CLU-05: 优雅关闭（SIGTERM）
 * - CLU-06: CLUSTER_WORKERS 环境变量
 */

/* eslint-disable no-console */

const ClusterManager = require('../../src/cluster-manager');

/**
 * 创建 mock cluster 对象（模拟 Node.js cluster 模块）
 */
function createMockCluster(isPrimary = true) {
  const workers = {};
  let workerId = 0;
  const eventHandlers = {};

  return {
    get isPrimary() {
      return isPrimary;
    },
    fork: jest.fn(() => {
      workerId++;
      const worker = {
        id: workerId,
        process: { pid: 1000 + workerId, kill: jest.fn() },
      };
      workers[workerId] = worker;
      return worker;
    }),
    on: jest.fn((event, cb) => {
      eventHandlers[event] = cb;
    }),
    get workers() {
      return workers;
    },
    _getHandler(event) {
      return eventHandlers[event];
    },
  };
}

/**
 * 创建 mock process 对象（拦截 SIGTERM 注册）
 */
function createMockProcess(pid = 99999) {
  const handlers = {};
  return {
    pid,
    on: jest.fn((event, cb) => {
      handlers[event] = cb;
    }),
    _getHandler(event) {
      return handlers[event];
    },
  };
}

/** 静默 logger */
const silentLogger = { log: jest.fn() };

beforeEach(() => {
  jest.resetModules();
  silentLogger.log.mockClear();
});

// ─── CLU-01: Cluster 模式启动 ─────────────────────────────────────────────────

describe('CLU-01: Primary 进程 fork Worker', () => {
  test('CLU-01a: fork 的 Worker 数量等于指定值 (4)', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 4,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(4);
  });

  test('CLU-01b: fork 的 Worker 数量等于指定值 (2)', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 2,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(2);
  });

  test('CLU-01c: fork 的 Worker 数量等于指定值 (8)', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 8,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(8);
  });

  test('CLU-01d: Primary 进程输出启动日志 (含 Worker 数量)', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 4,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(silentLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(/Master.*starting.*4.*workers/i),
    );
  });

  test('CLU-01e: Primary 进程注册 exit 事件监听器', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 1,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
  });
});

// ─── CLU-02: Worker 进程加载 server ───────────────────────────────────────────

describe('CLU-02: Worker 进程处理请求', () => {
  let mockServerRequired;

  beforeEach(() => {
    mockServerRequired = false;
    // mock 路径从测试文件解析：../../src/server → src/server.js
    // ClusterManager 默认 require('./server') 也解析到 src/server.js，二者匹配
    jest.doMock('../../src/server', () => {
      mockServerRequired = true;
      return {};
    });
  });

  test('CLU-02a: Worker 进程 require("./server")', () => {
    const cluster = createMockCluster(false);
    const mgr = new ClusterManager({
      cluster,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(mockServerRequired).toBe(true);
  });

  test('CLU-02b: Worker 进程不调用 fork()', () => {
    const cluster = createMockCluster(false);
    const mgr = new ClusterManager({
      cluster,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).not.toHaveBeenCalled();
  });

  test('CLU-02c: Worker 进程不注册 exit 监听器', () => {
    const cluster = createMockCluster(false);
    const mgr = new ClusterManager({
      cluster,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.on).not.toHaveBeenCalled();
  });
});

// ─── CLU-03: Worker 崩溃自动重启 ─────────────────────────────────────────────

describe('CLU-03: Worker 崩溃自动重启', () => {
  test('CLU-03a: Worker exit 触发 cluster.fork() 重新创建', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 2,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(2);

    const exitHandler = cluster._getHandler('exit');
    exitHandler({ process: { pid: 12345 } });
    expect(cluster.fork).toHaveBeenCalledTimes(3);
  });

  test('CLU-03b: Worker exit 输出包含 PID 的重启日志', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 1,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();

    const exitHandler = cluster._getHandler('exit');
    exitHandler({ process: { pid: 99999 } });

    expect(silentLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(/Worker.*99999.*died.*restarting/i),
    );
  });

  test('CLU-03c: 多个 Worker 连续退出，每次都触发 fork', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 4,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(4);

    const exitHandler = cluster._getHandler('exit');
    exitHandler({ process: { pid: 1001 } });
    exitHandler({ process: { pid: 1002 } });
    exitHandler({ process: { pid: 1003 } });

    expect(cluster.fork).toHaveBeenCalledTimes(7);
  });
});

// ─── CLU-04: 边界条件 — 单核 CPU ─────────────────────────────────────────────

describe('CLU-04: 边界条件 — 单核 CPU', () => {
  test('CLU-04a: 单核 CPU 只 fork 1 个 Worker', () => {
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 1,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(1);
  });
});

// ─── CLU-05: 优雅关闭 — SIGTERM 处理 ──────────────────────────────────────────

describe('CLU-05: Master 收到 SIGTERM 后优雅关闭', () => {
  test('CLU-05a: Master 注册 SIGTERM 处理器', () => {
    const cluster = createMockCluster(true);
    const mockProc = createMockProcess();
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 1,
      logger: silentLogger,
      process: mockProc,
    });
    mgr.start();
    expect(mockProc.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  test('CLU-05b: SIGTERM 后 Worker 退出不再触发 fork', () => {
    const cluster = createMockCluster(true);
    const mockProc = createMockProcess();
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 2,
      logger: silentLogger,
      process: mockProc,
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(2);

    // 触发 SIGTERM
    const sigTermHandler = mockProc._getHandler('SIGTERM');
    sigTermHandler();

    // Worker 退出后不应再 fork
    const exitHandler = cluster._getHandler('exit');
    exitHandler({ process: { pid: 12345 } });
    expect(cluster.fork).toHaveBeenCalledTimes(2);
  });

  test('CLU-05c: SIGTERM 向所有 Worker 发送 SIGTERM 信号', () => {
    const cluster = createMockCluster(true);
    const mockProc = createMockProcess();
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 2,
      logger: silentLogger,
      process: mockProc,
    });
    mgr.start();

    const workerIds = Object.keys(cluster.workers);
    expect(workerIds.length).toBe(2);

    const sigTermHandler = mockProc._getHandler('SIGTERM');
    sigTermHandler();

    for (const id of workerIds) {
      expect(cluster.workers[id].process.kill).toHaveBeenCalledWith('SIGTERM');
    }
  });

  test('CLU-05d: SIGTERM 输出关闭日志', () => {
    const cluster = createMockCluster(true);
    const mockProc = createMockProcess(77777);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 1,
      logger: silentLogger,
      process: mockProc,
    });
    mgr.start();

    const sigTermHandler = mockProc._getHandler('SIGTERM');
    sigTermHandler();

    expect(silentLogger.log).toHaveBeenCalledWith(
      expect.stringMatching(/Master.*received SIGTERM.*shutting down/i),
    );
  });

  test('CLU-05e: Worker 进程不注册 SIGTERM 处理器', () => {
    const cluster = createMockCluster(false);
    const mockProc = createMockProcess();

    jest.doMock('../../src/server', () => ({}));

    const mgr = new ClusterManager({
      cluster,
      logger: silentLogger,
      process: mockProc,
    });
    mgr.start();

    expect(mockProc.on).not.toHaveBeenCalled();
  });
});

// ─── CLU-06: CLUSTER_WORKERS 环境变量 ─────────────────────────────────────────

describe('CLU-06: CLUSTER_WORKERS 环境变量覆盖', () => {
  const origEnv = process.env.CLUSTER_WORKERS;

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.CLUSTER_WORKERS;
    } else {
      process.env.CLUSTER_WORKERS = origEnv;
    }
  });

  test('CLU-06a: CLUSTER_WORKERS=3 时 fork 3 个 Worker', () => {
    process.env.CLUSTER_WORKERS = '3';
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(3);
  });

  test('CLU-06b: numWorkers 参数优先于环境变量', () => {
    process.env.CLUSTER_WORKERS = '10';
    const cluster = createMockCluster(true);
    const mgr = new ClusterManager({
      cluster,
      numWorkers: 2,
      logger: silentLogger,
      process: createMockProcess(),
    });
    mgr.start();
    expect(cluster.fork).toHaveBeenCalledTimes(2);
  });
});

// ─── CLU-07: cluster.js 入口点集成（通过 require 加载） ───────────────────────

describe('CLU-07: cluster.js 入口点（require 加载验证）', () => {
  test('CLU-07a: require cluster.js 在 Primary 模式下触发 fork', () => {
    jest.doMock('cluster', () => {
      const workers = {};
      let wid = 0;
      return {
        get isPrimary() {
          return true;
        },
        fork: jest.fn(() => {
          wid++;
          workers[wid] = { id: wid, process: { pid: 2000 + wid, kill: jest.fn() } };
        }),
        on: jest.fn(),
        get workers() {
          return workers;
        },
      };
    });
    jest.doMock('os', () => ({
      cpus: jest.fn(() => Array.from({ length: 2 }, () => ({}))),
    }));
    jest.spyOn(console, 'log').mockImplementation(() => {});

    require('../../src/cluster');
    const clusterMod = require('cluster');
    expect(clusterMod.fork).toHaveBeenCalledTimes(2);

    console.log.mockRestore();
  });
});
