# Postmortem — PR #184 Performance CI 格式检查失败

> **事件时间**: 2026-04-23 00:56 UTC  
> **影响范围**: PR #184 的 `Performance Testing CI`（run #24810638937 / job #72614719599）  
> **严重级别**: P3 — CI 阻断合并，但无生产运行时风险  
> **解决状态**: ✅ 已修复

---

## 1. 事件摘要

PR #184 新增了 `performance-testing-platform/tests/performance/helpers/profile.js` 中的 observer 场景组装逻辑。  
`Performance Testing / Code Quality` job 执行 Prettier 时失败：

```text
Checking formatting...
[warn] tests/performance/helpers/profile.js
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
Error: Process completed with exit code 1.
```

本地 `npm run format:check` 没有报错，导致开发阶段未能提前发现，最终在 CI 中暴露。

---

## 2. 根本原因分析 (RCA)

### 直接原因

`tests/performance/helpers/profile.js` 新增 import 语句未经过 Prettier 格式化，和仓库当前 Prettier 规则不一致。

### 根因链

```text
新增 k6 helper 代码
    → 开发者未执行覆盖 tests/performance 的本地格式检查
        → profile.js 保留了未格式化的多行 import
            → CI 使用 tests/**/*.js 做全量 Prettier 检查
                → Performance Testing / Code Quality 失败
```

### 为什么本地没有提前发现

| 因素 | 说明 |
|------|------|
| 脚本覆盖不一致 | `performance-testing-platform/package.json` 中的 `format` / `format:check` 只覆盖 `tests/unit` 和 `tests/integration`，遗漏 `tests/performance` |
| 文档提示不完整 | `performance-testing-platform/CLAUDE.md` 的提交前检查没有要求执行 `npm run format:check` |
| CI 覆盖更严格 | workflow 使用 `npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'`，范围大于本地脚本 |

---

## 3. 修复方案

### 代码修复

1. 对 `tests/performance/helpers/profile.js` 应用 Prettier 兼容格式。
2. 将 `performance-testing-platform/package.json` 中的 `format` / `format:check` 范围统一为：

```json
"prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'"
```

### 流程修复

1. 在 `performance-testing-platform/CLAUDE.md` 的提交前检查中加入 `npm run format:check`。
2. 将本地格式检查范围与 CI 完全对齐，消除“本地绿 / CI 红”的脚本漂移。

---

## 4. 验证方式

修复后执行以下验证：

```bash
cd performance-testing-platform
npm run format:check
npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'
npm run lint
npm test -- --runInBand
```

预期结果：

- `npm run format:check` 现在能覆盖 `tests/performance/**/*.js`
- 本地脚本与 CI 的 Prettier 检查结果一致
- lint / test 全部通过

---

## 5. 改进措施 & 防御机制

| 措施 | 类型 | 状态 |
|------|------|------|
| 统一 `format` / `format:check` 与 CI 的 glob 范围 | 自动化防御 | ✅ 本次修复 |
| 在项目 `CLAUDE.md` 中要求提交前执行 `npm run format:check` | 流程防御 | ✅ 本次修复 |
| 后续新增测试目录时，必须同步检查 `lint` / `format` / CI 脚本 glob 是否一致 | Checklist | 📌 持续执行 |

---

## 6. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-23 00:55 | PR #184 触发 `Performance Testing CI` |
| 2026-04-23 00:56 | `Performance Testing / Code Quality` job 开始执行 |
| 2026-04-23 00:57 | Prettier 报告 `tests/performance/helpers/profile.js` 格式不符合规范 |
| 2026-04-23 01:xx | 本地复现确认：CI 命令失败，但 `npm run format:check` 误报通过 |
| 2026-04-23 01:xx | 修复格式、对齐脚本 glob、补充 postmortem |

---

## 7. 经验教训 (Lessons Learned)

> **ISS-PR184-FMT-01**: 本地质量门禁脚本必须与 CI 使用同一组 glob；任何目录覆盖差异都会制造“本地通过、CI 失败”的假象。

**新增检查点**：

| Check | Why |
|-------|-----|
| 新增目录或测试类型后，立即对照 `package.json` 与 workflow 的 glob 配置 | 防止本地脚本遗漏检查范围 |
| 提交前执行 `npm run format:check` | 让格式问题在本地暴露，而不是在 CI 暴露 |
