/**
 * CI 工作流目录卫生检查脚本测试
 *
 * 预防 ISS-019: CI 输出目录必须显式 mkdir -p，不能依赖 git checkout 提供目录结构
 *
 * 根本原因（RCA）: ffb5a3b 添加 `--out json=reports/k6-smoke-summary.json` 时
 * 遗漏了 `mkdir -p reports`，但因为 reports/ 目录当时被 git 追踪，
 * CI checkout 会自动恢复该目录，Bug 被掩盖了约 3 天 (runs 197-212)。
 * 直到 d7df59d0 将测试产物从 git 追踪中移除，Bug 才暴露 (runs 213-215)。
 *
 * TDD 顺序: 先写这些测试（全部 FAIL），再实现 scripts/ci-lint.js 使它们 PASS。
 */

'use strict';

const { lintJobSteps } = require('../../../scripts/analysis/ci-lint');

// ─── 测试辅助：构建模拟 job steps ─────────────────────────────────────────────

/**
 * 构建单个 step 对象（模拟 YAML 解析后的格式）
 * @param {string} run - shell 命令
 * @param {string} [name] - step 名称
 */
function step(run, name = 'unnamed') {
  return { name, run };
}

// ─── 测试套件 ─────────────────────────────────────────────────────────────────

describe('lintJobSteps - CI 输出目录卫生检查', () => {
  // UT-CI-LINT-01: k6 --out json=dir/file 没有 mkdir → 报错
  test('UT-CI-LINT-01: k6 --out json=reports/file 无 mkdir -p → 返回错误', () => {
    const steps = [step('k6 run --out json=reports/k6-smoke-summary.json smoke.k6.js', 'k6 smoke')];
    const errors = lintJobSteps(steps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/mkdir -p reports/);
  });

  // UT-CI-LINT-02: k6 --out json=dir/file 有前置 mkdir → 通过
  test('UT-CI-LINT-02: k6 --out json=reports/file 有 mkdir -p → 无错误', () => {
    const steps = [
      step('mkdir -p reports', 'create output dir'),
      step('k6 run --out json=reports/k6-smoke-summary.json smoke.k6.js', 'k6 smoke'),
    ];
    const errors = lintJobSteps(steps);
    expect(errors).toHaveLength(0);
  });

  // UT-CI-LINT-03: mkdir 在同一 run 块内（多行命令）→ 通过
  test('UT-CI-LINT-03: mkdir -p 和输出命令在同一 run 块 → 无错误', () => {
    const steps = [
      step(
        'mkdir -p reports\nk6 run --out json=reports/k6-smoke-summary.json smoke.k6.js',
        'k6 smoke'
      ),
    ];
    const errors = lintJobSteps(steps);
    expect(errors).toHaveLength(0);
  });

  // UT-CI-LINT-04: 写入当前目录（无子目录）→ 不需要 mkdir，通过
  test('UT-CI-LINT-04: 输出到当前目录（无子目录路径）→ 无错误', () => {
    const steps = [step('k6 run --out json=results.json smoke.k6.js', 'k6 smoke')];
    const errors = lintJobSteps(steps);
    expect(errors).toHaveLength(0);
  });

  // UT-CI-LINT-05: JMeter -l results/file 没有 mkdir → 报错
  test('UT-CI-LINT-05: jmeter -l results/smoke.jtl 无 mkdir -p → 返回错误', () => {
    const steps = [step('jmeter -n -t smoke.jmx -l results/jmeter-smoke.jtl', 'jmeter smoke')];
    const errors = lintJobSteps(steps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/mkdir -p results/);
  });

  // UT-CI-LINT-06: JMeter -l results/file 有 mkdir → 通过
  test('UT-CI-LINT-06: jmeter -l results/smoke.jtl 有 mkdir -p → 无错误', () => {
    const steps = [
      step('mkdir -p results\njmeter -n -t smoke.jmx -l results/jmeter-smoke.jtl', 'jmeter smoke'),
    ];
    const errors = lintJobSteps(steps);
    expect(errors).toHaveLength(0);
  });

  // UT-CI-LINT-07: gh run download -D dir/ 没有 mkdir → 报错
  test('UT-CI-LINT-07: gh run download -D reports/ 无 mkdir -p → 返回错误', () => {
    const steps = [step('gh run download 12345 -n baseline -D reports/', 'download artifact')];
    const errors = lintJobSteps(steps);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/mkdir -p reports/);
  });

  // UT-CI-LINT-08: gh run download -D dir/ 有 mkdir → 通过
  test('UT-CI-LINT-08: gh run download -D reports/ 有 mkdir -p → 无错误', () => {
    const steps = [
      step('mkdir -p reports', 'create dir'),
      step('gh run download 12345 -n baseline -D reports/', 'download artifact'),
    ];
    const errors = lintJobSteps(steps);
    expect(errors).toHaveLength(0);
  });

  // UT-CI-LINT-09: 多个输出目录，全部有 mkdir → 通过
  test('UT-CI-LINT-09: 多个输出目录，全部有 mkdir -p → 无错误', () => {
    const steps = [
      step('mkdir -p reports results', 'create output dirs'),
      step('k6 run --out json=reports/k6.json smoke.k6.js', 'k6 smoke'),
      step('jmeter -n -t smoke.jmx -l results/jmeter.jtl', 'jmeter smoke'),
    ];
    const errors = lintJobSteps(steps);
    expect(errors).toHaveLength(0);
  });

  // UT-CI-LINT-10: 多个输出目录，只有部分有 mkdir → 报错（只报缺失的那个）
  test('UT-CI-LINT-10: 多个输出目录，部分缺少 mkdir -p → 只报缺失的目录', () => {
    const steps = [
      step('mkdir -p reports', 'create reports dir'),
      step('k6 run --out json=reports/k6.json smoke.k6.js', 'k6 smoke'),
      step('jmeter -n -t smoke.jmx -l results/jmeter.jtl', 'jmeter smoke'), // results/ 没有 mkdir
    ];
    const errors = lintJobSteps(steps);
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/mkdir -p results/);
  });

  // UT-CI-LINT-11: steps 为空数组 → 无错误
  test('UT-CI-LINT-11: 空 steps 列表 → 无错误', () => {
    expect(lintJobSteps([])).toHaveLength(0);
  });

  // UT-CI-LINT-12: step 没有 run 字段（uses 类型）→ 跳过，无错误
  test('UT-CI-LINT-12: step 为 uses action（无 run 字段）→ 无错误', () => {
    const steps = [{ name: 'checkout', uses: 'actions/checkout@v6' }];
    expect(lintJobSteps(steps)).toHaveLength(0);
  });
});
