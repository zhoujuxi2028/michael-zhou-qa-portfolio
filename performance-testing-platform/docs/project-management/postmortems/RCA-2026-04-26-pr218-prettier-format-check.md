# RCA: PR #218 Prettier Format Check 漏检

- **日期**: 2026-04-26
- **关联**: [PR #218](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/218) · run [24954181318](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/24954181318)
- **失败 Job**: `Performance Testing / Code Quality` → `npm run format:check` exit 1
- **影响**: PR #218 CI 红灯，需追加格式 fix 提交才能合入

## 时间线

| 时间 (UTC) | 事件 |
|------------|------|
| 04-26 10:15 | PR #218 推送 `dbfceeb`，CI 触发 |
| 04-26 10:15:28 | `prettier --check` 报错 `tests/unit/scripts/grafana-sqlite-lock.test.js` |
| 04-26 10:18 | RCA 完成；定位为单行超长（109 chars > printWidth 100） |

## 根因

### 直接原因
新增测试文件第 34 行单行长度 109 字符，超过 `.prettierrc` 配置的 `printWidth: 100`：
```js
expect(script).not.toContain(`wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 60`);
```

### 一线原因
本地 `.husky/pre-commit` 钩子已尝试对 staged JS 跑 `prettier --check`，但 pathspec 使用单层 glob：
```sh
git diff --cached --name-only -- 'performance-testing-platform/tests/*.js'   # 只匹配单层
```
新增文件路径为 `tests/unit/scripts/grafana-sqlite-lock.test.js`（嵌套两层），未被 pathspec 命中，钩子静默放过。

### 二线原因
- `performance-ci.yml` 中 `lint` 与 `format:check` 是两个独立 step，GitHub Actions 默认遇错即停 → 若 lint 失败则 format:check 不再跑，反之亦然。无法一次拿到所有 Code Style 全貌。
- 长期建议 `printWidth: 100` 早已实现（`.prettierrc` 历史配置），但即便如此 109 char 仍超限 — 说明根本对策必须是**自动化拦截**而非靠规则放宽。

## 修复

| 类别 | 项 | 状态 |
|------|----|------|
| 短期 | PR #218 文件由作者重新 `prettier --write` 后提交 | 由 PR 作者完成 |
| 中期-1 | `.husky/pre-commit` pathspec 改为 `**/*.js` 递归匹配 | ✅ 本次提交 |
| 中期-2 | `performance-ci.yml` 合并 lint + format:check 为单 step "Code Style"，收集双状态后退出 | ✅ 本次提交 |
| 长期 | `printWidth: 100` 已生效；ESLint 无 `max-len` → 无需对齐 | ✅ 已确认无需改动 |

## 预防措施

1. **本地拦截**：嵌套目录的新增 JS 文件现在会被 pre-commit 钩子覆盖。
2. **CI 双信号**：`Code Style` step 同时运行 ESLint 和 Prettier，红灯时一次性暴露所有问题。
3. **跨 PR Postmortem 提醒**：建议在 PR #218 评论区追加 "Postmortem: missing prettier check → see [RCA-2026-04-26]"。

## 参考
- 原始 CI 日志: run 24954181318 / job 73069452214
- 改动文件: `.husky/pre-commit`, `.github/workflows/performance-ci.yml`
