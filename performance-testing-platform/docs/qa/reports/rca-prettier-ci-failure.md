# RCA 分析：PR #157 连续 CI 失败 (ISS-016, ISS-017)

**日期：** 2026-04-20
**PR：** #157 (`copilot/update-jmeter-dry-run-k6-smoke-docs`)

| 事故 | CI Run | 失败步骤 | ISS 编号 |
|------|--------|----------|----------|
| 事故 1 | [#24658683403](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/24658683403/job/72103100589) | lint → Prettier check | ISS-016 |
| 事故 2 | [#24660443771](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/24660443771/job/72105432452) | unit-test → Coverage threshold check | ISS-017 |

---

## 1. 事故 1：Prettier 格式检查失败 (ISS-016)

**发现方式：** CI 失败 (`performance-ci.yml` → lint job → Prettier check step)
**影响范围：** `tests/unit/helpers/smoke-config.test.js`, `tests/unit/scripts/jmeter-dryrun.test.js`
**严重程度：** 低（格式问题，不影响功能，阻塞 CI）

### 1.1 问题描述

| 维度 | 详情 |
|------|------|
| **失败步骤** | `npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'` |
| **失败文件** | `tests/unit/helpers/smoke-config.test.js`, `tests/unit/scripts/jmeter-dryrun.test.js` |
| **错误信息** | `Code style issues found in 2 files. Run Prettier with --write to fix.` |
| **退出码** | 1 |
| **具体差异** | 33 处格式差异：trailing comma 位置、函数参数行折叠方式、多行→单行合并 |

### 错误样例

```diff
- const SMOKE_K6_SCRIPT = path.join(
-   __dirname,
-   '../../../tests/performance/smoke.k6.js',
- );
+ const SMOKE_K6_SCRIPT = path.join(__dirname, '../../../tests/performance/smoke.k6.js');
```

Prettier 认为参数总长度未超过 `printWidth`（默认 80），应合并为单行。ESLint 不检查此类格式问题。

---

## 2. 根因分析 (5 Whys)

```
Q1: 为什么 CI Prettier check 失败？
A1: 两个新增 test 文件未经过 `prettier --write` 格式化就提交了。

Q2: 为什么提交前未运行 Prettier？
A2: 开发流程中只运行了 `eslint` 和 `jest`，未运行 `prettier --check`。

Q3: 为什么开发流程没有包含 Prettier 步骤？
A3: CLAUDE.md 的 Node.js Pre-commit Checklist 中只列出了 `npx eslint . || true` 和
    `npm test`，遗漏了 `npx prettier --check`。虽然 ISS-015 已记录"ESLint ≠ Prettier"
    的教训，但 checklist 模板未同步更新。

Q4: 为什么 ISS-015 教训未落地到 checklist？
A4: ISS-015 加入了 Common Pitfalls 表，但未更新 Pre-commit Checklist 的命令模板。
    知识沉淀在表格中，但执行流程未同步，导致"知道但没做"。

Q5: 为什么 parallel_validation（Code Review + CodeQL）也未拦截？
A5: parallel_validation 的 Code Review 检查代码逻辑和安全，不检查格式。
    CodeQL 只检查安全漏洞。两者均非格式门禁。
```

---

## 3. 根因总结

| 编号 | 根因类型 | 说明 |
|------|----------|------|
| RC-1 | **流程缺陷** | Pre-commit Checklist 遗漏 `prettier --check` 步骤 |
| RC-2 | **知识不落地** | ISS-015 教训记录在 Common Pitfalls 表，但未同步更新执行 checklist |
| RC-3 | **工具盲区** | `parallel_validation` 不覆盖格式检查，开发者误以为已验证 |

---

## 4. 修复措施

### 4.1 立即修复（本次 PR）

| 措施 | 状态 |
|------|------|
| 对两个文件运行 `npx prettier --write` 修复格式 | ✅ 已完成 |
| 验证 `prettier --check` + `eslint` + `jest`（258 tests）全部通过 | ✅ 已完成 |

### 4.2 流程改进（本次 PR 同步）

| 编号 | 改进措施 | 目标 | 状态 |
|------|----------|------|------|
| FIX-1 | **更新 CLAUDE.md Pre-commit Checklist**：Node.js 项目增加 `npx prettier --check` | 执行 checklist 与 CI 步骤对齐 | ✅ 已完成 |
| FIX-2 | **新增 ISS-016 到 Common Pitfalls**：明确"新增 .js 文件必须先 prettier --write 再提交" | 知识沉淀 | ✅ 已完成 |

### 4.3 长期建议

| 编号 | 改进措施 | 目标 | 优先级 |
|------|----------|------|--------|
| LONG-1 | **添加 pre-commit hook**：配置 `lint-staged` + `husky` 在 commit 前自动运行 prettier + eslint | 自动化门禁，杜绝人为遗漏 | P1 |
| LONG-2 | **CI 步骤与 checklist 双向同步规范**：每次修改 CI workflow 时，同步更新 CLAUDE.md checklist | 防止知识与流程脱节 | P2 |

> **注意：** `package.json` 已配置了 `lint-staged`，但需要 `husky` 安装 git hooks 才能自动触发。
> 当前配置：
> ```json
> "lint-staged": {
>   "src/**/*.js": ["eslint --fix", "prettier --write"],
>   "tests/**/*.js": ["eslint --fix", "prettier --write"],
>   "scripts/**/*.js": ["eslint --fix", "prettier --write"]
> }
> ```
> 该配置已包含 prettier，但因缺少 husky，git commit 时不会自动执行。

---

## 5. 时间线

| 时间 (UTC) | 事件 |
|------------|------|
| 09:18 | copilot-swe-agent 提交 `8e180e7`（含格式问题的两个文件） |
| 09:21 | `performance-ci.yml` workflow 触发 |
| 09:51 | CI 失败：Prettier check exit 1 |
| 09:55 | 用户报告 CI 失败，要求 RCA |
| 10:00 | 定位根因：Prettier 格式差异（trailing comma、line wrapping） |
| 10:02 | 修复推送：`npx prettier --write` + CLAUDE.md 更新 |

---

## 6. 影响评估

| 维度 | 修复前 | 修复后 |
|------|--------|--------|
| CI 状态 | ❌ FAIL | ✅ PASS |
| 格式差异 | 2 文件 33 处 | 0 |
| CLAUDE.md 覆盖 | 遗漏 prettier | 已包含 prettier |
| Common Pitfalls | ISS-015（仅描述） | ISS-016（明确操作步骤） |

---

## 7. 关联教训

| ISS 编号 | 教训 | 关联 |
|----------|------|------|
| ISS-015 | ESLint ≠ Prettier，PR 合并前必须分别验证 | **事故 1 根因之一**：知道但没做 |
| ISS-016 | 新增 .js 文件必须先 `prettier --write` 再提交 | **事故 1 新增** |
| ISS-017 | CI workflow `working-directory` 下路径必须是相对路径；修复后必须本地全流程自测 | **事故 2 新增** |

---

## 8. 事故 2：Coverage Report Not Found (ISS-017)

**发现方式：** CI 失败 (`performance-ci.yml` → unit-test job → Check coverage thresholds)
**影响范围：** `.github/workflows/performance-ci.yml`
**严重程度：** 中（阻塞 CI unit-test job，且 coverage 提取 regex 存在静默跳过的隐患）

### 8.1 问题描述

| 维度 | 详情 |
|------|------|
| **失败步骤** | `Check coverage thresholds` |
| **错误信息** | `FAIL: Coverage report not found` |
| **退出码** | 1 |
| **根本原因** | `COVERAGE_FILE=performance-testing-platform/coverage/lcov-report/index.html` 在 `working-directory: performance-testing-platform` 下变成双重嵌套路径 |

### 问题图示

```
CI workflow defaults:
  working-directory: performance-testing-platform  ← 所有 run 步骤的 cwd

Jest 输出覆盖率到: coverage/lcov-report/index.html  ← 相对于 cwd
                   = performance-testing-platform/coverage/lcov-report/index.html (绝对)

CI 脚本检查路径:   performance-testing-platform/coverage/lcov-report/index.html  ← 相对于 cwd
                   = performance-testing-platform/performance-testing-platform/coverage/... (绝对)
                   → 文件不存在 → exit 1
```

### 隐患：coverage 提取 regex 不匹配 HTML 格式

| 维度 | 旧代码 | 实际 HTML |
|------|--------|-----------|
| **正则** | `grep -o 'All files[^>]*> \([0-9.]*\)%'` | 无匹配 |
| **HTML 格式** | 假设 `All files...>XX%` 在同一行 | `<span class="strong">95.27% </span>` + `<span class="quiet">Statements</span>` 分行 |
| **结果** | 所有变量为空 | `bc` 比较 `" < 80"` → syntax error → `(( ))` = 0 → **静默通过** |

### 8.2 根因分析 (5 Whys)

```
Q1: 为什么 "Check coverage thresholds" 步骤失败？
A1: 脚本找不到 coverage/lcov-report/index.html 文件。

Q2: 为什么找不到文件？
A2: 路径写成 performance-testing-platform/coverage/..., 但 working-directory 已经是
    performance-testing-platform/，导致实际查找路径双重嵌套。

Q3: 为什么这个 bug 之前没有暴露？
A3: 这是 base 分支 (feature/performance-testing) 的潜在缺陷。之前的 PR 要么：
    (1) lint job 就失败了，unit-test job 未执行;
    (2) 没有触发 performance-ci.yml 的路径过滤。

Q4: 为什么事故 1 修复后没有同时发现事故 2？
A4: 修复 Prettier 后只本地验证了 eslint + prettier + jest，没有模拟 CI 的
    "Check coverage thresholds" 步骤。验证范围不完整。

Q5: 为什么本地验证范围不完整？
A5: 没有建立"每次提交前必须本地模拟 CI 全部步骤"的硬性要求。
    只做了"自认为相关的步骤"，遗漏了下游步骤。
```

### 8.3 根因总结

| 编号 | 根因类型 | 说明 |
|------|----------|------|
| RC-4 | **路径错误** | `working-directory` 下使用了绝对路径而非相对路径 |
| RC-5 | **潜在缺陷** | base 分支的 coverage regex 从未正确工作过，但被路径错误"遮蔽" |
| RC-6 | **验证不完整** | 事故 1 修复后未跑完 CI 全部步骤就推送 |

### 8.4 修复措施

#### 立即修复（本次 PR）

| 措施 | 状态 |
|------|------|
| 修正 `COVERAGE_FILE` 路径：去掉 `performance-testing-platform/` 前缀 | ✅ |
| 修正 coverage 提取 regex 适配实际 HTML 格式 | ✅ |
| 新增空值校验：提取失败时立即 `exit 1`，不再静默通过 | ✅ |
| 本地完整模拟 CI 全部步骤（lint + prettier + jest + coverage check）| ✅ |

#### 流程改进

| 编号 | 改进措施 | 目标 |
|------|----------|------|
| FIX-3 | **ISS-017 加入 Common Pitfalls** | 记录 working-directory 路径陷阱 |
| FIX-4 | **每次推送前完整模拟 CI** | 不再只验证"自认为相关的步骤" |

### 8.5 时间线

| 时间 (UTC) | 事件 |
|------------|------|
| 10:02 | 事故 1 修复推送（仅验证 eslint + prettier + jest） |
| 10:05 | CI 重新触发，lint job 通过 |
| 10:07 | unit-test job 失败：`FAIL: Coverage report not found` |
| 10:09 | 用户报告第二次 CI 失败 |
| 10:15 | 定位根因：双重路径嵌套 + regex 不匹配 |
| 10:20 | 修复 CI workflow + 本地全流程验证 + 推送 |
