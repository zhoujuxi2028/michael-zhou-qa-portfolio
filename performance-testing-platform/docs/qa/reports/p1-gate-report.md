# P1 Gate Check 报告

**执行时间:** 2026-04-27 13:30:23
**分支:** copilot/check-baseline-export-test
**耗时:** 63s
**脚本:** scripts/p1-gate-check.sh

---

## 检查结果

  ❌ FAIL: P1-01 — k6 smoke 失败（详见 /home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/docs/qa/reports/logs-p1/k6-smoke.log）
  ✅ PASS: P1-02 — JMeter smoke 通过 (error=0.00% < 1%)
  ⏭️ SKIP: P1-03 — Shell 集成测试依赖未满足（详见 /home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/docs/qa/reports/logs-p1/integration-test.log）
  ⏭️ SKIP: P1-04 — gh run list 调用失败（详见 /home/runner/work/michael-zhou-qa-portfolio/michael-zhou-qa-portfolio/performance-testing-platform/docs/qa/reports/logs-p1/ci-status.log）
  ✅ PASS: P1-05 — 全部 1 处 continue-on-error 已豁免（带 exemption/risks.md/R-NNN 注释）

---

## 统计

| 类型 | 数量 |
|------|------|
| ✅ 通过 | 2 |
| ❌ 失败 | 1 |
| ⏭️ 跳过 | 2 |
| **总计** | **5** |
| **声明项数** | **5** |
| **通过率** | **40.0%** |

---

## 评估

❌ **P1 Gate FAIL** — 存在 1 个失败项，请修复后重新运行。
