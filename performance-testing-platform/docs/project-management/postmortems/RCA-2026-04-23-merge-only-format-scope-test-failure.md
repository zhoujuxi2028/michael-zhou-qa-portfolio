# RCA-2026-04-23 — merge ref 下 `format-scope` 回归测试脆弱导致 CI 单测失败

**类型**: 根本原因分析 (Root Cause Analysis)  
**严重程度**: P2（阻塞 PR 合并）  
**状态**: ✅ 已修复

---

## 1. 问题摘要

PR #184 合并校验时，`Performance Testing / Unit Tests` 失败：

- Workflow run: `24815813752`
- Job: `72631387363`
- 失败命令：`npm run test:coverage`

实际失败用例：

```text
FAIL tests/unit/scripts/format-scope.test.js
Received: null
```

失败并不是业务代码问题，而是新增的回归测试 `format-scope.test.js` 对 workflow 命令写法做了**过度严格假设**。

---

## 2. 直接原因

测试假设 `.github/workflows/performance-ci.yml` 中必须出现：

```yaml
- run: npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'
```

但 PR merge ref 实际采用的是主线最新 workflow：

```yaml
- run: npm run format:check
```

因此测试中的正则无法匹配，返回 `null`，导致单元测试失败。

---

## 3. 根本原因（5 Why）

| 层级 | 问题 | 原因 |
|------|------|------|
| Why 1 | 为什么单元测试失败？ | 测试从 workflow 中提取 Prettier 命令时得到 `null` |
| Why 2 | 为什么得到 `null`？ | 正则只支持 `npx prettier --check ...` 直写形式 |
| Why 3 | 为什么 merge 时才暴露？ | PR merge ref 使用了 base branch 上更新后的 workflow：`npm run format:check` |
| Why 4 | 为什么本地没暴露？ | 当前工作分支里的 workflow 仍是旧写法，本地测试只看到了分支文件 |
| Why 5 | 为什么会形成 merge-only failure？ | 回归测试与 workflow 实现细节耦合过深，且分支没有及时同步主线 workflow 改动 |

**根本原因**: 回归测试依赖了 workflow 的具体命令文本，而不是依赖稳定契约（`npm script` 入口），叠加分支与主线 workflow 漂移，导致只在 merge ref 下失败。

---

## 4. 修复措施

### 4.1 测试修复

更新 `tests/unit/scripts/format-scope.test.js`：

- 不再强依赖 `npx prettier --check ...` 的直写文本
- 改为校验 workflow 通过稳定入口 `npm run format:check` 调用格式检查
- 同时断言 `package.json` 中 `format:check` 仍覆盖 `tests/**/*.js`

### 4.2 工作流同步

更新 `.github/workflows/performance-ci.yml`：

- `npm run lint`
- `npm run format:check`
- `npm run test:coverage`

使当前分支 workflow 与主线 merge ref 保持一致，降低再次出现 merge-only failure 的概率。

---

## 5. 验证结果

修复后已执行：

```bash
cd /home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform
npm run lint
npm run format:check
npm run test:coverage
npm test
```

结果：全部通过。

---

## 6. 预防措施

1. **回归测试优先校验稳定契约，不校验实现细节文本**
   - 优先检查 `npm script` 名称
   - 避免把 workflow 某一行 shell 命令写死为唯一合法形式

2. **涉及 workflow 契约的测试，必须考虑 merge ref 行为**
   - 本地分支文件不一定等于 PR 实际执行的 merge ref
   - 设计测试时要考虑 base branch 可能已更新 workflow

3. **质量门禁命令统一走 package.json script**
   - 减少 workflow 与本地脚本双份维护
   - 降低文本漂移带来的误报

---

## 7. 关联文件

- `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/.github/workflows/performance-ci.yml`
- `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/tests/unit/scripts/format-scope.test.js`
- `/home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/package.json`
