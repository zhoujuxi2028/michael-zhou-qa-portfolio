# RCA: BATS 9.1 分支白名单缺少 `docs/` 前缀导致 PR #276 CI 红灯 — DEF-023

**缺陷 ID**: DEF-023  
**严重度**: P2 / Medium  
**发现日期**: 2026-05-26  
**修复日期**: 2026-05-26  
**影响范围**: `performance-testing-platform` CI `Shell Tests (Fast)` job，仅阻塞 PR #276 合并

---

## 1. 问题描述

PR #276（分支 `docs/phase7-close-135`）在 `Performance Testing / Shell Tests (Fast)` 失败（run [#26438598385](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26438598385) / job [#77827370629](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26438598385/job/77827370629)），连带导致 `Performance Testing / Gate` 失败，PR 无法合并。

**错误信息**：

```
not ok 13 9.1: 当前分支应为有效工作分支
#   `echo "$branch" | grep -qE "^(main|feature/|fix/|copilot/|hotfix/)"' failed
##[error]Process completed with exit code 1.
```

`GITHUB_HEAD_REF` 为 `docs/phase7-close-135`，前缀 `docs/` 不匹配 pattern `^(main|feature/|fix/|copilot/|hotfix/)`，test 9.1 失败。

---

## 2. 根因分析

### 2.1 直接原因

`tests/unit/scripts/stage4-selftest-fast.bats` 第 144 行分支白名单 pattern：

```bash
echo "$branch" | grep -qE "^(main|feature/|fix/|copilot/|hotfix/)"
```

**缺少 `docs/` 前缀**。而 `docs/` 是本仓库已被使用的合法分支前缀（`docs/qa-cicd-scenarios-and-reorganise` 已合并至 main），pattern 维护滞后于实际分支命名实践。

### 2.2 深层原因

**A. 白名单维护与分支前缀使用脱钩**

| 时间 | 事件 |
|------|------|
| 2026-04-24 | BATS test 9.1 及 `stage4-selftest.sh` 中引入分支白名单，初始列表为 `main / feature/ / fix/ / copilot/ / hotfix/` |
| 2026-05 | 实际使用 `docs/` 分支（`docs/qa-cicd-scenarios-and-reorganise`），但未同步更新白名单 |
| 2026-05-26 | PR #276 使用 `docs/phase7-close-135`，白名单缺口暴露 |

分支白名单位于**测试代码**中，而新分支前缀属于**工作流惯例**；两者之间没有文档约束，变更其一不会触发对另一方的提醒。

**B. pre-push hook 不包含 BATS fast 套件**

pre-push hook（`.husky/pre-push`）的本地质量门控仅执行：

```
[1/3] Lint → [2/3] 格式检查 → [3/3] Jest 单元测试
```

BATS fast 套件（~1s）**不在 pre-push 中**，只在 CI `Shell Tests (Fast)` job 内运行。因此：

- 推送 `docs/phase7-close-135` 时，本地 pre-push 全部通过（Jest 无感知分支名限制）
- BATS test 9.1 的失败**只能由 CI 发现**，在代码已推送、PR 已开、CI 已运行后才暴露

这是一个典型的"本地防线覆盖不全"问题，导致**发现时机后移至 CI 层**，增加了修复循环成本（额外一次推送 + CI 等待时间）。

**C. 与历史同类问题（RCA-2026-04-24）的关系**

[RCA-2026-04-24-bats-ci-detached-head-merge-commit.md](RCA-2026-04-24-bats-ci-detached-head-merge-commit.md) 中已修复 BATS test 9.1 在 CI detached HEAD 环境下通过 `GITHUB_HEAD_REF` 回退读取分支名。该修复使 test 9.1 在 CI 中**能够正确读到 `docs/phase7-close-135`**，从而正确触发失败——这是预期行为。本次 DEF-023 的问题在白名单内容不完整，而非检测机制本身。

---

## 3. 为什么本地没有发现？

| 检查路径 | 是否覆盖 BATS test 9.1 | 原因 |
|----------|------------------------|------|
| `npm run lint` | ❌ | ESLint 不检查 BATS 文件 |
| `npm run format:check` | ❌ | Prettier 不处理 BATS |
| `npm run test:unit`（Jest） | ❌ | Jest 不执行 `.bats` 文件 |
| `bats tests/unit/scripts/stage4-selftest-fast.bats` | ✅ | 但此命令**不在 pre-push hook 中** |
| CLAUDE.md "提交前检查" 中列出了 `bats ...` | ⚠️ | 文档有列，但 hook 未执行，依赖人工记忆，属软性约束 |

**根本缺口**：CLAUDE.md 的"提交前检查"列出了 `bats` 命令，但该命令从未被纳入 pre-push hook，形成**文档与自动化防线的不一致**。开发者（和 Agent）在推送时不会手动运行 BATS，CI 成为唯一执行者。

---

## 4. 修复方案

### 4.1 直接修复（PR #276）

`tests/unit/scripts/stage4-selftest-fast.bats:144` 加入 `docs/`：

```bash
# 修复前
echo "$branch" | grep -qE "^(main|feature/|fix/|copilot/|hotfix/)"

# 修复后
echo "$branch" | grep -qE "^(main|feature/|fix/|docs/|copilot/|hotfix/)"
```

**验证**：PR #276 CI 全绿（14 项 BATS test 通过，`Shell Tests (Fast)` 绿灯）。

### 4.2 改进措施（PR #277）

将 BATS fast 套件加入 pre-push hook，成为第 4 个门控步骤：

```
[1/4] Lint → [2/4] 格式检查 → [3/4] Jest 单元测试 → [4/4] BATS fast（~1s）
```

- `bats` 已安装 → 强制执行，失败阻止 push
- `bats` 未安装 → 降级为 ⚠️ warning 跳过，CI 兜底

这消除了"CLAUDE.md 文档与 hook 自动化不一致"的缺口，使 BATS fast 从**软性约束**升级为**强制本地门控**。

---

## 5. 改进措施（Action Items）

| ID | 描述 | 状态 | PR |
|----|------|------|-----|
| AI-1 | BATS whitelist 加入 `docs/` | ✅ 已完成 | PR #276 |
| AI-2 | pre-push hook 加入 BATS fast [4/4] 门控 | ✅ 已完成 | PR #277 |
| AI-3 | 分支前缀白名单与实际命名实践同步：在 `CLAUDE.md` "Git Workflow / Feature Branches" 章节明确列出已用前缀（含 `docs/`），并注明"新增前缀须同步更新 `stage4-selftest-fast.bats` 白名单" | 🟡 待落地 | — |

---

## 6. 时间线

| 时间（北京） | 事件 |
|-------------|------|
| 2026-05-26 15:xx | PR #276（`docs/phase7-close-135`）触发 CI |
| 2026-05-26 15:3x | `Shell Tests (Fast)` 失败，test 9.1 报错 `grep -qE` not matched |
| 2026-05-26 15:4x | 根因确认（`docs/` 前缀缺失于白名单）；登记 DEF-023 |
| 2026-05-26 15:5x | 修复 `stage4-selftest-fast.bats:144`；提交并推送至 PR #276 |
| 2026-05-26 16:xx | CI 全绿（13 项检查通过）；创建 PR #277（pre-push 改进） |
| 2026-05-26 16:xx | 创建 GitHub Issue #278；补全缺陷登记（项目级 + Portfolio 级）；撰写本 RCA |

---

## 7. 经验教训（Lessons Learned）

1. **CLAUDE.md 的"提交前检查"若未自动化到 hook，等同于不存在**：文档列出的命令若未进入 pre-push，在高频推送节奏下没有人（包括 Agent）会手动执行，CI 成为唯一防线，发现成本高。
2. **测试代码中的硬编码列表（白名单、路径、枚举）是维护负债**：随着项目演进，这些列表会悄悄过时。理想做法是列表有唯一来源（CLAUDE.md）并被测试引用；次优做法是在变更分支前缀时有显式的 checklist 提醒更新 BATS。
3. **同一 BATS test 文件已有针对 CI 环境的 workaround（`GITHUB_HEAD_REF` 回退）**：说明团队已意识到 BATS 在 CI 中的特殊性，但 pre-push 从未将其纳入，形成一个长期未被发现的结构性盲区。

---

## 8. 关联资料

- 失败 Run：[#26438598385 / job #77827370629](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26438598385/job/77827370629?pr=276)
- 修复 PR：[#276](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/276)（BATS whitelist）/ [#277](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/277)（pre-push hook）
- GitHub Issue：[#278](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/278)
- 项目级缺陷登记：[`docs/qa/defects/register.md` DEF-023](../../qa/defects/register.md)
- Portfolio 缺陷登记：[`docs/project-management/defect-tracking/defect-register.md`](../../../../docs/project-management/defect-tracking/defect-register.md)
- 历史同类 RCA：[RCA-2026-04-24-bats-ci-detached-head-merge-commit.md](RCA-2026-04-24-bats-ci-detached-head-merge-commit.md)
- BATS 文件：[`tests/unit/scripts/stage4-selftest-fast.bats`](../../../tests/unit/scripts/stage4-selftest-fast.bats)
- pre-push hook：[`.husky/pre-push`](../../../../.husky/pre-push)

---

**作者**: QA  
**创建日期**: 2026-05-26  
**最后更新**: 2026-05-26
