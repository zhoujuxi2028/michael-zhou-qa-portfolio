import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync, copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

const fixtures = [];
const script = path.resolve('scripts/heal.sh');
const failure = 'docs/runs/2026-11-28-heal-before.txt';
const spec = `import { expect, test } from '@playwright/test';

test('VT-INT-01: login', async ({ page }) => {
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('status')).toHaveText('Welcome, demo');
});
`;

function fixture({ v2 = true, failureText = 'Error: locator not found\n' } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vibe-heal-'));
  fixtures.push(root);
  for (const dir of ['scripts', 'prompts', 'docs/runs', 'bin', 'tests/generated/v1']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeFileSync(path.join(root, '.gitignore'), 'node_modules/\nbin/\n');
  writeFileSync(path.join(root, 'prompts/heal.md'), '修复选择器\n');
  writeFileSync(path.join(root, '.mcp.json'), '{"mcpServers":{}}\n');
  copyFileSync(path.resolve('scripts/check-assertions.mjs'), path.join(root, 'scripts/check-assertions.mjs'));
  symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'));
  writeFileSync(path.join(root, 'scripts/serve.mjs'), `
    import http from 'node:http';
    const server = http.createServer((req, res) => res.end('demo'));
    server.listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
    process.on('SIGTERM', () => server.close());
  `);
  writeFileSync(path.join(root, 'tests/generated/v1/VT-INT-01.spec.ts'), spec);
  if (v2) {
    mkdirSync(path.join(root, 'tests/generated/v2'));
    writeFileSync(path.join(root, 'tests/generated/v2/VT-INT-01.spec.ts'), spec);
  }
  if (failureText !== null) writeFileSync(path.join(root, failure), failureText);
  writeFileSync(path.join(root, 'bin/playwright-mcp'), '#!/bin/sh\necho "Version 0.0.0"\n');
  writeFileSync(path.join(root, 'bin/copilot'), `#!/bin/sh
if [ "$1" = "--version" ]; then echo "Fake Copilot 0.0.0."; exit 0; fi
f=tests/generated/v2/VT-INT-01.spec.ts
case "$FAKE_RESULT" in
  fail) exit 7 ;;
  none) exit 0 ;;
  outside) printf 'x\\n' > tests/generated/v1/VT-INT-01.spec.ts ;;
  weaken) sed -i.bak "s/Welcome, demo/Welcome/" "$f" && rm "$f.bak" ;;
  fix) sed -i.bak "s/Log in/Sign in/" "$f" && rm "$f.bak" ;;
esac
`);
  writeFileSync(path.join(root, 'bin/npx'), '#!/bin/sh\n[ "$FAKE_PW" = "fail" ] && exit 1\nexit 0\n');
  for (const bin of ['playwright-mcp', 'copilot', 'npx']) chmodSync(path.join(root, 'bin', bin), 0o755);
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    'commit', '-qm', 'test: fixture']);
  return root;
}

function run(root, arg, result = 'fix', pw = 'pass') {
  return spawnSync('bash', [script, arg], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${path.join(root, 'bin')}:${process.env.PATH}`,
      PLAYWRIGHT_MCP: path.join(root, 'bin/playwright-mcp'),
      FAKE_RESULT: result,
      FAKE_PW: pw,
    },
    encoding: 'utf8',
    timeout: 20000,
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('失败记录路径不合法时拒绝', () => {
  const result = run(fixture(), '../escape-heal-before.txt');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /失败记录/);
});

test('失败记录为空时拒绝', () => {
  const result = run(fixture({ failureText: '' }), failure);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /失败记录/);
});

test('缺少 v2 副本时拒绝且不创建副本', () => {
  const root = fixture({ v2: false });
  const result = run(root, failure);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /v2 副本/);
  assert.equal(spawnSync('test', ['-e', path.join(root, 'tests/generated/v2')]).status, 1);
});

test('Copilot 失败时不报告成功', () => {
  const result = run(fixture(), failure, 'fail');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Copilot/);
});

test('Copilot 未修改副本时失败', () => {
  const result = run(fixture(), failure, 'none');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /未修改/);
});

test('修改 v2 副本以外的文件时失败', () => {
  const result = run(fixture(), failure, 'outside');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /范围外/);
});

test('削弱断言时断言守卫拦截', () => {
  const result = run(fixture(), failure, 'weaken');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /断言守卫/);
});

test('修复后 v2 用例仍失败时报错', () => {
  const result = run(fixture(), failure, 'fix', 'fail');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /v2 用例/);
});

test('成功时只改选择器并记录 diff', () => {
  const root = fixture();
  const result = run(root, failure);
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(path.join(root, 'tests/generated/v2/VT-INT-01.spec.ts'), 'utf8'), /Sign in/);
  assert.equal(readFileSync(path.join(root, 'tests/generated/v1/VT-INT-01.spec.ts'), 'utf8'), spec);
  const record = readFileSync(path.join(root, 'docs/runs/2026-11-28-heal-diff.md'), 'utf8');
  assert.match(record, /\+.*Sign in/);
  assert.match(record, /generated-by：Fake Copilot 0\.0\.0 \+ @playwright\/mcp 0\.0\.0/);
});

test('diff 记录已存在时不覆盖', () => {
  const root = fixture();
  writeFileSync(path.join(root, 'docs/runs/2026-11-28-heal-diff.md'), 'old\n');
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    'commit', '-qm', 'test: record']);
  const result = run(root, failure);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /不覆盖/);
});
