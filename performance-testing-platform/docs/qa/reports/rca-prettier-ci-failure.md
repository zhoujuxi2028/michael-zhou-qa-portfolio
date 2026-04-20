# RCA 分析：Prettier 格式检查 CI 失败 (ISS-016)

**日期：** 2026-04-20
**发现方式：** CI 失败 (`performance-ci.yml` → Prettier check step)
**影响范围：** `tests/unit/helpers/smoke-config.test.js`, `tests/unit/scripts/jmeter-dryrun.test.js`
**严重程度：** 低（格式问题，不影响功能，阻塞 CI）
**PR：** #157 (`copilot/update-jmeter-dry-run-k6-smoke-docs`)
**CI Run：** [#24658683403](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/24658683403/job/72103100589)

---

## 1. 问题描述

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
| ISS-015 | ESLint ≠ Prettier，PR 合并前必须分别验证 | **本次根因之一**：知道但没做 |
| ISS-016 | 新增 .js 文件必须先 `prettier --write` 再提交 | **本次新增** |
