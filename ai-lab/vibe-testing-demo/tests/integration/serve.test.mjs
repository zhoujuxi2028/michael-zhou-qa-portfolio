import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

let server;
let port;

before(async () => {
  server = spawn(process.execPath, ['scripts/serve.mjs', 'v1', '0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  server.stderr.on('data', chunk => { errors += chunk; });
  const started = once(server.stdout, 'data').then(([chunk]) => {
    const match = String(chunk).match(/127\.0\.0\.1:(\d+)/);
    assert.ok(match, '服务应输出监听地址');
    port = Number(match[1]);
  });
  const exited = once(server, 'exit').then(([code]) => {
    throw new Error(`服务启动失败 (${code}): ${errors}`);
  });
  await Promise.race([started, exited]);
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, 'exit');
  }
});

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    }).on('error', reject);
  });
}

test('合法版本返回登录页面', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.body, /Log in/);
});

test('不存在的资源返回 404', async () => {
  const response = await request('/missing.html');
  assert.equal(response.status, 404);
});

test('路径穿越请求被拒绝', async () => {
  const response = await request('/%2e%2e/package.json');
  assert.equal(response.status, 400);
});

test('未知版本启动失败', async () => {
  const child = spawn(process.execPath, ['scripts/serve.mjs', 'unknown', '0']);
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  const [code] = await once(child, 'exit');
  assert.notEqual(code, 0);
  assert.match(errors, /Unsupported APP_VERSION/);
});
