# Stage 4 Acceptance Gate Template

> **版本:** v1.0  
> **适用范围:** Performance Testing Platform — 每个 Phase 的 Stage 4 验收  
> **使用方式:** 每次验收时，复制 `reports/stage4-execution-YYYY-MM-DD.md`，填写实际结果  
> **相关文档:** [缺陷/Waiver 登记表](stage4-defect-waiver-register.md) | [测试计划](test-plan.md)

---

## Gate Decision Rules

| 条件 | Gate 状态 |
|------|-----------|
| 所有 P0 通过 + 无 open Blocker issue | ✅ **PASS** |
| 任一 P0 失败 | 🔴 **BLOCKED** |
| 任一 P1 issue 标记为 Blocking | 🔴 **BLOCKED** |
| 同一用例输出结果矛盾（既 PASS 又 FAIL） | 🔴 **BLOCKED** |
| 环境异常导致结果不可信 | 🟡 **PENDING** |
| 非阻塞问题已有书面 waiver + 审批 | 🟠 **WAIVED** |

> 有任何 BLOCKED 条件时，不得进入 Stage 5（收尾/PR）。  
> PENDING 状态需在环境恢复后重新执行对应用例。

---

## 验收执行人信息

| 字段 | 填写内容 |
|------|---------|
| 执行日期 | _(YYYY-MM-DD)_ |
| 执行人 | _(姓名)_ |
| 分支 | _(feature/xxx)_ |
| Phase/版本 | _(Phase X Stage 4)_ |
| 执行环境 | macOS / Node _(版本)_ / Docker _(版本)_ |

---

## 1. 进入标准检查 (Entry Criteria)

> 全部通过后方可进入 Gate 检查。

| # | 检查项 | 验证命令 | 结果 |
|---|--------|---------|------|
| EC-01 | 开发阶段所有 Task 已 commit | `git log --oneline -10` | ⬜ |
| EC-02 | 依赖已安装，无 error | `npm install` | ⬜ |
| EC-03 | 风险清单已更新 | `docs/project-management/risks.md` 已同步 | ⬜ |
| EC-04 | 环境检测通过（Docker daemon 运行中） | `bash scripts/preflight-check.sh --stage4` exit 0 | ⬜ |
| EC-05 | Defect/Waiver Register 已更新至最新 | [stage4-defect-waiver-register.md](stage4-defect-waiver-register.md) | ⬜ |

---

## 2. P0 Gate — 必须全部通过（阻塞发布）

| 用例 ID | 检查项 | 命令 | 通过标准 | 结果 | 证据/备注 |
|---------|--------|------|---------|------|---------|
| P0-01 | 单元测试全部通过 | `npm run test:unit` | 全部 PASS，0 failures | ⬜ | |
| P0-02 | 代码覆盖率达标 | `npm run test:coverage` | stmt ≥ 80%, branch ≥ 70%, func ≥ 80%, line ≥ 80% | ⬜ | |
| P0-03 | Lint 0 errors | `npm run lint` | 0 errors | ⬜ | |
| P0-04 | 格式检查 0 warnings | `npm run format:check` | 0 warnings | ⬜ | |
| P0-05 | JMeter dry-run 无错误 | `npm run jmeter:dryrun` | 0 errors，字段名/状态码正确 | ⬜ | |

---

## 3. P1 Gate — 应全部通过（强烈建议）

| 用例 ID | 检查项 | 命令 | 通过标准 | 结果 | 证据/备注 |
|---------|--------|------|---------|------|---------|
| P1-01 | k6 smoke | `npm run k6:smoke` | p95 < 500ms, error < 1% | ⬜ | |
| P1-02 | JMeter smoke | `npm run jmeter:smoke` | error < 1% | ⬜ | |
| P1-03 | Shell 集成测试 | `bash scripts/integration-test.sh` | Passed ≥ 总数 − open-blocker 数 | ⬜ | |
| P1-04 | CI 流水线全绿 | push → GitHub Actions | 7 jobs 全部绿灯 | ⬜ | |
| P1-05 | 无 `continue-on-error` workaround | `grep -r "continue-on-error" .github/workflows/` | 0 matches（或有书面豁免） | ⬜ | |

---

## 4. P2 Gate — 建议执行（发布前完成）

| 用例 ID | 检查项 | 命令 | 通过标准 | 结果 | 证据/备注 |
|---------|--------|------|---------|------|---------|
| P2-01 | 完整性能套件 | k6 load/stress/spike 各跑一轮 | 结果记录到 reports/ | ⬜ | |
| P2-02 | Soak 短时验收 | `npm run k6:soak:short` | 10 min heap < 50% 增长 | ⬜ | |
| P2-03 | Grafana 面板手工验证 | 浏览器访问 `http://localhost:3010` | GRF-ERR-01, GRF-HEAT-01, GRF-CUSTOM-01 正常显示 | ⬜ | |
| P2-04 | CI 报红验证 | 故意让一个断言失败 push | CI 正确报红 | ⬜ | |

---

## 5. Blocker 清单

> 当前验收周期内，所有阻塞 Gate PASS 的 issue。  
> 详细信息见 [stage4-defect-waiver-register.md](stage4-defect-waiver-register.md)

| Issue # | 标题摘要 | 严重度 | Blocker? | 状态 | Waiver ID |
|---------|---------|--------|---------|------|-----------|
| _(填写)_ | | | | | |

---

## 6. Waiver 清单

> 非阻塞问题的豁免记录。每条 waiver 需有审批人签字。

| Waiver ID | 关联 Issue | 豁免原因 | 审批人 | 审批日期 | 有效期 |
|-----------|-----------|---------|-------|---------|--------|
| _(填写)_ | | | | | |

---

## 7. 测试产物归档

| 产物 | 路径 | 状态 |
|------|------|------|
| 单元测试覆盖率报告 | `coverage/lcov-report/index.html` | ⬜ |
| k6 smoke 结果 | `results/` | ⬜ |
| JMeter 报告 | `results/jmeter/` | ⬜ |
| 性能基线 | `reports/baseline.json` | ⬜ |
| 集成测试日志 | `tests/integration/logs/` | ⬜ |

---

## 8. 最终 Gate 状态

```
执行日期:    ________________
执行人:      ________________

P0 Gate:     ⬜ PASS  ⬜ BLOCKED
P1 Gate:     ⬜ PASS  ⬜ BLOCKED  ⬜ WAIVED
P2 Gate:     ⬜ PASS  ⬜ SKIPPED

Open Blockers:   ___ 个
Active Waivers:  ___ 个

最终 Gate 状态: ⬜ PASS  🔴 BLOCKED  🟡 PENDING  🟠 WAIVED

签字: _________________   日期: _________________
```

---

## 9. 下一步操作

| Gate 状态 | 操作 |
|-----------|------|
| ✅ PASS | 进入 Stage 5：收尾（PR + 文档同步） |
| 🔴 BLOCKED | 修复所有 Blocker → 重新执行受影响的 Gate 项 |
| 🟡 PENDING | 等待环境恢复 → 重新执行对应用例 |
| 🟠 WAIVED | 确认 waiver 已审批 → 可进入 Stage 5（带未关闭 issue） |
