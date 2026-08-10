const js = require('@eslint/js');

const nodeGlobals = {
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
};

const jestGlobals = {
  describe: 'readonly',
  test: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
  performance: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: nodeGlobals,
      ecmaVersion: 2022,
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'prefer-const': 'error',
      'preserve-caught-error': 'off',
    },
  },
  {
    files: ['tests/unit/**/*.js', 'tests/integration/**/*.js'],
    languageOptions: {
      globals: { ...nodeGlobals, ...jestGlobals },
    },
  },
  {
    files: ['src/server.js', 'src/cluster.js', 'src/cluster-manager.js', 'scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
  {
    ignores: ['tests/performance/**', 'reports/**', 'node_modules/**'],
  },
];
