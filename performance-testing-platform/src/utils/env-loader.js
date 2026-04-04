function parseEnvFile(content) {
  if (!content) return {};
  const result = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  });
  return result;
}

const DEFAULTS = {
  BASE_URL: 'http://localhost:3000',
  AUTH_ENABLED: 'false',
  PORT: '3000',
};

function getEnvConfig(envName, readFileFn) {
  try {
    const content = readFileFn(`env/${envName}.env`);
    return { ...DEFAULTS, ...parseEnvFile(content) };
  } catch {
    return { ...DEFAULTS };
  }
}

module.exports = { parseEnvFile, getEnvConfig, DEFAULTS };
