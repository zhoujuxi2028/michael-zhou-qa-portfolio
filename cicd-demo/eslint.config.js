const js = require('@eslint/js');
const globals = require('globals');
const pluginCypress = require('eslint-plugin-cypress');

module.exports = [
  js.configs.recommended,
  pluginCypress.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'cypress/no-unnecessary-waiting': 'warn',
    },
  },
  {
    ignores: ['node_modules/**'],
  },
];
