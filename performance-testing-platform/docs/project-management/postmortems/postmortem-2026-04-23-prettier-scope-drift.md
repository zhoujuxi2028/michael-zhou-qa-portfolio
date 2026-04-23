# Postmortem — 2026-04-23 Prettier 检查范围漂移事件

> **事件时间**: 2026-04-23 03:44 UTC  
> **影响范围**: `Performance Testing CI` → `Performance Testing / Code Quality`  
> **严重级别**: P2 — 阻断 PR 合并的 CI 失败  
> **恢复时间**: 同日修复

---

## 1. 事件摘要

PR 集成时，`Performance Testing / Code Quality` job 失败，错误日志显示：

```text
[warn] tests/performance/helpers/profile.js
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
Error: Process completed with exit code 1.
```

问题表面上是 `tests/performance/helpers/profile.js` 的格式问题，  
但进一步分析发现，真正的流程缺陷是：

> 本地 `npm run format:check` 没有覆盖 `tests/performance/**/*.js`，而 CI 覆盖了。

因此开发者在本地得到“通过”结果，PR 合并时才在 CI 暴露问题。

---

## 2. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-23 03:44:23 | `Performance Testing / Code Quality` 开始执行 Prettier 检查 |
| 2026-04-23 03:44:25 | CI 报告 `tests/performance/helpers/profile.js` 格式失败并退出 |
| 2026-04-23 03:51 | 用户上报“集成时继续出现异常” |
| 2026-04-23 | 通过 GitHub Actions logs + 本地脚本比对定位为“检查范围漂移” |
| 2026-04-23 | 修复 `package.json` 格式命令范围，新增回归测试与 RCA / postmortem 文档 |

---

## 3. 处置过程

### 已执行分析

1. 使用 GitHub Actions run / job logs 确认失败点在：
   - Workflow run: `24810638937`
   - Job: `72628986832`
   - Step: `Run npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'`
2. 本地检查 `performance-testing-platform/package.json`
3. 对比 CI 与本地格式命令
4. 识别出 `tests/performance/**/*.js` 被 CI 覆盖，但未被本地脚本覆盖

### 已执行修复

- 统一 `package.json` 的 `format` / `format:check` 到 `tests/**/*.js`
- 新增 `tests/unit/scripts/format-scope.test.js`
- 补充本 RCA 与 postmortem 文档

---

## 4. 用户影响

| 维度 | 影响 |
|------|------|
| 开发效率 | 本地检查结论不可信，增加一次 CI 失败往返 |
| PR 周期 | 被 `Code Quality` job 阻塞，无法进入后续 unit/smoke jobs |
| 代码质量 | 实际代码质量无功能性损坏，但质量门禁体验恶化 |

---

## 5. 做得好的地方

- CI 的 Prettier 检查范围更严格，最终拦住了问题进入主线
- GitHub Actions logs 足够明确，能快速定位到具体文件和 step
- 当前项目已有完整 lint/test/format 流程，修复后验证成本低

---

## 6. 做得不好的地方

- 本地与 CI 的格式检查范围没有保持单一真源
- 新增 `tests/performance/` 后，没有同步回看本地工具链 glob
- 缺少专门的契约测试来检查 package script 与 workflow command 是否一致

---

## 7. 行动项

| Action | 类型 | 状态 |
|--------|------|------|
| 将 `package.json` 的 `format` / `format:check` 扩展到 `tests/**/*.js` | 修复 | ✅ |
| 增加 `format-scope.test.js` 检查本地脚本与 CI 命令一致性 | 预防 | ✅ |
| 将本事件沉淀为 RCA + postmortem 文档 | 文档 | ✅ |

---

## 8. 后续防线

后续新增测试目录或脚本目录时，必须同步检查以下三项：

1. `package.json` 的本地执行命令
2. `.github/workflows/*.yml` 的 CI 命令
3. 回归测试是否覆盖本地/CI 范围一致性

**规则**：只要 CI 的门禁命令变更，就必须同步更新本地等价命令或新增一致性测试。
