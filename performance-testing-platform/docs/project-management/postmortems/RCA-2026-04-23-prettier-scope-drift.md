# RCA-2026-04-23 — Prettier 检查范围漂移导致 CI 假绿本地真漏检

**类型**: 根本原因分析 (Root Cause Analysis)  
**严重程度**: P2（CI 阻塞，影响合并效率）  
**状态**: ✅ 已修复 + 已补充预防措施

---

## 1. 问题摘要

`Performance Testing / Code Quality` job 在 GitHub Actions 中执行：

```bash
npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'
```

失败文件为：

```text
tests/performance/helpers/profile.js
```

但本地执行 `npm run format:check` 时未报错，导致开发阶段误以为格式检查已通过。

---

## 2. 直接原因

本地与 CI 的 Prettier 检查范围不一致：

| 位置 | 命令 |
|------|------|
| CI (`performance-ci.yml`) | `npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'` |
| 本地 (`package.json`) | `prettier --check 'src/**/*.js' 'tests/unit/**/*.js' 'tests/integration/**/*.js' 'scripts/**/*.js'` |

`tests/performance/**/*.js` 被 CI 检查，但未被本地 `format:check` 覆盖，因此形成范围漂移。

---

## 3. 根本原因（5 Why）

| 层级 | 问题 | 原因 |
|------|------|------|
| Why 1 | 为什么 CI 报 Prettier 失败？ | `tests/performance/helpers/profile.js` 不符合格式要求 |
| Why 2 | 为什么本地没发现？ | `npm run format:check` 没有扫描 `tests/performance/**/*.js` |
| Why 3 | 为什么范围不一致？ | `package.json` 仍保留早期只覆盖 `tests/unit` + `tests/integration` 的旧命令 |
| Why 4 | 为什么改动后没有同步？ | 新增 `tests/performance` 资产时，只更新了 workflow，没有同步本地脚本契约 |
| Why 5 | 为什么 code review / 测试没拦住？ | 缺少“本地脚本与 CI 命令一致性”自动化回归测试 |

**根本原因**: 本地开发脚本与 CI 工作流之间缺少单一真源和一致性校验，导致格式检查范围发生漂移。

---

## 4. 影响评估

| 项目 | 影响 |
|------|------|
| 直接影响 | PR 无法通过 `Performance Testing / Code Quality` |
| 间接影响 | 开发者本地验证结果失真，增加返工与等待 CI 时间 |
| 影响范围 | `performance-testing-platform` 中所有位于 `tests/performance/**/*.js` 的 JS 文件 |

---

## 5. 修复措施

### 5.1 直接修复

将 `performance-testing-platform/package.json` 中的格式命令统一为：

```json
"format": "prettier --write 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'",
"format:check": "prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'"
```

### 5.2 预防措施

新增回归测试：

```text
tests/unit/scripts/format-scope.test.js
```

覆盖以下契约：

1. `package.json` 的 `format:check` 必须与 `performance-ci.yml` 中的 Prettier 命令一致
2. `format` 必须覆盖 `tests/**/*.js`
3. `format:check` 必须覆盖 `tests/**/*.js`

---

## 6. 验证结果

本次修复后已执行：

```bash
cd /home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform
npm run lint
npm test
npm run format:check
```

结果：全部通过。

---

## 7. Lessons Learned

1. **本地脚本与 CI 不能各自演进**：任何 workflow 中的质量门禁命令，都应在 `package.json` 中有对等入口
2. **范围漂移属于隐性缺陷**：不会立刻导致代码报错，但会造成“本地绿 / CI 红”的高摩擦体验
3. **新增目录时必须回看工具链覆盖面**：新增 `tests/performance/` 后，不仅是测试要补，lint / format / coverage 的 glob 也要同步检查

---

## 8. 关联文件

- `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/.github/workflows/performance-ci.yml`
- `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/package.json`
- `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/tests/unit/scripts/format-scope.test.js`
