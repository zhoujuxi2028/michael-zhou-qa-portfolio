const os = require('os');

const metrics = { requestCount: 0, totalDuration: 0 };

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
  const cpuUsage = process.cpuUsage();
  const memUsage = process.memoryUsage();
  return {
    requestCount: metrics.requestCount,
    avgDuration: metrics.requestCount > 0 ? metrics.totalDuration / metrics.requestCount : 0,
    // SM-01: Process-level CPU
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
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
}

module.exports = { metricsMiddleware, getMetrics, resetMetrics };
