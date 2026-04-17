const os = require('os');

// 告警阈值定义 (与 Grafana 配置同步)
const ALERT_THRESHOLDS = {
  // SLA 值
  SLA: {
    p95_ms: 500,
    error_rate: 0.01,  // 1%
  },
  // Warning 级别（提前告警）
  WARNING: {
    p95_ms: 400,
    error_rate: 0.005,  // 0.5%
    memory_growth_mb_per_hour: 200,
  },
  // Critical 级别（立即告警）
  CRITICAL: {
    p95_ms: 1000,
    error_rate: 0.05,  // 5%
    memory_growth_mb_per_hour: 500,
  },
};

const metrics = { requestCount: 0, totalDuration: 0 };
let lastCpuUsage = process.cpuUsage();
let lastCpuSampleTime = Date.now();

// SM-03: Event loop lag sampling (1s interval)
let eventLoopLag = 0;
let lagTimer = null;

function startLagSampling() {
  if (lagTimer) return;
  lagTimer = setInterval(() => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      eventLoopLag = Number(process.hrtime.bigint() - start) / 1e6; // ms
    });
  }, 1000);
  lagTimer.unref();
}

startLagSampling();

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    metrics.requestCount++;
    metrics.totalDuration += Date.now() - start;
  });
  next();
}

function getMetrics() {
  const now = Date.now();
  const elapsedMs = now - lastCpuSampleTime;
  const currentCpuUsage = process.cpuUsage();
  const cpuDelta = {
    user: currentCpuUsage.user - lastCpuUsage.user,
    system: currentCpuUsage.system - lastCpuUsage.system,
  };

  lastCpuUsage = currentCpuUsage;
  lastCpuSampleTime = now;

  const userPercent = elapsedMs > 0 ? (cpuDelta.user / (elapsedMs * 1000)) * 100 : 0;
  const systemPercent = elapsedMs > 0 ? (cpuDelta.system / (elapsedMs * 1000)) * 100 : 0;
  const memUsage = process.memoryUsage();
  return {
    requestCount: metrics.requestCount,
    avgDuration: metrics.requestCount > 0 ? metrics.totalDuration / metrics.requestCount : 0,
    // SM-01: Process-level CPU
    cpu: {
      userPercent,
      systemPercent,
      loadavg: os.loadavg(),
    },
    // SM-02: Process-level memory
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
    },
    // SM-03: Event loop lag
    eventLoop: {
      lag: eventLoopLag,
    },
  };
}

function resetMetrics() {
  metrics.requestCount = 0;
  metrics.totalDuration = 0;
  lastCpuUsage = process.cpuUsage();
  lastCpuSampleTime = Date.now();
}

module.exports = { metricsMiddleware, getMetrics, resetMetrics, ALERT_THRESHOLDS };
