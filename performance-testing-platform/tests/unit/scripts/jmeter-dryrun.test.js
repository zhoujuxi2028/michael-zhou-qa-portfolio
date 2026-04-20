const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SCRIPT = path.join(__dirname, '../../../scripts/jmeter-dryrun.sh');
const PROJECT_DIR = path.join(__dirname, '../../..');

// JTL CSV 文件用于测试解析逻辑
const JTL_HEADER =
  'timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect';

/**
 * 创建临时 JTL 结果文件用于测试 dry-run 解析逻辑
 */
function createTempJtl(rows) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dryrun-test-'));
  const jtlPath = path.join(tmpDir, 'test.jtl');
  const lines = [JTL_HEADER, ...rows];
  fs.writeFileSync(jtlPath, lines.join('\n') + '\n');
  return { tmpDir, jtlPath };
}

/**
 * 创建一行 JTL CSV 数据
 */
function jtlRow(label, responseCode, success) {
  const ts = Date.now();
  return `${ts},45,${label},${responseCode},OK,Thread Group 1-1,text,${success},,1024,512,1,1,http://localhost:3000/health,40,0,5`;
}

describe('JMeter dry-run 脚本测试', () => {
  describe('脚本文件验证', () => {
    test('DRYRUN-UT-01: 脚本文件存在且可执行', () => {
      expect(fs.existsSync(SCRIPT)).toBe(true);
      const stat = fs.statSync(SCRIPT);
      // 检查文件有可执行权限 (owner execute bit)
      const isExecutable = (stat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });

    test('DRYRUN-UT-02: 脚本使用 set -euo pipefail 安全模式', () => {
      const content = fs.readFileSync(SCRIPT, 'utf-8');
      expect(content).toContain('set -euo pipefail');
    });

    test('DRYRUN-UT-03: 脚本使用 bash shebang', () => {
      const content = fs.readFileSync(SCRIPT, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env bash')).toBe(true);
    });
  });

  describe('配置文件验证', () => {
    const dryrunProps = path.join(
      PROJECT_DIR,
      'tests/jmeter/config/dryrun.properties',
    );

    test('DRYRUN-UT-04: dryrun.properties 文件存在', () => {
      expect(fs.existsSync(dryrunProps)).toBe(true);
    });

    test('DRYRUN-UT-05: dryrun.properties 配置 threads=1', () => {
      const content = fs.readFileSync(dryrunProps, 'utf-8');
      expect(content).toMatch(/^threads=1$/m);
    });

    test('DRYRUN-UT-06: dryrun.properties 配置 duration=10', () => {
      const content = fs.readFileSync(dryrunProps, 'utf-8');
      expect(content).toMatch(/^duration=10$/m);
    });

    test('DRYRUN-UT-07: dryrun.properties 配置 rampup=1', () => {
      const content = fs.readFileSync(dryrunProps, 'utf-8');
      expect(content).toMatch(/^rampup=1$/m);
    });
  });

  describe('JTL 解析逻辑验证', () => {
    test('DRYRUN-UT-08: 全部成功的 JTL 解析 — errors 为 0', () => {
      const { tmpDir, jtlPath } = createTempJtl([
        jtlRow('Health Check', '200', 'true'),
        jtlRow('Product List', '200', 'true'),
        jtlRow('Product Detail', '200', 'true'),
      ]);

      try {
        // 使用 awk 模拟脚本中的解析逻辑
        const result = spawnSync(
          'bash',
          [
            '-c',
            `tail -n +2 "${jtlPath}" | awk -F',' '{if ($8 == "false") print}' | wc -l | tr -dc '0-9'`,
          ],
          { encoding: 'utf-8' },
        );
        expect(result.stdout.trim()).toBe('0');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    test('DRYRUN-UT-09: 部分失败的 JTL 解析 — 正确统计错误数', () => {
      const { tmpDir, jtlPath } = createTempJtl([
        jtlRow('Health Check', '200', 'true'),
        jtlRow('Product List', '400', 'false'),
        jtlRow('Product Detail', '500', 'false'),
      ]);

      try {
        const result = spawnSync(
          'bash',
          [
            '-c',
            `tail -n +2 "${jtlPath}" | awk -F',' '{if ($8 == "false") print}' | wc -l | tr -dc '0-9'`,
          ],
          { encoding: 'utf-8' },
        );
        expect(result.stdout.trim()).toBe('2');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    test('DRYRUN-UT-10: 空 JTL（仅表头）— total 为 0', () => {
      const { tmpDir, jtlPath } = createTempJtl([]);

      try {
        const result = spawnSync(
          'bash',
          [
            '-c',
            `tail -n +2 "${jtlPath}" | wc -l | tr -dc '0-9'`,
          ],
          { encoding: 'utf-8' },
        );
        expect(result.stdout.trim()).toBe('0');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    test('DRYRUN-UT-11: 失败请求详情提取 — 显示 label 和 responseCode', () => {
      const { tmpDir, jtlPath } = createTempJtl([
        jtlRow('Health Check', '200', 'true'),
        jtlRow('Create Order', '400', 'false'),
      ]);

      try {
        const result = spawnSync(
          'bash',
          [
            '-c',
            `tail -n +2 "${jtlPath}" | awk -F',' '$8 == "false" {print $3 " → " $4 " (status: " $5 ")"}'`,
          ],
          { encoding: 'utf-8' },
        );
        expect(result.stdout).toContain('Create Order');
        expect(result.stdout).toContain('400');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });

  describe('npm 脚本配置验证', () => {
    test('DRYRUN-UT-12: package.json 包含 jmeter:dryrun 脚本', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf-8'),
      );
      expect(pkg.scripts['jmeter:dryrun']).toBeDefined();
      expect(pkg.scripts['jmeter:dryrun']).toContain('jmeter-dryrun.sh');
      expect(pkg.scripts['jmeter:dryrun']).toContain('smoke.jmx');
    });

    test('DRYRUN-UT-13: package.json 包含 jmeter:dryrun:auth 脚本', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf-8'),
      );
      expect(pkg.scripts['jmeter:dryrun:auth']).toBeDefined();
      expect(pkg.scripts['jmeter:dryrun:auth']).toContain('jmeter-dryrun.sh');
      expect(pkg.scripts['jmeter:dryrun:auth']).toContain('auth-load.jmx');
    });
  });

  describe('脚本内容完整性', () => {
    let scriptContent;

    beforeAll(() => {
      scriptContent = fs.readFileSync(SCRIPT, 'utf-8');
    });

    test('DRYRUN-UT-14: 脚本包含结果文件存在性检查', () => {
      expect(scriptContent).toContain('! -f "$RESULT_FILE"');
    });

    test('DRYRUN-UT-15: 脚本包含 0 请求检查', () => {
      expect(scriptContent).toContain('"$TOTAL" -eq 0');
    });

    test('DRYRUN-UT-16: 脚本包含错误数检查', () => {
      expect(scriptContent).toContain('"$ERRORS" -gt 0');
    });

    test('DRYRUN-UT-17: 脚本成功后清理临时文件', () => {
      expect(scriptContent).toContain('rm -f "$RESULT_FILE"');
    });

    test('DRYRUN-UT-18: 脚本默认使用 smoke.jmx', () => {
      expect(scriptContent).toContain('tests/jmeter/smoke.jmx');
    });
  });
});
