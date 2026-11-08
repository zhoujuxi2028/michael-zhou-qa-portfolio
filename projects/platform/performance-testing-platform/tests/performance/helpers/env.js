// k6 environment loader — uses open() and __ENV (NOT Node.js)
// Path: k6 open() resolves relative to MAIN SCRIPT (tests/performance/) → ../../../env/<name>.env

const ENV_NAME = __ENV.ENV || 'local';

function parseEnvFile(content) {
  const result = {};
  if (!content) return result;
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  });
  return result;
}

const DEFAULTS = {
  BASE_URL: 'http://localhost:3000',
  AUTH_ENABLED: 'false',
  PORT: '3000',
};

let envConfig;
try {
  const content = open('../../../env/' + ENV_NAME + '.env');
  envConfig = Object.assign({}, DEFAULTS, parseEnvFile(content));
} catch (e) {
  console.warn(`[env] Could not load env/${ENV_NAME}.env, using defaults`);
  envConfig = Object.assign({}, DEFAULTS);
}

export const ENV = envConfig;
export const BASE_URL = __ENV.BASE_URL || envConfig.BASE_URL;
