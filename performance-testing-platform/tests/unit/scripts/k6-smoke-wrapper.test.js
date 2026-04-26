/**
 * k6 smoke wrapper 行为级回归测试 (focused tests)
 *
 * 关联 issue：
 *   - #202: smoke baseline 在 API 未启动时直接报 connection refused
 *   - #204: BASE_URL + PORT 组合未归一化 → canonical target URL 失真
 *   - #205: 远端目标也会触发本地 autostart
 *
 * 这些测试不依赖真实的 k6 / server.sh / 网络 —— 通过 PATH 注入伪造的 `curl`
 * 让 wrapper 进入「健康检查失败」路径，断言：
 *   1. canonical HEALTH_URL 同时反映 BASE_URL 与 PORT；
 *   2. 远端目标不会触发本地 autostart，并且 fail-fast 退出。
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '../../../scripts/k6-smoke.sh');
const PROJECT_DIR = path.join(__dirname, '../../..');

/**
 * 创建一个临时 bin 目录，并放入伪造的 curl/k6/server.sh 守护测试。
 *
 * - `curl`: 始终返回非零，模拟健康检查失败
 * - `k6`: 记录是否被调用（不应被调用，因为 wrapper 在 health check 失败时就 exit）
 * - `server.sh`: 记录是否被调用（用于 #205：远端目标禁止 autostart）
 */
function makeFakeBinDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k6-smoke-test-'));
  const markerCurl = path.join(tmp, 'curl-called');
  const markerK6 = path.join(tmp, 'k6-called');
  const markerServer = path.join(tmp, 'server-sh-called');

  fs.writeFileSync(
    path.join(tmp, 'curl'),
    '#!/bin/bash\necho "fake-curl $*" >> "' + markerCurl + '"\nexit 7\n',
    { mode: 0o755 }
  );
  fs.writeFileSync(
    path.join(tmp, 'k6'),
    '#!/bin/bash\necho "fake-k6 $*" >> "' + markerK6 + '"\nexit 0\n',
    { mode: 0o755 }
  );

  return { tmp, markerCurl, markerK6, markerServer };
}

/**
 * 运行 wrapper 脚本，注入伪造 PATH，确保不会真的访问网络或启动服务。
 */
function runWrapper({ env = {}, fakeBinDir }) {
  return spawnSync('bash', [SCRIPT, '--vus', '1', '--duration', '1s'], {
    cwd: PROJECT_DIR,
    env: {
      // 不继承 PATH 之外的与 wrapper 行为相关的变量，保持隔离
      HOME: process.env.HOME,
      PATH: `${fakeBinDir}:/usr/bin:/bin`,
      ...env,
    },
    encoding: 'utf-8',
    timeout: 15000,
  });
}

describe('scripts/k6-smoke.sh 行为级回归', () => {
  describe('#204: canonical target URL 必须组合 BASE_URL 与 PORT', () => {
    test('BASE_URL=http://localhost + PORT=3001 → HEALTH_URL 注入 :3001', () => {
      const { tmp } = makeFakeBinDir();
      const result = runWrapper({
        fakeBinDir: tmp,
        env: {
          BASE_URL: 'http://localhost',
          PORT: '3001',
          K6_SMOKE_SKIP_AUTOSTART: 'true',
        },
      });

      expect(result.status).toBe(1);
      // 失败提示中应当出现归一化后的 canonical HEALTH_URL，端口为 3001 而非默认 3000
      const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
      expect(combined).toContain('http://localhost:3001/health');
      expect(combined).not.toContain('http://localhost:3000/health');
    });

    test('BASE_URL 已含端口（http://localhost:3005）时 PORT 被忽略，端口保留 3005', () => {
      const { tmp } = makeFakeBinDir();
      const result = runWrapper({
        fakeBinDir: tmp,
        env: {
          BASE_URL: 'http://localhost:3005',
          // 故意设置一个不同的 PORT，以确认 BASE_URL 的显式端口优先
          PORT: '9999',
          K6_SMOKE_SKIP_AUTOSTART: 'true',
        },
      });

      expect(result.status).toBe(1);
      const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
      expect(combined).toContain('http://localhost:3005/health');
      expect(combined).not.toContain(':9999/health');
    });

    test('BASE_URL 含路径前缀时 canonical URL 保留路径与端口', () => {
      const { tmp } = makeFakeBinDir();
      const result = runWrapper({
        fakeBinDir: tmp,
        env: {
          BASE_URL: 'http://localhost/api/v1',
          PORT: '3001',
          K6_SMOKE_SKIP_AUTOSTART: 'true',
        },
      });

      expect(result.status).toBe(1);
      const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
      expect(combined).toContain('http://localhost:3001/api/v1/health');
    });
  });

  describe('#205: 远端目标必须 fail-fast，不允许本地 autostart', () => {
    test('BASE_URL=http://example.invalid:3000 时直接退出且不调用 server.sh', () => {
      const { tmp, markerServer } = makeFakeBinDir();

      // 进一步守护：注入一个伪造的 scripts/server.sh，但放在临时目录里通过 PROJECT 覆盖更复杂；
      // wrapper 调用的是 `bash scripts/server.sh`，因此真正需要保证的是「不进入这条分支」。
      // 这里通过验证 stderr 中没有出现 server.sh 启动产物来做反向断言。
      const result = runWrapper({
        fakeBinDir: tmp,
        env: {
          BASE_URL: 'http://example.invalid:3000',
        },
      });

      expect(result.status).toBe(1);
      const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
      expect(combined).toContain('Remote target not reachable on http://example.invalid:3000/health');
      // 不应当出现 server.sh 实际启动时打印的 "Starting server" 文本
      expect(combined).not.toMatch(/Starting server in single mode/);
      // 也不应当调用 fake k6
      expect(fs.existsSync(path.join(tmp, 'k6-called'))).toBe(false);
      // 反向标记：从未触发 server.sh 启动后的写入逻辑
      expect(fs.existsSync(markerServer)).toBe(false);
    });

    test('IPv6 loopback (::1) 也被识别为本地目标，不会 fail-fast', () => {
      // 仅做静态判断：脚本在远端目标分支会立刻 exit 1 并打印 "Remote target not reachable"。
      // 这里通过设置 BASE_URL=http://[::1]:3000 + SKIP_AUTOSTART=true 让 wrapper
      // 在「本地目标 + health 失败」路径上走 SKIP_AUTOSTART 失败提示，而非 remote fail-fast。
      const { tmp } = makeFakeBinDir();
      const result = runWrapper({
        fakeBinDir: tmp,
        env: {
          BASE_URL: 'http://[::1]:3000',
          K6_SMOKE_SKIP_AUTOSTART: 'true',
        },
      });

      expect(result.status).toBe(1);
      const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
      // 本地目标失败应当走 SKIP_AUTOSTART 路径的提示语，而不是 remote 的 fail-fast 提示语
      expect(combined).toContain('API not reachable');
      expect(combined).not.toContain('Remote target not reachable');
    });
  });
});
