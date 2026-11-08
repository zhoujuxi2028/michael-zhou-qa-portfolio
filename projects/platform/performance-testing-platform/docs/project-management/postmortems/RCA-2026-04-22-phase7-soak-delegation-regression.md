# RCA-2026-04-22 — Phase 7 soak 委托缺失导致 Unit Tests 失败

**类型**: 根本原因分析 (RCA) + Postmortem  
**严重程度**: P2（CI 失败，阻塞 PR 合并）  
**状态**: ✅ 已修复并完成本地自测  
**关联 PR / Run**: PR #171 / Run #24754299934 / Job #72424167521  
**修复 PR**: #172

---

## 1. 问题摘要

`Performance Testing CI` 的 `Unit Tests` job 失败，唯一失败用例为：

```text
FAIL tests/unit/scripts/integration-test-phase7-soak.test.js
Expected substring: "bash scripts/integration-test-phase7-soak.sh"
```

失败说明 `scripts/integration-test.sh` 在 `--phase soak` 场景下没有委托到
`scripts/integration-test-phase7-soak.sh`，仍沿用旧的统一执行路径。

---

## 2. 时间线

| 时间                 | 事件                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 00:52 UTC | PR #171 触发 run `24754299934`，`Unit Tests` job 失败                                                                                                      |
| 2026-04-22 00:52 UTC | 日志确认失败点：`integration-test-phase7-soak.test.js` 最后一个断言失败                                                                                    |
| 2026-04-22 之后      | PR #172 补充 `--phase soak` → `bash scripts/integration-test-phase7-soak.sh` 委托逻辑                                                                      |
| 本次处理             | 本地执行 `npx eslint src/ tests/unit/ --ext .js` + `npx jest tests/unit/ --coverage --coverageReporters=text --coverageReporters=lcov`，270/270 tests 通过 |

---

## 3. 根本原因分析（5 Why）

| 层级  | 问题                       | 原因                                                                                |
| ----- | -------------------------- | ----------------------------------------------------------------------------------- |
| Why 1 | 为什么单测失败？           | 断言要求 `integration-test.sh` 包含 Phase 7 soak 专用脚本委托语句，但实际文件不存在 |
| Why 2 | 为什么不存在委托语句？     | 主入口脚本仍使用旧的 `setup_phase → execute_phase → report_phase` 通用流            |
| Why 3 | 为什么旧流程没同步更新？   | Phase 7 soak 能力拆分为独立脚本后，主入口适配遗漏                                   |
| Why 4 | 为什么遗漏直到 CI 才暴露？ | 本次提交只改了格式，重新触发 CI，暴露了之前已存在的逻辑缺口                         |
| Why 5 | 为什么能被快速定位？       | 已有针对主入口委托行为的单元测试，直接把失败收敛到具体脚本和具体字符串              |

**根本原因**: `scripts/integration-test.sh` 未跟随 Phase 7 soak 独立脚本设计同步更新，缺少 `--phase soak` 专用委托分支。

---

## 4. 直接修复

在 `scripts/integration-test.sh` 的 `main()` 中增加专用分支：

```bash
if [ "$PHASE" = "soak" ]; then
  bash scripts/integration-test-phase7-soak.sh
  return
fi
```

修复效果：

- `--phase soak` 直接走 Phase 7 专用验证脚本
- 避免旧通用执行流绕过 soak 专项逻辑
- 使 `integration-test-phase7-soak.test.js` 与实现重新一致

---

## 5. 自测结果

在 `/performance-testing-platform` 本地执行：

```bash
npm ci
npx eslint src/ tests/unit/ --ext .js
npx jest tests/unit/ --coverage --coverageReporters=text --coverageReporters=lcov
```

结果：

- ESLint：✅ 通过
- Jest：✅ 28 suites / 270 tests 全部通过
- Coverage：✅ Statements 95.27 / Branches 90.71 / Functions 100 / Lines 97.05

---

## 6. 影响评估

| 维度 | 影响                                                                  |
| ---- | --------------------------------------------------------------------- |
| CI   | `Unit Tests` job 失败，后续 smoke / baseline / trend job 全部 skipped |
| 功能 | Phase 7 soak 专项入口不可达，集成验证路径不完整                       |
| 范围 | 仅影响 performance-testing-platform 的集成测试入口脚本                |

---

## 7. 预防措施

- [x] 保留针对主入口委托行为的单元测试，防止未来回退到旧流程
- [x] 将本次事件记录到 `risks.md` 历史问题，沉淀经验
- [ ] 后续新增独立 phase 脚本时，必须同步检查主入口分发逻辑
- [ ] 将“入口脚本是否正确委托到 phase 专用脚本”加入 code review checklist

---

## 8. 经验教训

1. **入口脚本是配置汇聚点**：拆分子脚本时，主入口必须同步调整，否则会出现“子脚本存在但不可达”的假完成状态。
2. **重跑 CI 能揭露旧缺陷**：本次不是格式本身出错，而是格式提交重新触发了对既有逻辑缺口的验证。
3. **行为测试优于人工 grep**：单元测试直接锁定了委托契约，避免把问题误判成环境波动或 Jest flaky。
