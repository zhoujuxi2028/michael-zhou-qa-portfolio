module.exports = {
  env: { node: true, jest: true, es2022: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022 },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['src/server.js', 'src/cluster.js', 'src/cluster-manager.js', 'scripts/**/*.js'],
      rules: { 'no-console': 'off' },
    },
  ],
};
