module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js', '**/tests/integration/**/*.test.js'],
  // DEF-019: scripts/analysis/**/*.js 暂从覆盖收集中回退（DEF-017 完整修复待补齐单测后重新纳入）
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'json-summary', 'lcov', 'text'],
  // Cap workers at 50% of CPUs: several "unit" suites spawn bash/node/python3
  // subprocesses (server-sh, preflight-check, integration-test-phase7-soak, lock).
  // Default (ncpu-1) saturates CPU → subprocess timeouts and jest-worker IPC crashes.
  maxWorkers: '50%',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
