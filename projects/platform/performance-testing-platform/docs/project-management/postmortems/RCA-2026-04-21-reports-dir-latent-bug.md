# RCA-2026-04-21 — CI `reports/` 目录潜伏 Bug

**类型**: 根本原因分析 (Root Cause Analysis)  
**严重程度**: P2（CI 失败，影响开发效率）  
**状态**: ✅ 已修复 + 预防措施已实施  
**关联 PR**: #161（修复）、#162（预防措施）

---

## 1. 问题摘要

`performance-ci.yml` 的 `smoke-test` job 中，k6 执行命令带有
`--out json=reports/k6-smoke-summary.json`，但 CI runner 上不存在 `reports/` 目录，
导致 k6 以 exit code 255 退出，CI 失败。

**错误信息**:

```
time="2026-04-21T02:24:02Z" level=error msg="open reports/k6-smoke-summary.json: no such file or directory"
##[error]Process completed with exit code 255.
```

---

## 2. 时间线

| 时间                    | Commit               | 事件                                                                                                    |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| 2026-04-18              | `ffb5a3b` (PR #135)  | **Bug 引入**: k6 命令改为 `--out json=reports/k6-smoke-summary.json`，遗漏 `mkdir -p reports`           |
| 2026-04-18 ~ 2026-04-21 | runs 197–212         | CI 全部 **绿灯**，Bug 被掩盖约 3 天                                                                     |
| 2026-04-21              | `d7df59d0`           | **Bug 暴露触发器**: 将 `reports/` 目录从 git 追踪中移除（`chore: remove test artifacts from tracking`） |
| 2026-04-21              | runs 213–215         | CI **立即失败**: `no such file or directory`                                                            |
| 2026-04-21              | `59607f42` (PR #161) | **直接修复**: `smoke-test` job 加 `mkdir -p reports`                                                    |
| 2026-04-21              | PR #162              | **预防措施**: 实施 ISS-019，加 CI 目录卫生检查脚本                                                      |

---

## 3. 根本原因分析（5 Why）

| 层级      | 问题                  | 原因                                                                |
| --------- | --------------------- | ------------------------------------------------------------------- |
| **Why 1** | k6 exit 255           | `reports/` 目录不存在                                               |
| **Why 2** | 目录不存在            | CI workflow 没有 `mkdir -p reports` 步骤                            |
| **Why 3** | 遗漏了 mkdir          | PR #135 只关注了 `--out` 参数本身，未检查父目录是否存在             |
| **Why 4** | Code review 未发现    | 缺少"添加输出路径时检查父目录"的 review checklist 项                |
| **Why 5** | Bug 潜伏 3 天未被发现 | `reports/` 被意外提交到 git → CI checkout 自动恢复目录 → Bug 被掩盖 |

**根本原因**: 测试产物（`reports/` 目录）被意外提交 git，充当了 runner 环境的"脚手架"，掩盖了缺失 `mkdir -p` 的 Bug。

---

## 4. 掩盖机制说明

```
ffb5a3b 引入 Bug（遗漏 mkdir -p reports）
    ↓
reports/ 目录被 git 追踪（意外的"保护伞"）
    ↓
CI checkout 自动恢复 reports/ 目录（含 baseline-2026-01-08.json 等文件）
    ↓
k6 能成功写入 reports/k6-smoke-summary.json
    ↓
CI 绿灯 ×16次，无人察觉

d7df59d0: chore: remove test artifacts from tracking
    ↓
1. git rm -r performance-testing-platform/reports/
2. .gitignore 新增 reports/ 行
    ↓
CI checkout 不再恢复 reports/ 目录（"保护伞"消失）
    ↓
k6 exit 255（Bug 暴露）
```

---

## 5. 直接修复（PR #161）

```diff
- run: k6 run --out json=reports/k6-smoke-summary.json tests/performance/smoke.k6.js
+ run: |
+   mkdir -p reports
+   k6 run --out json=reports/k6-smoke-summary.json tests/performance/smoke.k6.js
```

---

## 6. 预防措施（PR #162，ISS-019）

### 6.1 全量修复：所有 job 补齐 mkdir -p

| Job                 | 修复内容                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| `smoke-test`        | ✅ PR #161 已修复（`mkdir -p reports` + k6）                           |
| `jmeter-smoke-test` | ✅ 早已有 `mkdir -p results`（`eabf8e3`）                              |
| `baseline-compare`  | ✅ PR #162 补充 `mkdir -p reports`（`gh run download -D reports/` 前） |
| `trend-collect`     | ✅ PR #162 补充 `mkdir -p reports`（`trend-collect.js` 前）            |

### 6.2 CI 目录卫生检查脚本

新增 `scripts/ci-lint.js`，自动检测 CI workflow 中是否存在"输出到子目录但未 mkdir -p"的问题。

```bash
npm run ci:lint   # 检查 performance-ci.yml
```

覆盖的输出模式:

- `k6 --out json=dir/file`
- `jmeter -l dir/file`
- `gh run download -D dir/`
- shell 重定向 `cmd > dir/file`
- `--output-dir dir/`
- `--output dir/file`

### 6.3 TDD 验证

12 个单元测试全部通过（`tests/unit/scripts/ci-lint.test.js`）:

- UT-CI-LINT-01 ~ 12 覆盖所有检测模式、边界情况

### 6.4 CLAUDE.md 记录（ISS-019）

已在根 `CLAUDE.md` Common Pitfalls 表格中新增:

| Check                                                 | Why                                                                                         | Learned From |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| CI 输出目录必须显式 `mkdir -p`，不能依赖 git checkout | 测试产物被 git 追踪时，checkout 会恢复目录，掩盖缺失的 mkdir，直到产物被从 git 移除时才暴露 | ISS-019      |

---

## 7. 举一反三

此问题属于"CI 环境隐含假设"类缺陷：

| 假设                             | 正确做法                                      |
| -------------------------------- | --------------------------------------------- |
| ❌ 输出目录由 git checkout 提供  | ✅ 每个 CI job 显式 `mkdir -p <dir>`          |
| ❌ 测试产物应提交 git            | ✅ 测试产物加入 `.gitignore`                  |
| ❌ 本地测试环境 ≈ CI runner 环境 | ✅ CI runner 是全新空目录，本地可能有历史目录 |

**设计原则**: CI job 应该对执行环境零假设（tabula rasa）— 所有需要的目录/文件必须在 job 内显式创建。

---

## 8. 关联文档

- `docs/architecture/design-decisions.md` — DD-04: CI 输出目录约定
- `docs/design/phase7/04-ci-flow-design.md` — 输出目录规范
- `scripts/ci-lint.js` — 自动检查工具
- `tests/unit/scripts/ci-lint.test.js` — 验证测试
- 根 `CLAUDE.md` — ISS-019 Common Pitfalls
