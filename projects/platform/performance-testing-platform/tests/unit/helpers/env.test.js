const { parseEnvFile, getEnvConfig, DEFAULTS } = require('../../../src/utils/env-loader');

describe('parseEnvFile', () => {
  test('UT-ENV-01: parses valid env file with multiple variables', () => {
    const content = 'BASE_URL=http://localhost:3000\nAUTH_ENABLED=false\nPORT=3000';
    const result = parseEnvFile(content);
    expect(result.BASE_URL).toBe('http://localhost:3000');
    expect(result.AUTH_ENABLED).toBe('false');
    expect(result.PORT).toBe('3000');
  });

  test('UT-ENV-02: skips comment lines starting with #', () => {
    const content = '# This is a comment\nBASE_URL=http://localhost:3000\n# Another comment';
    const result = parseEnvFile(content);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result.BASE_URL).toBe('http://localhost:3000');
  });

  test('UT-ENV-03: skips blank and whitespace-only lines', () => {
    const content = 'KEY1=val1\n\n   \nKEY2=val2';
    const result = parseEnvFile(content);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result.KEY1).toBe('val1');
    expect(result.KEY2).toBe('val2');
  });

  test('UT-ENV-04: returns empty object for null/undefined input', () => {
    expect(parseEnvFile(null)).toEqual({});
    expect(parseEnvFile(undefined)).toEqual({});
    expect(parseEnvFile('')).toEqual({});
  });

  test('UT-ENV-05: handles values containing = (split on first = only)', () => {
    const content = 'DB_URL=postgres://host:5432/db?opt=1&flag=true';
    const result = parseEnvFile(content);
    expect(result.DB_URL).toBe('postgres://host:5432/db?opt=1&flag=true');
  });

  test('UT-ENV-06: trims whitespace around keys and values', () => {
    const content = '  KEY  =  value  ';
    const result = parseEnvFile(content);
    expect(result.KEY).toBe('value');
  });
});

describe('getEnvConfig', () => {
  test('UT-ENV-07: returns DEFAULTS when env file not found', () => {
    const readFn = () => {
      throw new Error('File not found');
    };
    const config = getEnvConfig('nonexistent', readFn);
    expect(config.BASE_URL).toBe(DEFAULTS.BASE_URL);
    expect(config.AUTH_ENABLED).toBe(DEFAULTS.AUTH_ENABLED);
    expect(config.PORT).toBe(DEFAULTS.PORT);
  });
});
