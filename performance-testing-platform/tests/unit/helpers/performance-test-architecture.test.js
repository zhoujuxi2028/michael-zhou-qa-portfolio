const fs = require('fs');
const path = require('path');

const { loadProfile } = require('../../../src/utils/profile-parser');

const PROJECT_ROOT = path.join(__dirname, '../../../');
const PROFILES_DIR = path.join(PROJECT_ROOT, 'profiles');

describe('五类性能测试架构配置', () => {
  test('K6-ARCH-UT-01: smoke/load/stress/spike/soak 五类 profile 文件都存在', () => {
    const expectedProfiles = ['smoke.json', 'load.json', 'stress.json', 'spike.json', 'soak.json'];

    for (const fileName of expectedProfiles) {
      expect(fs.existsSync(path.join(PROFILES_DIR, fileName))).toBe(true);
    }
  });

  test('K6-ARCH-UT-01A: 五类 profile 都满足标准契约', () => {
    const expectedProfiles = ['smoke.json', 'load.json', 'stress.json', 'spike.json', 'soak.json'];

    for (const fileName of expectedProfiles) {
      const profile = loadProfile(fs.readFileSync(path.join(PROFILES_DIR, fileName), 'utf-8'));
      expect(profile.thresholds).toBeDefined();

      if (profile.vus != null) {
        expect(profile.duration).toBeDefined();
      } else {
        expect(Array.isArray(profile.stages)).toBe(true);
        expect(profile.stages.length).toBeGreaterThan(0);
      }
    }
  });

  test('K6-ARCH-UT-02: soak profile 包含 observer 场景设计元数据', () => {
    const soakProfile = loadProfile(fs.readFileSync(path.join(PROFILES_DIR, 'soak.json'), 'utf-8'));

    expect(soakProfile.observer).toEqual(
      expect.objectContaining({
        enabled: true,
        vus: 1,
        exec: 'observeMetrics',
      })
    );
  });

  test('K6-ARCH-UT-03: soak profile 阈值只作用于 load scenario', () => {
    const soakProfile = loadProfile(fs.readFileSync(path.join(PROFILES_DIR, 'soak.json'), 'utf-8'));

    expect(soakProfile.thresholds).toHaveProperty('http_req_duration{scenario:load}');
    expect(soakProfile.thresholds).toHaveProperty('http_req_failed{scenario:load}');
  });

  test('K6-ARCH-UT-04: spike 脚本改为复用统一 profile 配置', () => {
    const content = fs.readFileSync(
      path.join(PROJECT_ROOT, 'tests/performance/spike.k6.js'),
      'utf-8'
    );

    expect(content).toContain("loadProfile('spike')");
    expect(content).not.toContain('export const options = {');
  });

  test('K6-ARCH-UT-05: soak 脚本通过统一 helper 构建多场景 options', () => {
    const soakScript = fs.readFileSync(
      path.join(PROJECT_ROOT, 'tests/performance/soak.k6.js'),
      'utf-8'
    );
    const soakShortScript = fs.readFileSync(
      path.join(PROJECT_ROOT, 'tests/performance/soak-short.k6.js'),
      'utf-8'
    );

    expect(soakScript).toContain("buildScenarioProfile('soak'");
    expect(soakShortScript).toContain("buildScenarioProfile('soak'");
  });
});
