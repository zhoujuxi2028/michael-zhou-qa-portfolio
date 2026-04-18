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

// 业务指标收集 (PERF-BUSINESS-METRICS-001)
const businessMetrics = {
  orderSuccess: 0,      // 订单成功数
  orderConflict: 0,     // 库存冲突数（409）
  authLatencyMs: [],    // 认证延迟数组（采样）
};

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
  
  // 计算业务指标
  const orderConflictRate = businessMetrics.orderSuccess + businessMetrics.orderConflict > 0 
    ? businessMetrics.orderConflict / (businessMetrics.orderSuccess + businessMetrics.orderConflict)
    : 0;
  const avgAuthLatency = businessMetrics.authLatencyMs.length > 0
    ? businessMetrics.authLatencyMs.reduce((a, b) => a + b, 0) / businessMetrics.authLatencyMs.length
    : 0;
  
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
    // BM-01: 业务指标（订单、认证）
    business: {
      orderSuccess: businessMetrics.orderSuccess,
      orderConflict: businessMetrics.orderConflict,
      orderConflictRate: (orderConflictRate * 100).toFixed(2) + '%',
      authLatencyMs: Math.round(avgAuthLatency),
    },
  };
}

function resetMetrics() {
  metrics.requestCount = 0;
  metrics.totalDuration = 0;
  lastCpuUsage = process.cpuUsage();
  lastCpuSampleTime = Date.now();
  // 重置业务指标
  businessMetrics.orderSuccess = 0;
  businessMetrics.orderConflict = 0;
  businessMetrics.authLatencyMs = [];
}

// 导出业务指标记录函数
function recordOrderSuccess() {
  businessMetrics.orderSuccess++;
}

function recordOrderConflict() {
  businessMetrics.orderConflict++;
}

function recordAuthLatency(latencyMs) {
  // 采样最近 100 个延迟数据
  businessMetrics.authLatencyMs.push(latencyMs);
  if (businessMetrics.authLatencyMs.length > 100) {
    businessMetrics.authLatencyMs.shift();
  }
}

module.exports = { 
  metricsMiddleware, 
  getMetrics, 
  resetMetrics, 
  ALERT_THRESHOLDS,
  recordOrderSuccess,
  recordOrderConflict,
  recordAuthLatency,
};
