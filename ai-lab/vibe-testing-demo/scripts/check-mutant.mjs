import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const INTENTS = ['01', '02', '03', '04', '05', '06', '07'].map((n) => `VT-INT-${n}`);
const TARGET = 'VT-INT-03';
const TARGET_MESSAGE = 'Account locked';

function collectSpecs(suite, out = []) {
  for (const spec of suite.specs ?? []) out.push(spec);
  for (const child of suite.suites ?? []) collectSpecs(child, out);
  return out;
}

export function evaluateMutant(report) {
  if (!Array.isArray(report?.suites)) return ['无法识别的 Playwright JSON 报告'];
  const byIntent = new Map();
  for (const spec of report.suites.flatMap((suite) => collectSpecs(suite))) {
    const id = basename(spec.file ?? '', '.spec.ts');
    byIntent.set(id, [...(byIntent.get(id) ?? []), spec]);
  }
  const problems = [];
  for (const id of INTENTS) {
    const specs = byIntent.get(id) ?? [];
    if (specs.length === 0) {
      problems.push(`${id}：用例缺失`);
      continue;
    }
    if (specs.length !== 1) {
      problems.push(`${id}：期望 1 个用例，实际 ${specs.length} 个`);
      continue;
    }
    const [spec] = specs;
    if (id !== TARGET) {
      if (!spec.ok) problems.push(`${id}：在 mutant 上失败，应通过`);
      continue;
    }
    if (spec.ok) {
      problems.push(`${id}：在 mutant 上未失败，变异未被检出`);
      continue;
    }
    const messages = (spec.tests ?? []).flatMap((t) => t.results ?? [])
      .flatMap((r) => r.errors ?? []).map((e) => e.message ?? '');
    if (!messages.some((m) => m.includes(TARGET_MESSAGE))) {
      problems.push(`${id}：失败原因不是 ${TARGET_MESSAGE} 断言`);
    }
  }
  for (const id of byIntent.keys()) {
    if (!INTENTS.includes(id)) problems.push(`${id}：未知用例`);
  }
  return problems;
}

function main() {
  const run = spawnSync('npx', ['playwright', 'test', 'tests/generated/v1', '--project=chromium', '--reporter=json'], {
    env: { ...process.env, APP_VERSION: 'mutant' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error) throw run.error;
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    process.stderr.write(run.stderr);
    throw new Error('无法解析 Playwright JSON 报告');
  }
  const problems = evaluateMutant(report);
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(`Mutant gate passed: only ${TARGET} failed on ${TARGET_MESSAGE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`Mutant gate failed: ${error.message}`);
    process.exitCode = 1;
  }
}
