/**
 * commitlint 配置（对应 Gap 分析 G-12）
 *
 * 在 @commitlint/config-conventional 基础上，加入项目约束：
 *   - type-enum 补齐 ci/perf/build/revert（conventional 默认已涵盖）
 *   - header-max-length 限制为 72
 *   - subject-full-stop 禁止末尾 `.`
 *   - body-leading-blank 强制 subject 与 body 之间空行
 *   - body-max-line-length 100（warning，不阻断）
 *
 * CI 兜底：.github/workflows/commit-guard.yml 会在 PR 上复检；
 *          即使本地使用 --no-verify 绕过，CI 仍会拦截。
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'ci',
        'perf',
        'build',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
    'subject-full-stop': [2, 'never', '.'],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [1, 'always', 100],
    'footer-leading-blank': [1, 'always'],
  },
  // 保留与 hook 同步的 ignore 规则（merge / fixup / squash）
  ignores: [
    (message) => /^Merge /.test(message),
    (message) => /^Revert "/.test(message),
    (message) => /^(fixup|squash|amend)! /.test(message),
  ],
};
