import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

const fixtures = [];
const script = path.resolve('scripts/generate.sh');

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vibe-generate-'));
  fixtures.push(root);
  for (const dir of ['scripts', 'intents', 'prompts', 'node_modules/.bin', 'bin']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeFileSync(path.join(root, '.gitignore'), 'node_modules/\nbin/\n');
  writeFileSync(path.join(root, 'intents/VT-INT-01.md'), '意图一\n');
  writeFileSync(path.join(root, 'prompts/generate.md'), '生成指定测试\n');
  writeFileSync(path.join(root, '.mcp.json'), '{"mcpServers":{}}\n');
  writeFileSync(path.join(root, 'scripts/serve.mjs'), `
    import http from 'node:http';
    const server = http.createServer((req, res) => res.end('demo'));
    server.listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
    process.on('SIGTERM', () => server.close());
  `);
  writeFileSync(path.join(root, 'node_modules/.bin/playwright-mcp'), '#!/bin/sh\necho "Version 0.0.0"\n');
  chmodSync(path.join(root, 'node_modules/.bin/playwright-mcp'), 0o755);
  writeFileSync(path.join(root, 'bin/copilot'), `#!/bin/sh
if [ "$1" = "--version" ]; then echo "Fake Copilot 0.0.0"; exit 0; fi
case "$FAKE_RESULT" in
  fail) exit 7 ;;
  empty) exit 0 ;;
  outside) printf 'unexpected\\n' > unexpected.txt ;;
  success) mkdir -p tests/generated/v1; printf 'generated\\n' > tests/generated/v1/VT-INT-01.spec.ts ;;
esac
`);
  chmodSync(path.join(root, 'bin/copilot'), 0o755);
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    'commit', '-qm', 'test: fixture']);
  return root;
}

function run(root, intent, result = 'success') {
  return spawnSync('bash', [script, intent], {
    cwd: root,
    env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, FAKE_RESULT: result },
    encoding: 'utf8',
    timeout: 15000,
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('非法意图被拒绝', () => {
  const result = run(fixture(), '../escape');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /意图/);
});

test('缺失意图文件时失败', () => {
  const result = run(fixture(), 'VT-INT-02');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /意图/);
});

test('Copilot 失败时不报告成功', () => {
  const result = run(fixture(), 'VT-INT-01', 'fail');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Copilot/);
});

test('Copilot 未创建目标文件时失败', () => {
  const result = run(fixture(), 'VT-INT-01', 'empty');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /目标文件/);
});

test('检测到目标范围外仓库修改时失败', () => {
  const result = run(fixture(), 'VT-INT-01', 'outside');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /范围外/);
});

test('成功时只生成指定文件并记录运行摘要', () => {
  const root = fixture();
  const result = run(root, 'VT-INT-01');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path.join(root, 'tests/generated/v1/VT-INT-01.spec.ts'), 'utf8'), 'generated\n');
  assert.match(result.stdout, /VT-INT-01/);
  const record = readFileSync(path.join(root, 'docs/runs/generate-VT-INT-01.md'), 'utf8');
  assert.match(record, /意图一/);
  assert.match(record, /generated-by：Fake Copilot 0\.0\.0 \+ @playwright\/mcp 0\.0\.0/);
  assert.match(record, /generated-at：\d{4}-\d{2}-\d{2}T/);
});
