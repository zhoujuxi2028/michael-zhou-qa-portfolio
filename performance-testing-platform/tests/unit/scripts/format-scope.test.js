'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, '../../../package.json');
const PERFORMANCE_CI = path.join(__dirname, '../../../../.github/workflows/performance-ci.yml');

function readPackageScripts() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8')).scripts;
}

function extractPrettierCheckCommand(workflowContent) {
  const match = workflowContent.match(/npx prettier --check '[^']+' '[^']+' '[^']+'/);
  return match ? match[0] : null;
}

function normalizeCommand(command) {
  return command ? command.replace(/^npx\s+/, '') : command;
}

describe('格式检查范围一致性', () => {
  test('UT-FMT-SCOPE-01: package.json 的 format:check 与 performance-ci.yml 保持一致', () => {
    const scripts = readPackageScripts();
    const workflowContent = fs.readFileSync(PERFORMANCE_CI, 'utf-8');
    const workflowCommand = extractPrettierCheckCommand(workflowContent);

    expect(normalizeCommand(workflowCommand)).toBe(normalizeCommand(scripts['format:check']));
  });

  test('UT-FMT-SCOPE-02: 本地 format 命令覆盖 tests/performance/**/*.js', () => {
    const scripts = readPackageScripts();

    expect(scripts.format).toContain("'tests/**/*.js'");
  });

  test('UT-FMT-SCOPE-03: 本地 format:check 命令覆盖 tests/performance/**/*.js', () => {
    const scripts = readPackageScripts();

    expect(scripts['format:check']).toContain("'tests/**/*.js'");
  });
});
