/**
 * Coverage configuration tests — CI/CD Phase 7
 *
 * Test IDs:
 * - CI-COV-01: jest.config.js 阈值符合企业标准（branches/functions/lines/statements >= 80%）
 * - CI-COV-02: collectCoverageFrom 包含 src/ 和 scripts/analysis/，排除 server.js
 * - CI-COV-03: 覆盖率报告输出格式包含 lcov 和 json-summary（CI 消费格式）
 * - CI-COV-04: coverage/ 目录已在 .gitignore 中，不提交产物
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const jestConfig = require('../../../jest.config.js');

describe('Coverage Configuration (Phase 7)', () => {
  // CI-COV-01
  test('CI-COV-01: all threshold dimensions >= 80%', () => {
    const threshold = jestConfig.coverageThreshold?.global;
    expect(threshold).toBeDefined();
    expect(threshold.branches).toBeGreaterThanOrEqual(80);
    expect(threshold.functions).toBeGreaterThanOrEqual(80);
    expect(threshold.lines).toBeGreaterThanOrEqual(80);
    expect(threshold.statements).toBeGreaterThanOrEqual(80);
  });

  // CI-COV-02
  test('CI-COV-02: collectCoverageFrom includes src/ and scripts/analysis/, excludes server.js', () => {
    const patterns = jestConfig.collectCoverageFrom;
    expect(patterns).toBeDefined();
    expect(patterns).toContain('src/**/*.js');
    expect(patterns).toContain('scripts/analysis/**/*.js');
    expect(patterns).toContain('!src/server.js');
  });

  // CI-COV-02b: scripts/analysis source files actually exist on disk
  test('CI-COV-02b: scripts/analysis/*.js source files exist', () => {
    const analysisDir = path.join(ROOT, 'scripts/analysis');
    const files = fs.readdirSync(analysisDir).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);
    files.forEach((file) => {
      expect(fs.existsSync(path.join(analysisDir, file))).toBe(true);
    });
  });

  // CI-COV-03
  test('CI-COV-03: coverageReporters includes lcov and json-summary', () => {
    const reporters = jestConfig.coverageReporters;
    expect(reporters).toBeDefined();
    expect(reporters).toContain('lcov');
    expect(reporters).toContain('json-summary');
  });

  // CI-COV-04
  test('CI-COV-04: coverage/ is listed in .gitignore', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    const lines = gitignore.split('\n').map((l) => l.trim());
    expect(lines.some((l) => l === 'coverage' || l === 'coverage/')).toBe(true);
  });
});
