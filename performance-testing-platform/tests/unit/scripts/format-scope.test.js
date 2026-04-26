'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, '../../../package.json');
const PERFORMANCE_CI = path.join(__dirname, '../../../../.github/workflows/performance-ci.yml');

function readPackageScripts() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8')).scripts;
}

function normalizeCommand(command) {
  return command ? command.replace(/^npx\s+/, '') : command;
}

function extractWorkflowRunCommand(workflowContent, command) {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 同时匹配两种 workflow 写法：
  //   1) 单行 step：`- run: npm run format:check`
  //   2) 多行 `run: |` 块内独占一行的命令（前导空白 + 命令 + 行尾）
  // PR #224 将 lint / format:check 合并到一个多行 Code Style step，故必须支持第 2 种。
  const regex = new RegExp(`(?:^|\\n)\\s*(?:- run:\\s+)?${escaped}\\s*(?:\\n|$)`);
  const match = workflowContent.match(regex);
  if (!match) return null;
  return match[0].replace(/^[\s\n]*(?:- run:\s+)?/, '').replace(/\s*$/, '');
}

describe('格式检查范围一致性', () => {
  test('UT-FMT-SCOPE-01: performance-ci.yml 必须通过 npm script 间接调用 format:check', () => {
    const workflowContent = fs.readFileSync(PERFORMANCE_CI, 'utf-8');
    const workflowCommand = extractWorkflowRunCommand(workflowContent, 'npm run format:check');

    expect(workflowCommand).toBe('npm run format:check');
  });

  test('UT-FMT-SCOPE-02: package.json 的 format:check 与 workflow 使用的 npm script 保持一致', () => {
    const scripts = readPackageScripts();
    const workflowContent = fs.readFileSync(PERFORMANCE_CI, 'utf-8');
    const workflowCommand = extractWorkflowRunCommand(workflowContent, 'npm run format:check');

    expect(workflowCommand).toBe('npm run format:check');
    expect(normalizeCommand(scripts['format:check'])).toBe(
      "prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'"
    );
  });

  test('UT-FMT-SCOPE-03: 本地 format 命令覆盖 tests/performance/**/*.js', () => {
    const scripts = readPackageScripts();

    expect(scripts.format).toContain("'tests/**/*.js'");
  });

  test('UT-FMT-SCOPE-04: 本地 format:check 命令覆盖 tests/performance/**/*.js', () => {
    const scripts = readPackageScripts();

    expect(scripts['format:check']).toContain("'tests/**/*.js'");
  });
});
