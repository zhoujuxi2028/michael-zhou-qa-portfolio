const fs = require('fs');
const path = require('path');

const DOCKERFILE = path.join(__dirname, '../../../Dockerfile');
const PHASE7_SCRIPT = path.join(__dirname, '../../../scripts/integration-test-phase7-soak.sh');

describe('Docker-based soak integration assets', () => {
  test('Dockerfile installs dependencies inside container instead of copying host node_modules', () => {
    const dockerfile = fs.readFileSync(DOCKERFILE, 'utf8');

    expect(dockerfile).toContain('npm ci');
    expect(dockerfile).not.toContain('COPY node_modules ./node_modules/');
  });

  test('Dockerfile unsets host proxy variables and verifies runtime dependencies after npm ci', () => {
    const dockerfile = fs.readFileSync(DOCKERFILE, 'utf8');

    expect(dockerfile).toContain('unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy');
    expect(dockerfile).toContain("require.resolve('express')");
    expect(dockerfile).toContain("require.resolve('better-sqlite3')");
  });

  test('phase7 soak script rebuilds api image before running compose stack', () => {
    const script = fs.readFileSync(PHASE7_SCRIPT, 'utf8');

    expect(script).toContain('docker compose up -d --build');
  });

  test('phase7 soak script removes stale containers before rebuild', () => {
    const script = fs.readFileSync(PHASE7_SCRIPT, 'utf8');

    expect(script).toContain('docker compose down');
    expect(script).not.toContain('docker compose stop 2>/dev/null || true');
  });
});
