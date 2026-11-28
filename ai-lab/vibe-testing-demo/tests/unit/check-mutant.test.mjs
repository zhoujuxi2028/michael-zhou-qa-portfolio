import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateMutant } from '../../scripts/check-mutant.mjs';

const ids = ['01', '02', '03', '04', '05', '06', '07'];

function report(overrides = {}) {
  const specs = ids.map((n) => {
    const id = `VT-INT-${n}`;
    const failed = id in overrides ? overrides[id] : (n === '03' ? 'Expected: "Account locked"' : null);
    return {
      file: `generated/v1/${id}.spec.ts`,
      title: id,
      ok: failed === null,
      tests: [{ results: [{ status: failed === null ? 'passed' : 'failed', errors: failed ? [{ message: failed }] : [] }] }],
    };
  });
  return { suites: [{ title: 'generated', suites: [{ title: 'v1', specs }] }] };
}

test('仅 VT-INT-03 因锁定断言失败时通过', () => {
  assert.deepEqual(evaluateMutant(report()), []);
});

test('VT-INT-03 未失败时报错', () => {
  assert.match(evaluateMutant(report({ 'VT-INT-03': null })).join('\n'), /VT-INT-03.*未失败/);
});

test('VT-INT-03 因其他原因失败时报错', () => {
  assert.match(evaluateMutant(report({ 'VT-INT-03': 'Timeout 5000ms' })).join('\n'), /Account locked/);
});

test('其他用例失败时报错', () => {
  assert.match(evaluateMutant(report({ 'VT-INT-05': 'boom' })).join('\n'), /VT-INT-05.*失败/);
});

test('用例缺失时报错', () => {
  const data = report();
  data.suites[0].suites[0].specs.pop();
  assert.match(evaluateMutant(data).join('\n'), /VT-INT-07.*缺失/);
});

test('同一意图存在多个用例时报错', () => {
  const data = report();
  data.suites[0].suites[0].specs.push({ ...data.suites[0].suites[0].specs[0] });
  assert.match(evaluateMutant(data).join('\n'), /VT-INT-01.*1/);
});

test('报告无法识别时报错', () => {
  assert.match(evaluateMutant({}).join('\n'), /报告/);
});
