# POSTMORTEM-2026-04-27 — P0-04 coverage false fail

**类型:** Postmortem / RCA  
**严重程度:** P0 gate false negative  
**状态:** 已验证，P0-04 已恢复 PASS  
**范围:** `performance-testing-platform`

---

## 1. 问题摘要

`docs/qa/reports/p0-gate-report.md` 中 `P0-04` 显示覆盖率不达标：

```text
stmt=95.82% branch=92.64% func=100% line=97.37%
```

实际覆盖率全部高于门禁阈值：

| 指标       | 实际值 | 阈值 | 判定 |
| ---------- | ------ | ---- | ---- |
| Statements | 95.82% | ≥80% | PASS |
| Branches   | 92.64% | ≥70% | PASS |
| Functions  | 100%   | ≥80% | PASS |
| Lines      | 97.37% | ≥80% | PASS |

---

## 2. 影响范围

| 项目                    | 影响                                   |
| ----------------------- | -------------------------------------- |
| Stage 4 P0 gate         | 旧报告将 `P0-04` 标为 FAIL，造成误判   |
| `npm run test:coverage` | 无实际覆盖率缺口                       |
| 合并决策                | 可能被错误阻塞，需要以新 gate 结果为准 |

---

## 3. RCA

### 3.1 直接原因

旧 `p0-gate-report.md` 是过期生成物，报告中的 `P0-04` 状态与当前 `coverage.log` 和当前脚本逻辑不一致。

### 3.2 5 Why

| 层级  | 问题                         | 原因                                                                           |
| ----- | ---------------------------- | ------------------------------------------------------------------------------ |
| Why 1 | 为什么 `P0-04` 显示 FAIL？   | 覆盖率数值达标，但阈值判断分支进入 FAIL                                        |
| Why 2 | 为什么数值达标仍被判 FAIL？  | line coverage 变量在判断前被 Bash 改写                                         |
| Why 3 | 为什么变量会被改写？         | 脚本使用 `LINES` 保存 line coverage，而 `LINES` 是 Bash 特殊变量，表示终端行数 |
| Why 4 | 为什么测试未拦截？           | 旧测试只验证解析输出，没有检查 Bash 特殊变量名或 stale summary                 |
| Why 5 | 为什么问题表现为“显示达标”？ | `DETAIL` 先拼接了 `97.37%`，后续 `meets_threshold "$LINES"` 时变量值已被改写   |

**根本原因:** `p0-gate-check.sh` 使用 Bash 特殊变量 `LINES` 保存 line coverage，变量在 TTY 环境下被自动维护为终端行数，导致阈值判断使用错误值。

---

## 4. 当前验证结果

| 验证项                                           | 结果 | 说明                                                      |
| ------------------------------------------------ | ---- | --------------------------------------------------------- |
| `npm run test:coverage`                          | PASS | 33 suites / 312 tests；覆盖率 95.82 / 92.64 / 100 / 97.37 |
| `npx bats tests/unit/scripts/p0-gate-check.bats` | PASS | 26 tests；覆盖 `LINES` 禁用、summary 新鲜度和解析失败     |
| `bash scripts/p0-gate-check.sh`                  | PASS | P0-01 至 P0-05 全部通过                                   |

---

## 5. 修复与处置

| 类型       | 处置                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------- |
| 覆盖率问题 | 无需补测覆盖率；实际 coverage 已达标                                                         |
| 配置修复   | `jest.config.js` 增加 `json-summary` reporter，生成机器可读 summary                          |
| 脚本修复   | `p0-gate-check.sh` 将 `LINES` 更名为 `LINE_COV`，避免 Bash 特殊变量冲突                      |
| 稳健性增强 | `p0-gate-check.sh` 读取 `coverage-summary.json`，不再依赖控制台表格判定                      |
| 回归测试   | `p0-gate-check.bats` 覆盖 `LINES` 禁用、summary 新鲜度、summary 解析、达标 PASS、不达标 FAIL |
| 报告处置   | 以重新生成的 P0 gate 报告为准，旧报告不得作为当前 gate 结论                                  |
| 后续风险   | 单独跟进 `P0-01` soak unit timeout，避免混淆为 coverage 失败                                 |

---

## 6. Lessons Learned

| 经验                                 | 后续约束                                                     |
| ------------------------------------ | ------------------------------------------------------------ |
| 生成报告可能滞后于脚本修复           | 判定 gate 状态时必须同时核对日志时间、分支和最新命令输出     |
| Bash 特殊变量不能用于业务数据        | 避免 `LINES`、`COLUMNS`、`RANDOM` 等特殊变量名               |
| 覆盖率门禁应使用机器可读数据         | 优先解析 `coverage-summary.json`，避免控制台输出格式影响结果 |
| 机器可读 artifact 必须由当前运行生成 | 运行 coverage 前删除旧 summary，并检查当前命令是否重新生成   |
| 数值显示达标但状态 FAIL 是强异常信号 | 优先检查解析链路和 artifact 时效，而不是盲目补覆盖率         |
| P0 gate fail-late 会保留多个信号     | RCA 必须按检查项拆分，避免把 P0-01 失败归因到 P0-04          |

---

## 7. 关联文件

| 文件                                    | 说明                                       |
| --------------------------------------- | ------------------------------------------ |
| `scripts/p0-gate-check.sh`              | P0-04 coverage gate 执行入口               |
| `scripts/lib/gate-check-common.sh`      | `extract_coverage()` / `meets_threshold()` |
| `jest.config.js`                        | coverage reporter 配置                     |
| `tests/unit/scripts/p0-gate-check.bats` | P0 gate 阈值解析回归测试                   |
| `docs/qa/reports/logs-p0/coverage.log`  | coverage 原始输出                          |
| `docs/qa/reports/p0-gate-report.md`     | P0 gate 生成报告                           |
