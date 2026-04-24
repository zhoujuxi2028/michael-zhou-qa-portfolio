/**
 * ci-lint.js — CI 工作流目录卫生检查
 *
 * 预防 ISS-019: CI job 中若有步骤向子目录写入文件，
 * 必须在同一 job 内有前置 `mkdir -p <dir>` 步骤。
 *
 * 背景（RCA）:
 *   PR #135 (ffb5a3b) 添加 `k6 run --out json=reports/k6-smoke-summary.json`
 *   时遗漏了 `mkdir -p reports`。由于 reports/ 目录被 git 追踪，
 *   CI checkout 自动恢复了目录，Bug 被掩盖约 3 天（runs 197-212）。
 *   PR #161 修复了 k6 job，但 baseline-compare / trend-collect job 同样需要防守。
 *
 * 使用方式:
 *   node scripts/analysis/ci-lint.js                    # 检查所有 workflow
 *   node scripts/analysis/ci-lint.js path/to/wf.yml     # 检查指定文件
 *   const { lintJobSteps } = require('./ci-lint');  # unit tests
 *
 * 退出码:
 *   0 — 全部通过
 *   1 — 发现违规
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── 需要检测的输出目录模式 ────────────────────────────────────────────────────

/**
 * 每条规则描述"何种命令向哪个参数写入文件"
 * pattern: RegExp  匹配整行命令
 * dirGroup: number  捕获组索引，提取输出目录
 */
const OUTPUT_PATTERNS = [
  // k6 --out json=dir/file.json
  { pattern: /\bk6\b.*--out\s+json=([^/\s]+)\/[^\s]+/, dirGroup: 1 },
  // k6 --out 'web-dashboard=export=dir/file.html'
  { pattern: /\bk6\b.*--out\s+['"]?web-dashboard=export=([^/'">\s]+)\/[^\s'"]+/, dirGroup: 1 },
  // JMeter -l dir/file.jtl
  { pattern: /\bjmeter\b.*\s-l\s+([^/\s]+)\/[^\s]+/, dirGroup: 1 },
  // gh run download -D dir/
  { pattern: /gh\s+run\s+download\b.*\s-D\s+([^/\s]+)\/?/, dirGroup: 1 },
  // shell redirect: cmd > dir/file  或 cmd >> dir/file (含行首重定向和 >> append)
  // 使用 (?:^|[\s|]) 允许行首或管道符后的重定向
  { pattern: /(?:^|[\s|])\s*>>?\s*([a-zA-Z0-9_.-]+)\/[^\s"'`]+/, dirGroup: 1 },
  // pytest --output-dir dir/
  { pattern: /--output-dir\s+([^/\s]+)\//, dirGroup: 1 },
  // tool --output subdir/file (子目录写入，使用 (?:^|\s) 支持行首)
  { pattern: /(?:^|\s)--output\s+([a-zA-Z0-9_.-]+)\/[^\s"'`]+/, dirGroup: 1 },
];

// ─── 核心函数 ─────────────────────────────────────────────────────────────────

/**
 * 检查一个 job 的 steps 列表，返回所有违规描述。
 *
 * @param {Array<{name?: string, run?: string, uses?: string}>} steps
 * @returns {string[]} 错误信息数组（空数组表示通过）
 */
function lintJobSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return [];

  // 收集所有 run 命令（把多步骤的所有行合并，保留顺序）
  // 结构: [{ stepIndex, lineText }]
  const allLines = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s.run !== 'string') continue;
    const lines = s.run.split('\n');
    for (const line of lines) {
      allLines.push({ stepIndex: i, line: line.trim() });
    }
  }

  // 提取已经被 mkdir 覆盖的目录集合
  // 支持: `mkdir -p dir1 dir2`, `mkdir -pm 755 dir`, `mkdir --parents dir/`
  const mkdirDirs = new Set();
  for (const { line } of allLines) {
    // 匹配 mkdir（带任意 flag 组合），提取目录参数部分
    // flag 必须以 - 开头（如 -p, -m, -pm），目录名不以 - 开头，避免贪婪吞噬目录名
    const mkdirMatch = line.match(/^mkdir\s+((?:-[a-zA-Z0-9]+\s+)*(?:\d+\s+)*)(.+)/);
    if (!mkdirMatch) continue;
    // mkdirMatch[2] 是目录参数（可能有多个）
    const parts = mkdirMatch[2].split(/\s+/);
    for (const part of parts) {
      // 去掉尾部斜杠，取第一层目录名
      const top = part.replace(/\/$/, '').split('/')[0];
      if (top) mkdirDirs.add(top);
    }
  }

  // 检查每个输出命令，看对应目录是否已被 mkdir 覆盖
  const errors = [];
  const seenMissingDirs = new Set(); // 避免同一目录重复报错

  for (const { stepIndex, line } of allLines) {
    for (const rule of OUTPUT_PATTERNS) {
      const m = line.match(rule.pattern);
      if (!m) continue;

      const outputDir = m[rule.dirGroup];
      if (!outputDir) continue;
      const topDir = outputDir.split('/')[0]; // 只需要第一层目录

      if (!mkdirDirs.has(topDir) && !seenMissingDirs.has(topDir)) {
        seenMissingDirs.add(topDir);
        errors.push(
          `Step[${stepIndex}] "${steps[stepIndex].name || 'unnamed'}": ` +
            `写入 "${topDir}/" 但未找到前置 \`mkdir -p ${topDir}\` — ` +
            `请在该 job 内添加: mkdir -p ${topDir}`
        );
      }
    }
  }

  return errors;
}

// ─── YAML 解析（轻量，不依赖 yaml 库）──────────────────────────────────────────

/**
 * 从 workflow YAML 文本中提取所有 job 的 steps（使用简单的行解析）。
 * 仅处理 `run:` 和 `uses:` 字段，足够满足目录检查需求。
 *
 * 注意: 这是一个轻量解析器，专门针对 GitHub Actions YAML 格式。
 * 不依赖 js-yaml 等外部库，保持零额外依赖。
 *
 * @param {string} yamlText
 * @returns {Array<{jobName: string, steps: Array<{name?: string, run?: string}>}>}
 */
function parseWorkflowJobs(yamlText) {
  const lines = yamlText.split('\n');
  const jobs = [];
  let currentJob = null;
  let currentStep = null;
  let inRunBlock = false;
  let runIndent = 0;
  let runLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trimEnd();
    const indent = rawLine.length - rawLine.trimStart().length;

    // 检测 jobs: 块下的新 job（indent=2，非空，非 jobs: 本身）
    if (indent === 2 && /^\s{2}\w[\w-]*:/.test(rawLine) && !/^\s+#/.test(rawLine)) {
      // 如果不在 jobs: 块下，跳过（如 on:, name:, defaults: 等顶级 key）
      // 简单判断：jobs 块通常在解析到 jobs: 之后
      const key = trimmed.replace(/:.*/, '');
      // 完成前一个 job
      if (currentJob) {
        if (currentStep) {
          if (inRunBlock) currentStep.run = runLines.join('\n');
          currentJob.steps.push(currentStep);
        }
        jobs.push(currentJob);
      }
      currentJob = { jobName: key, steps: [] };
      currentStep = null;
      inRunBlock = false;
      runLines = [];
      continue;
    }

    if (!currentJob) continue;

    // 检测 steps 下的新 step（- name: 或 - run: 或 - uses:）
    if (/^\s+- (name|run|uses):/.test(rawLine)) {
      // 保存前一个 step
      if (currentStep) {
        if (inRunBlock) currentStep.run = runLines.join('\n');
        currentJob.steps.push(currentStep);
      }
      currentStep = {};
      inRunBlock = false;
      runLines = [];

      const nameMatch = rawLine.match(/- name:\s*(.+)/);
      const usesMatch = rawLine.match(/- uses:\s*(.+)/);
      const runMatch = rawLine.match(/- run:\s*(.+)/);

      if (nameMatch) currentStep.name = nameMatch[1].trim();
      if (usesMatch) currentStep.uses = usesMatch[1].trim();
      if (runMatch) {
        // 单行 run
        const val = runMatch[1].trim();
        if (val === '|') {
          inRunBlock = true;
          runIndent = indent + 2;
          runLines = [];
        } else {
          currentStep.run = val;
        }
      }
      continue;
    }

    if (!currentStep) continue;

    // 在 step 内继续解析字段
    if (/^\s+(name|uses|run):\s+/.test(rawLine) && !inRunBlock) {
      const nameMatch = rawLine.match(/name:\s*(.+)/);
      const usesMatch = rawLine.match(/uses:\s*(.+)/);
      const runMatch = rawLine.match(/run:\s*(.+)/);

      if (nameMatch) currentStep.name = nameMatch[1].trim();
      if (usesMatch) currentStep.uses = usesMatch[1].trim();
      if (runMatch) {
        const val = runMatch[1].trim();
        if (val === '|') {
          inRunBlock = true;
          runIndent = indent + 2;
          runLines = [];
        } else {
          currentStep.run = val;
        }
      }
      continue;
    }

    // 收集多行 run 块的内容
    if (inRunBlock) {
      if (indent >= runIndent || trimmed === '') {
        runLines.push(trimmed);
      } else {
        // 退出 run 块
        currentStep.run = runLines.join('\n');
        inRunBlock = false;
      }
    }
  }

  // 保存最后一个 job/step
  if (currentJob) {
    if (currentStep) {
      if (inRunBlock) currentStep.run = runLines.join('\n');
      currentJob.steps.push(currentStep);
    }
    jobs.push(currentJob);
  }

  return jobs;
}

/**
 * 检查单个 workflow YAML 文件。
 * @param {string} filePath - 文件路径
 * @returns {{file: string, violations: Array<{job: string, errors: string[]}>}}
 */
function lintWorkflowFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const jobs = parseWorkflowJobs(content);
  const violations = [];

  for (const { jobName, steps } of jobs) {
    const errors = lintJobSteps(steps);
    if (errors.length > 0) {
      violations.push({ job: jobName, errors });
    }
  }

  return { file: filePath, violations };
}

// ─── CLI 入口 ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  const workflowsDir = path.resolve(__dirname, '../../.github/workflows');
  const args = process.argv.slice(2);

  let filesToCheck;
  if (args.length > 0) {
    filesToCheck = args.map((f) => path.resolve(f));
  } else {
    if (!fs.existsSync(workflowsDir)) {
      console.error(`Workflows 目录不存在: ${workflowsDir}`);
      process.exit(1);
    }
    filesToCheck = fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map((f) => path.join(workflowsDir, f));
  }

  let totalViolations = 0;

  for (const file of filesToCheck) {
    const { violations } = lintWorkflowFile(file);
    if (violations.length > 0) {
      console.error(`\n❌ ${path.basename(file)}`);
      for (const { job, errors } of violations) {
        console.error(`  Job: ${job}`);
        for (const e of errors) {
          console.error(`    → ${e}`);
          totalViolations++;
        }
      }
    } else {
      console.log(`✅ ${path.basename(file)}`);
    }
  }

  if (totalViolations > 0) {
    console.error(`\n共发现 ${totalViolations} 处 CI 输出目录卫生问题（ISS-019）`);
    console.error('修复方法: 在写入子目录文件的步骤前添加 mkdir -p <目录名>');
    process.exit(1);
  } else {
    console.log('\n✅ 所有 workflow 通过 CI 目录卫生检查');
  }
}

module.exports = { lintJobSteps, parseWorkflowJobs, lintWorkflowFile };
