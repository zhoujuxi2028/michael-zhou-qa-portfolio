/**
 * baseline-export.js CLI 集成测试
 *
 * 通过 spawnSync 拉子进程执行脚本，验证编排层行为：
 *   - 参数解析（summaryFile / outputFile）
 *   - 文件 I/O（写入 reports/baseline.json，自动 mkdir）
 *   - 退出码（成功 0，异常 1）
 *   - placeholder 分支（summary.json 缺失）
 *   - JSON 解析失败的 catch 分支
 *
 * 解析逻辑分支由 tests/unit/utils/baseline.test.js 中的纯函数单测覆盖。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts/analysis/baseline-export.js');

// CI 环境下 GITHUB_SHA 等会被注入子进程，导致 run_id 退化为 commit SHA。
// 这里构造纯净 env，确保 CLI 行为与本地默认一致（run_id='local'/'placeholder'）。
function buildCleanEnv() {
  // eslint-disable-next-line no-unused-vars
  const { GITHUB_SHA, GITHUB_RUN_ID, ...env } = process.env;
  return env;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-export-int-'));
}

describe('baseline-export.js CLI (integration)', () => {
  test('INT-EX-01: 真实 k6 summary（values 字段）→ 写入合法 baseline', () => {
    const tempDir = makeTempDir();
    const summaryFile = path.join(tempDir, 'summary.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    fs.writeFileSync(
      summaryFile,
      JSON.stringify({
        metrics: {
          http_req_duration: { values: { 'p(95)': 3.085, avg: 1.43 } },
          http_req_failed: { value: 0 },
          http_reqs: { count: 900, rate: 14.92 },
        },
        state: { testRunDurationMs: 60313 },
      })
    );

    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    expect(result.status).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    expect(baseline).toMatchObject({
      p95_ms: 3,
      error_rate: 0,
      throughput_rps: 14.9,
      run_id: 'local',
    });
  });

  test('INT-EX-02: summary 顶层 p(95) 字段（旧 k6 形态）也能解析', () => {
    const tempDir = makeTempDir();
    const summaryFile = path.join(tempDir, 'summary.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    fs.writeFileSync(
      summaryFile,
      JSON.stringify({
        metrics: {
          http_req_duration: { 'p(95)': 3.69 },
          http_req_failed: { value: 0 },
          http_reqs: { count: 885 },
        },
        state: { testRunDurationMs: 60100 },
      })
    );

    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    expect(result.status).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    expect(baseline).toMatchObject({
      p95_ms: 4,
      error_rate: 0,
      throughput_rps: 14.7,
      run_id: 'local',
    });
  });

  test('INT-EX-03: summary.json 缺失 → placeholder baseline', () => {
    const tempDir = makeTempDir();
    const summaryFile = path.join(tempDir, 'missing.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/using placeholder baseline/);
    const baseline = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    expect(baseline).toMatchObject({
      p95_ms: 500,
      error_rate: 0.01,
      throughput_rps: 50,
      run_id: 'placeholder',
    });
    expect(typeof baseline.timestamp).toBe('string');
  });

  test('INT-EX-04: 输出目录不存在时自动创建', () => {
    const tempDir = makeTempDir();
    const summaryFile = path.join(tempDir, 'summary.json');
    const nestedOutput = path.join(tempDir, 'nested', 'reports', 'baseline.json');

    fs.writeFileSync(
      summaryFile,
      JSON.stringify({
        metrics: {
          http_req_duration: { values: { 'p(95)': 5 } },
          http_req_failed: { value: 0 },
          http_reqs: { count: 100 },
        },
        state: { testRunDurationMs: 60000 },
      })
    );

    const result = spawnSync('node', [SCRIPT, summaryFile, nestedOutput], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(nestedOutput)).toBe(true);
  });

  test('INT-EX-05: summary.json 非合法 JSON → 退出码 1，错误写到 stderr', () => {
    const tempDir = makeTempDir();
    const summaryFile = path.join(tempDir, 'summary.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    fs.writeFileSync(summaryFile, '{not-valid-json');

    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Error exporting baseline/);
    expect(fs.existsSync(outputFile)).toBe(false);
  });

  test('INT-EX-06: GITHUB_SHA 存在时 run_id 取 sha', () => {
    const tempDir = makeTempDir();
    const summaryFile = path.join(tempDir, 'summary.json');
    const outputFile = path.join(tempDir, 'baseline.json');

    fs.writeFileSync(
      summaryFile,
      JSON.stringify({
        metrics: {
          http_req_duration: { values: { 'p(95)': 5 } },
          http_req_failed: { value: 0 },
          http_reqs: { count: 100 },
        },
        state: { testRunDurationMs: 60000 },
      })
    );

    const env = { ...buildCleanEnv(), GITHUB_SHA: 'deadbeef1234567890' };
    const result = spawnSync('node', [SCRIPT, summaryFile, outputFile], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env,
    });

    expect(result.status).toBe(0);
    const baseline = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    expect(baseline.run_id).toBe('deadbeef1234567890');
  });
});
