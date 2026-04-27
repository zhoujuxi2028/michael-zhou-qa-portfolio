# RCA: PR #232 stage4-selftest-fast bats 因验收报告路径迁移而失败

**日期**: 2026-04-27
**发现方式**: GitHub Actions 失败 — `Performance Testing CI` Run 24978059466（PR #232，attempt 2）
**影响范围**: 仅 PR #232 (`copilot/optimize-docs-qa-planning`) 分支 CI；`main` 分支不受影响
**严重级别**: P1 / High（Blocking PR #232 Stage Gate 通过；非生产代码缺陷）
**Defect ID**: `DEF-011`（performance-testing-platform）
**关联 Run / Job**: [Run 24978059466](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/24978059466) / Job 73133977144

---

## 1. 故障现象

`bats tests/unit/scripts/stage4-selftest-fast.bats` 14 个用例中第 11 个失败：

```
ok 10 6.2: CI 中 continue-on-error 须有文档化豁免注释
not ok 11 8.1: 验收报告文件应存在
# (in test file tests/unit/scripts/stage4-selftest-fast.bats, line 126)
#   `[ -f "docs/qa/reports/phase6-stage4-verification-report.md" ]' failed
ok 12 8.2: CLAUDE.md 应包含锁机制文档
...
##[error]Process completed with exit code 1.
```

其余 13 个用例均通过；CI 之前的 lint / unit-tests 阶段也全部通过。失败仅由该单一断言触发，整个 workflow 因此 red。

---

## 2. 根因分析

### 直接原因

PR #232 (`docs(qa): P0 standardize performance-testing-platform/docs/qa structure`) 将原本位于：

```
performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md
```

迁移到 `execution/` 子目录：

```
performance-testing-platform/docs/qa/reports/execution/phase6-stage4-verification-report.md
```

但**未同步更新引用该硬编码路径的脚本与测试**。`stage4-selftest-fast.bats` 第 126 行的 `[ -f ... ]` 断言因此 FAIL。

### 受影响的引用清单（PR #232 分支上）

```
performance-testing-platform/tests/unit/scripts/stage4-selftest-fast.bats:126
performance-testing-platform/tests/unit/scripts/stage4-selftest.test.sh:221
performance-testing-platform/scripts/stage4-selftest.sh:377
performance-testing-platform/scripts/stage4-selftest.sh:378
```

bats 仅触发了 `:126` 一处；`stage4-selftest.sh:377-378` 因不在 fast bats 路径内未必触发，但同样会在脚本完整运行时失效。

### 深层原因（系统性）

| 层 | 问题 | 改进方向 |
|----|------|----------|
| 文档治理 | 报告/计划文件路径作为"测试 fixture"被脚本硬编码引用，但迁移时缺少 grep 全仓自检 | 文件迁移前必须 `grep -rn <old_path>` 列出所有引用并同步更新 |
| 评审流程 | PR #232 Stage 4（测试）阶段未本地运行 `bats tests/unit/scripts/stage4-selftest-fast.bats` | Stage Gate Checklist 中"本地 lint/test 全绿"项需明确包含 bats |
| CI 设计 | 单一硬编码路径断言对文档结构调整非常脆弱（false positive 与文档治理强耦合） | 后续可改为"匹配 `docs/qa/reports/**/phase6-stage4-verification-report.md` 任一存在"，与 docs/ARCHITECTURE.md 的归档矩阵保持一致 |

---

## 3. 时间线

| 时间（UTC）| 事件 |
|------|------|
| 2026-04-27 04:31 | PR #232 commit `cdbca84` 推送（迁移报告至 `execution/`） |
| 2026-04-27 05:25:30 | GitHub Actions Run 24978059466 attempt 2 启动 |
| 2026-04-27 05:25:53 | bats 用例 11 报 FAIL，job 73133977144 退出码 1 |
| 2026-04-27 05:25:54 | workflow 总状态 = failure |
| 2026-04-27 05:29 | QA 收到失败通知，按 defect 流程登记（本 RCA） |

MTTD ≈ 4 分钟（CI 即时反馈）；MTTR 待 PR #232 推送修复 commit 后计算。

---

## 4. 验证证据

- 本仓库 (`main`) 上文件仍位于旧路径：`performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md`，bats 在 main 上为绿。
- PR #232 (`origin/copilot/optimize-docs-qa-planning`) 上 `git ls-tree -r ... | grep verification-report` 仅出现 `execution/phase6-stage4-verification-report.md`，确认文件已迁移。
- `git diff origin/main..origin/copilot/optimize-docs-qa-planning -- performance-testing-platform/tests/unit/scripts/stage4-selftest-fast.bats` 输出为空，确认测试文件未被 PR 修改。

三方证据一致，可关闭根因分析。

---

## 5. 修复方案（建议落地于 PR #232 分支）

> 本仓库当前分支 `copilot/process-defect-handling` 不可直接为 PR #232 提交修复（branch discipline）。下列补丁需由 PR #232 作者 / 后续 commit 落地。

### 5.1 同步更新硬编码路径

在 PR #232 分支上将四处引用统一改为新路径 `docs/qa/reports/execution/phase6-stage4-verification-report.md`：

| 文件 | 行号 | 修改 |
|------|------|------|
| `performance-testing-platform/tests/unit/scripts/stage4-selftest-fast.bats` | 126 | `[ -f "docs/qa/reports/execution/phase6-stage4-verification-report.md" ]` |
| `performance-testing-platform/tests/unit/scripts/stage4-selftest.test.sh` | 221 | 同步替换 |
| `performance-testing-platform/scripts/stage4-selftest.sh` | 377-378 | 同步替换（含 `ls -lh` 行） |

### 5.2 防回归（可选，建议同 PR 落地）

- 在 PR 描述 Stage 4 checklist 显式勾选 "本地已运行 `bats tests/unit/scripts/stage4-selftest-fast.bats`"。
- 后续考虑用 `find docs/qa/reports -name 'phase6-stage4-verification-report.md' | head -n1` 做存在性判定，解耦目录结构。

---

## 6. 回归验收

修复 commit 推送 PR #232 后，验收以下三项：

1. **本地回归**：在 PR #232 工作树执行
   ```bash
   cd performance-testing-platform
   bats tests/unit/scripts/stage4-selftest-fast.bats
   ```
   预期：`14 tests, 0 failures`，特别 `ok 11 8.1: 验收报告文件应存在`。

2. **CI 回归**：PR #232 重新触发 `Performance Testing CI`，`bats-tests` job 通过；workflow 整体绿灯。

3. **路径一致性**：
   ```bash
   grep -rn "docs/qa/reports/phase6-stage4-verification-report.md" performance-testing-platform/
   ```
   预期：无匹配（所有引用已迁移）。

通过后由 QA Lead 在 `performance-testing-platform/docs/qa/defect-register.md` 将 `DEF-011` 从 Active 移至 Closed Defects 区，并在 Portfolio `defect-register.md` 变更日志记录关闭。

---

## 7. 改进项（Action Items）

| ID | 改进项 | 责任人 | Owner 模块 | 截止 |
|----|--------|--------|------------|------|
| AI-1 | PR #232 推送修复 commit（5.1） | PR #232 作者 | docs/qa | 24h |
| AI-2 | 文档治理 checklist 中加入"迁移前 `grep -rn` 引用扫描"步骤 | QA Lead | `docs/ARCHITECTURE.md` | 1 周 |
| AI-3 | 评估将硬编码路径改为 glob 匹配 | perf-platform Owner | `scripts/stage4-selftest.sh` | 下个 sprint |

---

**作者**: QA（按 defect-tracking/README.md §7 RCA 模板）
**评审**: 待 PR #232 关闭后归档；与 `RCA-2026-04-24-bats-ci-detached-head-merge-commit.md` 同属 bats CI 脆弱性模式，本季度第 2 次同类问题，距触发"季度专项 Postmortem"阈值（≥3）尚有 1 次。

---

## 8. 修复补丁交付（2026-04-27 补充）

由于本仓库 branch discipline 限制，agent 不能直接向 PR #232 分支（`copilot/optimize-docs-qa-planning`）推送 commit，且本补丁中"旧路径 → 新路径"的改动仅在 PR #232 的 `reports/execution/` 目录已存在时才有效（直接落到 `main` 会让 fast bats 反向变红）。

因此本次 agent session 把可直接 `git am` / `git apply` 的补丁作为**附件**归档到本 RCA 同级 `attachments/` 目录：

```
performance-testing-platform/docs/project-management/postmortems/attachments/DEF-011-fix-stage4-paths.patch
```

补丁内容（4 文件，9 处路径替换 + 1 行 `mkdir -p`）已在 agent 工作树的本地 `cdbca84 + 1 commit` 上验证通过：

```
$ bats tests/unit/scripts/stage4-selftest-fast.bats
1..14
ok 1 ... ok 11 8.1: 验收报告文件应存在 ... ok 14
14 tests, 0 failures
```

### 8.1 PR #232 作者落地步骤

```bash
# 在 PR #232 工作树根目录
git checkout copilot/optimize-docs-qa-planning
git am performance-testing-platform/docs/project-management/postmortems/attachments/DEF-011-fix-stage4-paths.patch
# 或：git apply --3way <patch>
git push origin copilot/optimize-docs-qa-planning
```

PR #232 重新触发 CI 后，预期：

- `Performance Testing / Shell Tests (Fast)` ✅
- `Performance Testing / Shell Tests (Integration)` ✅
- `Performance Testing / Gate` ✅

### 8.2 落地后关闭 DEF-011

CI 全绿且 PR #232 合并后：

1. 在 `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md` 把 `DEF-011` 行从"活跃"搬到"Closed Defects"区，写入关闭 commit / PR。
2. 在 Portfolio `docs/project-management/defect-tracking/defect-register.md` 第 2 节去除"2026-04-27 关注"提示。
3. 本 RCA 文件名前缀从 `RCA-` 保持不变（仅根因），不改写为 `POSTMORTEM-`（按 README.md §7 命名约定，单根因不重写）。
