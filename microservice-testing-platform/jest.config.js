module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'services/**/src/**/*.js',
    '!**/server.js',
    '!**/services/inventory-client.js',
    '!**/services/redis-publisher.js',
    '!**/services/redis-subscriber.js',
    '!**/services/order-client.js',
  ],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports',
        filename: 'test-report.html',
        pageTitle: 'Microservice Testing Platform - Test Report',
      },
    ],
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
