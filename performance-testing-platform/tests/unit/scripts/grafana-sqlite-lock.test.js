const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../../../');
const COMPOSE_FILE = path.join(PROJECT_ROOT, 'docker-compose.yml');
const SETUP_SCRIPT = path.join(PROJECT_ROOT, 'scripts/lib/setup.sh');
const PHASE1_SCRIPT = path.join(PROJECT_ROOT, 'tests/integration/phases/phase-1-grafana.sh');

describe('grafana sqlite lock hardening', () => {
  test('docker-compose 为 Grafana 配置 sqlite lock 容错参数', () => {
    const compose = fs.readFileSync(COMPOSE_FILE, 'utf8');

    expect(compose).toContain('- GF_DATABASE_SQLITE_BUSY_TIMEOUT=5000');
    expect(compose).toContain('- GF_DATABASE_SQLITE_MAX_RETRIES=50');
    expect(compose).toContain('- GF_DATABASE_SQLITE_MAX_OPEN_CONN=1');
  });

  test('setup 脚本通过共享 helper 等待 Grafana readiness', () => {
    const script = fs.readFileSync(SETUP_SCRIPT, 'utf8');

    expect(script).toContain('run_critical "wait_for_grafana_ready" "Wait for Grafana readiness"');
    expect(script).not.toContain(
      `run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" "Wait for Grafana readiness"`
    );
  });

  test('phase 1 grafana 脚本复用共享 helper，而不是单独 wait_for_endpoint', () => {
    const script = fs.readFileSync(PHASE1_SCRIPT, 'utf8');

    expect(script).toContain('run_critical "wait_for_grafana_ready" "Wait for Grafana readiness"');
    expect(script).not.toContain(`wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 60`);
  });
});
