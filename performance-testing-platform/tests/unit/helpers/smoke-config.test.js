const fs = require('fs');
const path = require('path');

const { loadProfile, validateProfile } = require('../../../src/utils/profile-parser');

const PROFILES_DIR = path.join(__dirname, '../../../profiles');
const SMOKE_PROFILE = path.join(PROFILES_DIR, 'smoke.json');
const SMOKE_K6_SCRIPT = path.join(__dirname, '../../../tests/performance/smoke.k6.js');

describe('k6 Smoke 配置验证', () => {
  describe('smoke.json profile 文件验证', () => {
    test('K6-SMOKE-UT-01: profiles/smoke.json 文件存在', () => {
      expect(fs.existsSync(SMOKE_PROFILE)).toBe(true);
    });

    test('K6-SMOKE-UT-02: smoke.json 是有效 JSON', () => {
      const content = fs.readFileSync(SMOKE_PROFILE, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('K6-SMOKE-UT-03: smoke.json 包含 vus 字段且值为 5', () => {
      const profile = JSON.parse(fs.readFileSync(SMOKE_PROFILE, 'utf-8'));
      expect(profile.vus).toBe(5);
    });

    test('K6-SMOKE-UT-04: smoke.json 包含 duration 字段且值为 60s', () => {
      const profile = JSON.parse(fs.readFileSync(SMOKE_PROFILE, 'utf-8'));
      expect(profile.duration).toBe('60s');
    });

    test('K6-SMOKE-UT-05: smoke.json 包含 p95 < 500ms 阈值', () => {
      const profile = JSON.parse(fs.readFileSync(SMOKE_PROFILE, 'utf-8'));
      expect(profile.thresholds).toBeDefined();
      expect(profile.thresholds.http_req_duration).toBeDefined();
      expect(profile.thresholds.http_req_duration).toContainEqual(
        expect.stringContaining('p(95)<500')
      );
    });

    test('K6-SMOKE-UT-06: smoke.json 包含 error rate < 1% 阈值', () => {
      const profile = JSON.parse(fs.readFileSync(SMOKE_PROFILE, 'utf-8'));
      expect(profile.thresholds.http_req_failed).toBeDefined();
      expect(profile.thresholds.http_req_failed).toContainEqual(
        expect.stringContaining('rate<0.01')
      );
    });

    test('K6-SMOKE-UT-07: smoke.json 通过 profile-parser 验证', () => {
      const content = fs.readFileSync(SMOKE_PROFILE, 'utf-8');
      const result = loadProfile(content);
      expect(result.vus).toBe(5);
      expect(result.duration).toBe('60s');
      expect(result.thresholds).toHaveProperty('http_req_duration');
      expect(result.thresholds).toHaveProperty('http_req_failed');
    });
  });

  describe('smoke.k6.js 脚本验证', () => {
    let scriptContent;

    beforeAll(() => {
      scriptContent = fs.readFileSync(SMOKE_K6_SCRIPT, 'utf-8');
    });

    test('K6-SMOKE-UT-08: smoke.k6.js 文件存在', () => {
      expect(fs.existsSync(SMOKE_K6_SCRIPT)).toBe(true);
    });

    test('K6-SMOKE-UT-09: smoke.k6.js 使用 loadProfile("smoke")', () => {
      expect(scriptContent).toContain("loadProfile('smoke')");
    });

    test('K6-SMOKE-UT-10: smoke.k6.js 测试 /health 端点', () => {
      expect(scriptContent).toContain('/health');
    });

    test('K6-SMOKE-UT-11: smoke.k6.js 测试 /api/products 端点', () => {
      expect(scriptContent).toContain('/api/products');
    });

    test('K6-SMOKE-UT-12: smoke.k6.js 测试 /api/products/:id 端点', () => {
      expect(scriptContent).toMatch(/\/api\/products\/\$\{/);
    });

    test('K6-SMOKE-UT-13: smoke.k6.js 使用 checkStatus helper', () => {
      expect(scriptContent).toContain('checkStatus');
    });

    test('K6-SMOKE-UT-14: smoke.k6.js 使用 checkDuration helper', () => {
      expect(scriptContent).toContain('checkDuration');
    });

    test('K6-SMOKE-UT-15: smoke.k6.js 包含 endpoint tag', () => {
      expect(scriptContent).toContain("endpoint: '/health'");
      expect(scriptContent).toContain("endpoint: '/api/products'");
      expect(scriptContent).toContain("endpoint: '/api/products/:id'");
    });
  });

  describe('profile-parser smoke 场景验证', () => {
    test('K6-SMOKE-UT-16: validateProfile 接受 vus+duration 模式', () => {
      const profile = {
        vus: 5,
        duration: '60s',
        thresholds: { http_req_duration: ['p(95)<500'] },
      };
      const result = validateProfile(profile);
      expect(result.vus).toBe(5);
      expect(result.duration).toBe('60s');
    });

    test('K6-SMOKE-UT-17: validateProfile 拒绝缺少 thresholds 的 smoke 配置', () => {
      const profile = { vus: 5, duration: '60s' };
      expect(() => validateProfile(profile)).toThrow('thresholds');
    });

    test('K6-SMOKE-UT-18: validateProfile 拒绝无 vus 和无 stages 的配置', () => {
      const profile = {
        thresholds: { http_req_duration: ['p(95)<500'] },
      };
      expect(() => validateProfile(profile)).toThrow();
    });
  });

  describe('npm 脚本配置验证', () => {
    let pkg;

    beforeAll(() => {
      pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf-8'));
    });

    test('K6-SMOKE-UT-19: package.json 包含 k6:smoke 脚本', () => {
      expect(pkg.scripts['k6:smoke']).toBeDefined();
    });

    test('K6-SMOKE-UT-20: k6:smoke 输出 HTML 报告到 reports/', () => {
      expect(pkg.scripts['k6:smoke']).toContain('reports/k6-smoke.html');
    });

    test('K6-SMOKE-UT-21: k6:smoke 执行 smoke.k6.js', () => {
      expect(pkg.scripts['k6:smoke']).toContain('tests/performance/smoke.k6.js');
    });

    test('K6-SMOKE-UT-22: k6:smoke 创建 reports 目录', () => {
      expect(pkg.scripts['k6:smoke']).toContain('mkdir -p reports');
    });
  });

  describe('profiles 目录一致性', () => {
    test('K6-SMOKE-UT-23: 标准 profile JSON 都通过 validateProfile', () => {
      // capacity.json 使用自定义 defaults 格式（二分法容量测试），不适用标准 profile 验证
      const NON_STANDARD_PROFILES = ['capacity.json'];
      const profileFiles = fs
        .readdirSync(PROFILES_DIR)
        .filter((f) => f.endsWith('.json') && !NON_STANDARD_PROFILES.includes(f));

      expect(profileFiles.length).toBeGreaterThan(0);

      for (const file of profileFiles) {
        const content = fs.readFileSync(path.join(PROFILES_DIR, file), 'utf-8');
        expect(() => loadProfile(content)).not.toThrow();
      }
    });

    test('K6-SMOKE-UT-24: smoke profile 的 vus 是所有 profile 中最小的', () => {
      const smokeProfile = JSON.parse(fs.readFileSync(SMOKE_PROFILE, 'utf-8'));
      const profileFiles = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'));

      for (const file of profileFiles) {
        const profile = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, file), 'utf-8'));
        if (profile.vus) {
          expect(smokeProfile.vus).toBeLessThanOrEqual(profile.vus);
        }
      }
    });
  });
});
