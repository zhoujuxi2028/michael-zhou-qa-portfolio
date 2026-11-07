/**
 * TDD: prune_old_logs() 单元测试
 * 验证 scripts/lib/report.sh 中的日志文件保留逻辑（最新3组 log/md/json）
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../../../');

function runBash(script, options = {}) {
  const scriptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-logs-test-'));
  const scriptPath = path.join(scriptDir, 'run.sh');
  fs.writeFileSync(scriptPath, script, { mode: 0o700 });

  try {
    return spawnSync('/bin/bash', [scriptPath], {
      cwd: options.cwd || PROJECT_ROOT,
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      env: { ...process.env, ...(options.env || {}) },
    });
  } finally {
    fs.rmSync(scriptDir, { recursive: true, force: true });
  }
}

describe('prune_old_logs()', () => {
  test('超过3组时，保留最新3组，删除旧组', () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-logs-'));

    // 创建 5 组文件（run_id 100~500，100最旧，500最新）
    for (const id of [100, 200, 300, 400, 500]) {
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.log`), `log ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.md`), `md ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.json`), `{"id":${id}}`);
    }

    const result = runBash(`
      source scripts/lib/common.sh
      source scripts/lib/execute.sh
      source scripts/lib/report.sh
      LOG_DIR=${JSON.stringify(logDir)}
      prune_old_logs 3
    `);

    expect(result.status).toBe(0);

    // 最旧的两组应该被删除
    for (const id of [100, 200]) {
      for (const ext of ['log', 'md', 'json']) {
        expect(fs.existsSync(path.join(logDir, `integration-test-${id}.${ext}`))).toBe(false);
      }
    }

    // 最新的三组应该保留
    for (const id of [300, 400, 500]) {
      for (const ext of ['log', 'md', 'json']) {
        expect(fs.existsSync(path.join(logDir, `integration-test-${id}.${ext}`))).toBe(true);
      }
    }

    fs.rmSync(logDir, { recursive: true, force: true });
  });

  test('正好3组时，不删除任何文件', () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-logs-'));

    for (const id of [100, 200, 300]) {
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.log`), `log ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.md`), `md ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.json`), `{"id":${id}}`);
    }

    const result = runBash(`
      source scripts/lib/common.sh
      source scripts/lib/execute.sh
      source scripts/lib/report.sh
      LOG_DIR=${JSON.stringify(logDir)}
      prune_old_logs 3
    `);

    expect(result.status).toBe(0);

    for (const id of [100, 200, 300]) {
      for (const ext of ['log', 'md', 'json']) {
        expect(fs.existsSync(path.join(logDir, `integration-test-${id}.${ext}`))).toBe(true);
      }
    }

    fs.rmSync(logDir, { recursive: true, force: true });
  });

  test('少于3组时，不删除任何文件', () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-logs-'));

    for (const id of [100, 200]) {
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.log`), `log ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.md`), `md ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.json`), `{"id":${id}}`);
    }

    const result = runBash(`
      source scripts/lib/common.sh
      source scripts/lib/execute.sh
      source scripts/lib/report.sh
      LOG_DIR=${JSON.stringify(logDir)}
      prune_old_logs 3
    `);

    expect(result.status).toBe(0);

    for (const id of [100, 200]) {
      for (const ext of ['log', 'md', 'json']) {
        expect(fs.existsSync(path.join(logDir, `integration-test-${id}.${ext}`))).toBe(true);
      }
    }

    fs.rmSync(logDir, { recursive: true, force: true });
  });

  test('同时删除旧组的 snapshots 子目录', () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-logs-'));

    for (const id of [100, 200, 300, 400, 500]) {
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.log`), `log ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.md`), `md ${id}`);
      fs.writeFileSync(path.join(logDir, `integration-test-${id}.json`), `{}`);
      const snapDir = path.join(logDir, 'snapshots', String(id));
      fs.mkdirSync(snapDir, { recursive: true });
      fs.writeFileSync(path.join(snapDir, 'dashboard.json'), '{}');
    }

    const result = runBash(`
      source scripts/lib/common.sh
      source scripts/lib/execute.sh
      source scripts/lib/report.sh
      LOG_DIR=${JSON.stringify(logDir)}
      prune_old_logs 3
    `);

    expect(result.status).toBe(0);

    // 旧组 snapshots 应该被删除
    for (const id of [100, 200]) {
      expect(fs.existsSync(path.join(logDir, 'snapshots', String(id)))).toBe(false);
    }

    // 新组 snapshots 应该保留
    for (const id of [300, 400, 500]) {
      expect(fs.existsSync(path.join(logDir, 'snapshots', String(id)))).toBe(true);
    }

    fs.rmSync(logDir, { recursive: true, force: true });
  });

  test('空目录时不报错', () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-logs-'));

    const result = runBash(`
      source scripts/lib/common.sh
      source scripts/lib/execute.sh
      source scripts/lib/report.sh
      LOG_DIR=${JSON.stringify(logDir)}
      prune_old_logs 3
    `);

    expect(result.status).toBe(0);

    fs.rmSync(logDir, { recursive: true, force: true });
  });
});
