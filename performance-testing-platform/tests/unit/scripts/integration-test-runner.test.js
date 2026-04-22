const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../../../');
const MAIN_SCRIPT = path.join(PROJECT_ROOT, 'scripts/integration-test.sh');

function runBash(script, options = {}) {
  return spawnSync('/bin/bash', ['-c', script], {
    cwd: options.cwd || PROJECT_ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 60000,
    env: { ...process.env, ...(options.env || {}) },
  });
}

describe('integration-test shell runner', () => {
  test('run_critical 成功时返回 0 并输出成功日志', () => {
    const result = runBash(`
      source scripts/lib/common.sh
      run_critical "bash -lc 'exit 0'" "successful command"
    `);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅ successful command');
  });

  test('run_critical 返回原始退出码，避免隐藏失败', () => {
    const result = runBash(`
      source scripts/lib/common.sh
      run_critical "bash -lc 'exit 7'" "failing command"
    `);

    expect(result.status).toBe(7);
    expect(result.stderr).toContain('exit code 7');
  });

  test('retry_with_backoff 成功时返回 0', () => {
    const result = runBash(`
      source scripts/lib/common.sh
      retry_with_backoff 2 0 "bash -lc 'exit 0'"
    `);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Success after 1 attempt(s)');
  });

  test('retry_with_backoff 在重试耗尽后返回最后一次退出码', () => {
    const result = runBash(`
      source scripts/lib/common.sh
      retry_with_backoff 2 0 "bash -lc 'exit 9'"
    `);

    expect(result.status).toBe(9);
    expect(result.stderr).toContain('last exit code: 9');
  });

  test('execute_phase 支持数字 phase，并在失败后继续汇总后续结果', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-runner-execute-'));
    fs.mkdirSync(path.join(tempDir, 'tests/integration'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tests/integration/registry.sh'),
      `fail_case() { return 3; }
pass_case() { return 0; }
PHASE1_TESTS=("FAIL-CASE|fail_case|1" "PASS-CASE|pass_case|1")
ALL_TESTS=("\${PHASE1_TESTS[@]}")
`,
      'utf8'
    );

    const result = runBash(
      `
        source ${JSON.stringify(path.join(PROJECT_ROOT, 'scripts/lib/execute.sh'))}
        log_warn() { :; }
        if execute_phase 1; then
          status=0
        else
          status=$?
        fi
        printf 'status=%s\\n' "$status"
        printf 'count=%s\\n' "\${#EXEC_RESULTS[@]}"
        printf 'row1=%s\\n' "\${EXEC_RESULTS[0]}"
        printf 'row2=%s\\n' "\${EXEC_RESULTS[1]}"
      `,
      { cwd: tempDir }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('status=1');
    expect(result.stdout).toContain('count=2');
    expect(result.stdout).toContain('row1=FAIL-CASE|FAIL|');
    expect(result.stdout).toContain('row2=PASS-CASE|PASS|');
  });

  test('main runner 失败时仍生成报告并释放锁', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-runner-main-'));
    const scriptsDir = path.join(tempDir, 'scripts');
    const libDir = path.join(scriptsDir, 'lib');
    const lockDir = path.join(tempDir, 'integration-test.lock');

    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, 'integration-test.sh'), fs.readFileSync(MAIN_SCRIPT, 'utf8'), {
      mode: 0o755,
    });
    fs.writeFileSync(
      path.join(libDir, 'common.sh'),
      `#!/bin/bash
set -euo pipefail
init_logging() { :; }
`,
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(libDir, 'setup.sh'),
      `#!/bin/bash
set -euo pipefail
LOCK_DIR=${JSON.stringify(lockDir)}
setup_phase() {
  mkdir -p "$LOCK_DIR"
}
setup_cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
`,
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(libDir, 'execute.sh'),
      `#!/bin/bash
set -euo pipefail
execute_phase() {
  return 5
}
`,
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(libDir, 'report.sh'),
      `#!/bin/bash
set -euo pipefail
report_phase() {
  echo "report-called"
}
`,
      { mode: 0o755 }
    );

    const result = runBash('bash scripts/integration-test.sh --phase 1', { cwd: tempDir });

    expect(result.status).toBe(5);
    expect(result.stdout).toContain('report-called');
    expect(fs.existsSync(lockDir)).toBe(false);
  });
});
