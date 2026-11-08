const LEAK_THRESHOLD = 0.5;
const WARN_THRESHOLD = 0.25;

function checkMemoryLeak(baselineBytes, finalBytes) {
  if (baselineBytes <= 0) return { leaked: false, ratio: 0, level: 'ok' };
  const ratio = (finalBytes - baselineBytes) / baselineBytes;
  if (ratio > LEAK_THRESHOLD) return { leaked: true, ratio, level: 'critical' };
  if (ratio > WARN_THRESHOLD) return { leaked: false, ratio, level: 'warning' };
  return { leaked: false, ratio, level: 'ok' };
}

module.exports = { checkMemoryLeak, LEAK_THRESHOLD, WARN_THRESHOLD };
