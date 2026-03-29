const metrics = { requestCount: 0, totalDuration: 0 };

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    metrics.requestCount++;
    metrics.totalDuration += Date.now() - start;
  });
  next();
}

function getMetrics() {
  return {
    requestCount: metrics.requestCount,
    avgDuration: metrics.requestCount > 0 ? metrics.totalDuration / metrics.requestCount : 0,
  };
}

function resetMetrics() {
  metrics.requestCount = 0;
  metrics.totalDuration = 0;
}

module.exports = { metricsMiddleware, getMetrics, resetMetrics };
