/**
 * cluster.js 单元测试
 *
 * 验证 Node.js Cluster 模式的核心逻辑：
 * - Primary 进程 fork 与 CPU 核心数一致的 Worker
 * - Worker 进程加载 server 模块
 * - Worker 崩溃后自动重启
 */

/* eslint-disable no-console */

let mockIsPrimary;
let mockCpusLength;
let mockFork;
let mockOn;
let mockServerRequired;

// Mock cluster 模块
jest.mock('cluster', () => {
  const original = jest.requireActual('cluster');
  return {
    ...original,
    get isPrimary() {
      return mockIsPrimary;
    },
    fork: jest.fn(() => {
      mockFork();
      return { process: { pid: Math.floor(Math.random() * 10000) + 1000 } };
    }),
    on: jest.fn((event, cb) => {
      mockOn(event, cb);
    }),
  };
});

// Mock os.cpus()
jest.mock('os', () => ({
  cpus: jest.fn(() => Array.from({ length: mockCpusLength }, () => ({}))),
}));

beforeEach(() => {
  mockIsPrimary = true;
  mockCpusLength = 4;
  mockFork = jest.fn();
  mockOn = jest.fn();
  mockServerRequired = false;

  // 清除 cluster.js 缓存，保证每次重新加载
  jest.resetModules();

  // 重新设置 mock（resetModules 会清除 mock）
  jest.doMock('cluster', () => ({
    get isPrimary() {
      return mockIsPrimary;
    },
    fork: jest.fn((...args) => {
      mockFork(...args);
      return { process: { pid: Math.floor(Math.random() * 10000) + 1000 } };
    }),
    on: jest.fn((event, cb) => {
      mockOn(event, cb);
    }),
  }));

  jest.doMock('os', () => ({
    cpus: jest.fn(() => Array.from({ length: mockCpusLength }, () => ({}))),
  }));

  // Mock ./server，避免真正启动 Express
  jest.doMock('../../src/server', () => {
    mockServerRequired = true;
    return {};
  });

  // Mock console.log 避免测试输出噪音
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

// ─── CLU-01: Cluster 模式启动 ─────────────────────────────────────────────────

describe('CLU-01: Primary 进程 fork Worker', () => {
  test('CLU-01a: fork 的 Worker 数量等于 CPU 核心数 (4 核)', () => {
    mockIsPrimary = true;
    mockCpusLength = 4;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.fork).toHaveBeenCalledTimes(4);
  });

  test('CLU-01b: fork 的 Worker 数量等于 CPU 核心数 (2 核)', () => {
    mockIsPrimary = true;
    mockCpusLength = 2;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.fork).toHaveBeenCalledTimes(2);
  });

  test('CLU-01c: fork 的 Worker 数量等于 CPU 核心数 (8 核)', () => {
    mockIsPrimary = true;
    mockCpusLength = 8;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.fork).toHaveBeenCalledTimes(8);
  });

  test('CLU-01d: Primary 进程输出启动日志 (含 Worker 数量)', () => {
    mockIsPrimary = true;
    mockCpusLength = 4;

    require('../../src/cluster');

    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/Master.*starting.*4.*workers/i)
    );
  });

  test('CLU-01e: Primary 进程注册 exit 事件监听器', () => {
    mockIsPrimary = true;
    mockCpusLength = 4;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.on).toHaveBeenCalledWith('exit', expect.any(Function));
  });
});

// ─── CLU-02: Worker 进程加载 server ───────────────────────────────────────────

describe('CLU-02: Worker 进程处理请求', () => {
  test('CLU-02a: Worker 进程 require("./server")', () => {
    mockIsPrimary = false;

    require('../../src/cluster');

    expect(mockServerRequired).toBe(true);
  });

  test('CLU-02b: Worker 进程不调用 fork()', () => {
    mockIsPrimary = false;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.fork).not.toHaveBeenCalled();
  });

  test('CLU-02c: Worker 进程不注册 exit 监听器', () => {
    mockIsPrimary = false;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.on).not.toHaveBeenCalled();
  });
});

// ─── CLU-03: Worker 崩溃自动重启 ─────────────────────────────────────────────

describe('CLU-03: Worker 崩溃自动重启', () => {
  test('CLU-03a: Worker exit 触发 cluster.fork() 重新创建', () => {
    mockIsPrimary = true;
    mockCpusLength = 2;
    let exitCallback;
    mockOn = jest.fn((event, cb) => {
      if (event === 'exit') exitCallback = cb;
    });

    require('../../src/cluster');
    const clusterMod = require('cluster');

    // 初始 fork 了 2 个 Worker
    expect(clusterMod.fork).toHaveBeenCalledTimes(2);

    // 模拟一个 Worker 退出
    const deadWorker = { process: { pid: 12345 } };
    exitCallback(deadWorker);

    // 应该再 fork 一个 Worker（总共 3 次调用）
    expect(clusterMod.fork).toHaveBeenCalledTimes(3);
  });

  test('CLU-03b: Worker exit 输出包含 PID 的重启日志', () => {
    mockIsPrimary = true;
    mockCpusLength = 1;
    let exitCallback;
    mockOn = jest.fn((event, cb) => {
      if (event === 'exit') exitCallback = cb;
    });

    require('../../src/cluster');

    const deadWorker = { process: { pid: 99999 } };
    exitCallback(deadWorker);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/Worker.*99999.*died.*restarting/i)
    );
  });

  test('CLU-03c: 多个 Worker 连续退出，每次都触发 fork', () => {
    mockIsPrimary = true;
    mockCpusLength = 4;
    let exitCallback;
    mockOn = jest.fn((event, cb) => {
      if (event === 'exit') exitCallback = cb;
    });

    require('../../src/cluster');
    const clusterMod = require('cluster');

    // 初始 fork 4 次
    expect(clusterMod.fork).toHaveBeenCalledTimes(4);

    // 模拟 3 个 Worker 连续退出
    exitCallback({ process: { pid: 1001 } });
    exitCallback({ process: { pid: 1002 } });
    exitCallback({ process: { pid: 1003 } });

    // 总共应 fork 7 次 (4 初始 + 3 重启)
    expect(clusterMod.fork).toHaveBeenCalledTimes(7);
  });
});

// ─── CLU-04: 单核环境 ────────────────────────────────────────────────────────

describe('CLU-04: 边界条件 — 单核 CPU', () => {
  test('CLU-04a: 单核 CPU 只 fork 1 个 Worker', () => {
    mockIsPrimary = true;
    mockCpusLength = 1;

    require('../../src/cluster');
    const clusterMod = require('cluster');

    expect(clusterMod.fork).toHaveBeenCalledTimes(1);
  });
});
