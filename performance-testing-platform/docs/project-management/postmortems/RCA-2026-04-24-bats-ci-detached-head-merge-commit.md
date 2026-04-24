# RCA: BATS 集成测试 CI 失败 — tests 24/25（PR #197，第 2 次 CI 失败）

**日期**: 2026-04-24  
**发现方式**: CI `performance-ci / BATS Shell Tests` 报错  
**影响范围**: 仅 BATS 测试失败；无代码功能受损  
**严重级别**: 中（阻塞 CI，同一 PR 内第 2 次 CI 失败）

---

## 1. 故障现象

```
not ok 24 集成: 脚本应成功运行（可能包含 SKIP）
# `bash "$SCRIPT" > /dev/null 2>&1 || [ $? -eq 0 ]' failed
not ok 25 集成: 脚本应输出统计信息
# `output=$(bash "$SCRIPT" 2>&1)' failed with status 2
```

同时也有以下 BATS-层级失败：

```
not ok 3  前置: 当前在有效工作分支上
not ok 18 9.1: 当前分支应为有效工作分支
not ok 19 9.2: 最近 20 条提交应包含 conventional commits
```

---

## 2. 根因分析

### 根因 A：CI 中 `git branch --show-current` 返回空

`actions/checkout@v6` 默认 checkout 到 `refs/pull/N/merge`（PR merge ref），git 处于 **detached HEAD** 状态，`git branch --show-current` 返回空字符串 `""`。

影响位置：
- `scripts/stage4-selftest.sh` 中 `get_current_branch()` → 9.1 判断 FAIL
- BATS test 3 (`前置: 当前在有效工作分支上`)
- BATS test 18 (`9.1: 当前分支应为有效工作分支`)

### 根因 B：CI checkout 产生 Merge 提交，污染 `git log`

在 CI 中 `git log --format=%s -20` 的第一行为 `"Merge pull request #197 from ..."`, 不符合 conventional commits 格式 `^(feat|fix|...): `。

影响位置：
- `scripts/stage4-selftest.sh` 中 `has_recent_conventional_commit()` → 9.2 判断 FAIL
- BATS test 19 (`9.2: 最近 20 条提交应包含 conventional commits`)

### 根因 C：`stage4-selftest.sh` 以 `exit $FAIL` 退出

脚本末尾 `exit $FAIL`。在 CI 中：9.1 + 9.2 各计 1 次 FAIL，共 `FAIL=2`，脚本退出码 2。

### 根因 D：BATS test 24 逻辑缺陷

```bash
bash "$SCRIPT" > /dev/null 2>&1 || [ $? -eq 0 ]
```

Shell 语义：`||` 右侧的 `$?` 是 `bash "$SCRIPT"` 的退出码。若脚本以非零退出，则 `[ $? -eq 0 ]` 恒为 false。整体逻辑等价于：`bash "$SCRIPT" > /dev/null 2>&1`（`|| [ $? -eq 0 ]` 是死代码）。本意想允许 non-zero 退出，但实际毫无效果。

### 根因 E：BATS test 25 变量赋值传播退出码

```bash
output=$(bash "$SCRIPT" 2>&1)
```

在 bash 中，`var=$(command)` 在 `set -e` 作用域内（BATS 默认开启）会传播命令的退出码。脚本 exit 2 → test 25 以 status 2 失败。

---

## 3. 为什么自检没有发现？

### 自检盲区 1：本地环境不是 detached HEAD

在本地开发环境，`git branch --show-current` 正常返回分支名，`get_current_branch()` 不会遇到空值。CI 才会进入 detached HEAD 状态，本地无法复现。

### 自检盲区 2：本地 git log 不含 Merge 提交

本地 `git log -20` 只包含真实开发提交，不包含 CI merge ref 产生的 `"Merge pull request..."` 提交。本地 9.2 通过，CI 失败。

### 自检盲区 3：没有模拟 CI 环境运行 BATS

自检时直接在本地运行 `bash scripts/stage4-selftest.sh`，而没有用 `bats tests/unit/scripts/stage4-selftest.bats` 验证完整 BATS 套件，更没有模拟 detached HEAD。

### 自检盲区 4：test 24 的逻辑缺陷肉眼难发现

`|| [ $? -eq 0 ]` 看上去像"允许失败的安全网"，实际是死代码。没有认真分析 shell 语义。

---

## 4. 修复措施（本次）

| 文件 | 位置 | 修复内容 |
|------|------|---------|
| `scripts/stage4-selftest.sh` | `get_current_branch()` | 添加 CI 回退：`GITHUB_HEAD_REF` → `GITHUB_REF_NAME`（排除 `N/merge` 格式） |
| `scripts/stage4-selftest.sh` | `has_recent_conventional_commit()` | 添加 `grep -v "^Merge "` 过滤 merge 提交 |
| `tests/unit/scripts/stage4-selftest.bats` | test 3 | 添加 `GITHUB_HEAD_REF` 回退 |
| `tests/unit/scripts/stage4-selftest.bats` | test 18 (9.1) | 同上 |
| `tests/unit/scripts/stage4-selftest.bats` | test 19 (9.2) | 添加 `grep -v " Merge "` 过滤 merge 提交行 |
| `tests/unit/scripts/stage4-selftest.bats` | test 24 | 删除无效 `\|\| [ $? -eq 0 ]` |
| `tests/unit/scripts/stage4-selftest.bats` | test 25 | 改用 BATS `run` 命令，避免 non-zero 传播失败 |

---

## 5. 改进措施（预防）

| 措施 | 优先级 |
|------|--------|
| 自检时增加 `bats tests/unit/scripts/stage4-selftest.bats` 完整运行 | 高 |
| 新增 git 操作须模拟 CI 环境（`git checkout --detach HEAD` + `GITHUB_HEAD_REF=...`） | 高 |
| Shell 脚本中所有 `||` 右侧逻辑须注释说明语义，防止死代码 | 中 |
| CI 相关脚本中凡使用 `git branch --show-current` 须同步提供 CI 回退 | 中 |

---

## 6. 时间线

| 时间 | 事件 |
|------|------|
| 2026-04-24 ~05:03 | 第 1 次 CI 失败：broken markdown links（已修复） |
| 2026-04-24 ~05:51 | 第 2 次 CI 失败：BATS tests 24/25 失败（exit 2） |
| 2026-04-24 ~06:11 | 问题上报，开始 RCA |
| 2026-04-24 ~06:20 | 根因确认（detached HEAD + merge commit + 死代码） |
| 2026-04-24 ~06:25 | 修复 5 个文件 7 处，本地验证 tests 3/18/19/25 通过 |
