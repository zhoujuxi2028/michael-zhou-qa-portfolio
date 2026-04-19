/**
 * BASE-INT-01~05: 基线管理集成测试
 *
 * 验证性能基线的保存、加载、对比和回归检测完整流程。
 * 跨模块集成：baseline.js + 文件系统 I/O + JSON 序列化
 */
const fs = require('fs');
const path = require('path');
const {
  compareWithBaseline,
  appendTrend,
  loadBaseline,
  saveBaseline,
} = require('../../../src/utils/baseline');

describe('基线管理集成测试 (BASE-INT)', () => {
  const tmpDir = path.join('/tmp', 'baseline-int-test');
  const baselineFile = path.join(tmpDir, 'baseline.json');
  const trendFile = path.join(tmpDir, 'trend.json');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // BASE-INT-01: 首次运行设置基线
  test('BASE-INT-01: 无历史基线时应返回 BASELINE_SET 状态', () => {
    // Arrange
    const current = { p95_ms: 120, error_rate: 0.005, throughput_rps: 50 };

    // Act
    const result = compareWithBaseline(current, null);

    // Assert
    expect(result.status).toBe('BASELINE_SET');
    expect(result.delta).toBe(0);
  });

  // BASE-INT-02: 性能回归检测（>50% delta → FAIL）
  test('BASE-INT-02: p95 回归超过 50% 应标记为 FAIL', () => {
    // Arrange
    const previous = { p95_ms: 100 };
    const current = { p95_ms: 160 }; // 60% 回归

    // Act
    const result = compareWithBaseline(current, previous);

    // Assert
    expect(result.status).toBe('FAIL');
    expect(result.delta).toBeCloseTo(0.6, 1);
  });

  // BASE-INT-03: 性能警告检测（>20% delta → WARNING）
  test('BASE-INT-03: p95 回归 20%~50% 应标记为 WARNING', () => {
    // Arrange
    const previous = { p95_ms: 100 };
    const current = { p95_ms: 130 }; // 30% 回归

    // Act
    const result = compareWithBaseline(current, previous);

    // Assert
    expect(result.status).toBe('WARNING');
    expect(result.delta).toBeCloseTo(0.3, 1);
  });

  // BASE-INT-04: 基线文件保存和加载完整流程
  test('BASE-INT-04: 保存基线后加载应返回一致的数据', () => {
    // Arrange
    const baselineData = {
      p95_ms: 150,
      error_rate: 0.008,
      throughput_rps: 45,
      timestamp: new Date().toISOString(),
    };

    // Act: 保存
    saveBaseline(baselineData, baselineFile);

    // Assert: 文件存在
    expect(fs.existsSync(baselineFile)).toBe(true);

    // Act: 加载
    const loaded = loadBaseline(baselineFile);

    // Assert: 数据一致
    expect(loaded.p95_ms).toBe(150);
    expect(loaded.error_rate).toBe(0.008);
    expect(loaded.throughput_rps).toBe(45);
  });

  // BASE-INT-05: 基线→趋势→对比完整工作流
  test('BASE-INT-05: 完整工作流: 设置基线 → 追加趋势 → 对比检测', () => {
    // Step 1: 设置初始基线
    const baseline = { p95_ms: 100, error_rate: 0.005, throughput_rps: 50 };
    saveBaseline(baseline, baselineFile);

    // Step 2: 追加趋势数据
    for (let i = 1; i <= 3; i++) {
      appendTrend(
        {
          run: i,
          date: new Date().toISOString(),
          p95_ms: 100 + i * 5,
          error_rate: 0.005,
          throughput_rps: 50 - i,
        },
        trendFile
      );
    }

    // Step 3: 验证趋势数据
    const trendData = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    expect(trendData).toHaveLength(3);

    // Step 4: 加载基线并对比最新运行
    const loadedBaseline = loadBaseline(baselineFile);
    const latest = { p95_ms: 115 }; // 15% 回归
    const result = compareWithBaseline(latest, loadedBaseline);
    expect(result.status).toBe('PASS'); // < 20% → PASS
  });
});
