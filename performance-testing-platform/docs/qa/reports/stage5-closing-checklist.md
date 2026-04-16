# Phase 6 Stage 5 收尾检查清单

**日期:** 2026-04-15  
**分支:** `feature/performance-testing`  
**前置条件:** Stage 4 验收通过

---

## 📋 Stage 5 收尾流程 (5 个步骤)

### 步骤 1: PR 创建

**检查项：**
- [ ] Stage 4 自测报告已审查，验收通过
- [ ] 分支 `feature/performance-testing` 已推送到远程

**操作：**
```bash
gh pr create \
  --title "feat(perf): Phase 6 testing capability enhancement" \
  --base main \
  --head feature/performance-testing \
  --body "..."
```

**PR body 要点:**
- Summary: Phase 6 的 7 个 Task 完成内容
- Test Plan: 单元测试 148/148、集成测试 29/31、覆盖率 92.83%
- Closes Issue #88

**预期结果：** PR 创建成功，获得 PR 号（如 #XXX）

---

### 步骤 2: 根目录文档更新

**检查项：**
- [ ] 根 CLAUDE.md Projects 表已更新
- [ ] 根 README.md 项目列表已同步（如有）

**更新内容:**

**文件:** `/CLAUDE.md`
```
| 性能测试 | `performance-testing-platform/` — k6 + JMeter 双引擎 (148 unit + 29 integration + 26 perf) | `performance-testing-platform/CLAUDE.md` |
```

变更：`95 unit + 23 integration + 26 perf` → `148 unit + 29 integration + 26 perf`

**预期结果：** 根文档已同步，项目计数正确

---

### 步骤 3: 最终风险确认

**检查项：**
- [ ] `performance-testing-platform/docs/project-management/risks.md` 已审查
- [ ] 遗留活跃风险已确认可接受或已创建 Issue 追踪

**活跃风险清单:**
- R-01: macOS 代理拦截 → ✅ 缓解方案就位 (JVM_ARGS)
- R-02: OrbStack 资源不足 → ✅ preflight check 已配置
- R-04: CI baseline 过期 → ✅ trend.json 追加式存储
- R-06: Breakpoint test 导致崩溃 → ✅ maxDuration + abort
- R-08: express-rate-limit 版本 → ✅ 版本兼容确认
- R-09: CI cron 无服务运行 → ✅ 自包含 workflow
- R-11: Grafana heatmap 兼容性 → ✅ InfluxQL 优先
- R-12: 硬件限制 → ✅ 10K VU 上限标记
- R-15: breakpoint 进程残留 → ✅ maxDuration 安全阀
- R-16: generate-summary.sh 脚本格式 → ✅ 容错机制
- R-19: CI 集成待定 → ⏳ Phase 7 处理
- R-20: healthCheck 半启动 → ✅ 已解决
- R-21: breakpoint abort 未验证 → ⏳ Phase 7 处理

**预期结果：** 所有活跃风险都有缓解方案或 Phase 7 追踪

---

### 步骤 4: 问题关闭

**检查项：**
- [ ] PR 已被审批并 merged 到 main
- [ ] Issue #88 (Phase 6) 准备关闭

**操作：**
```bash
gh issue close 88 --comment "Phase 6 完成，详见 PR #XXX

## 交付物
- 7 个 Task 完成：k6 helpers、rate limiter、lock mechanism、breakpoint、generate-summary
- 单元测试 148/148 PASS (包含 lock + rate limiter)
- 集成测试 29/31 PASS (2 SKIP: Phase 7 计划)
- RTM 76/76 (100%)
- 风险 H-14~H-18 全部记录
- Defect #110 已修复
- 覆盖率 92.83% (超过阈值)

## 后续
Phase 7: Grafana dashboard + CI 报告集成
"
```

**预期结果：** Issue #88 已关闭，评论包含完整交付物清单

---

### 步骤 5: 文档归档

**检查项：**
- [ ] Phase 6 所有文档已最终审查
- [ ] 验收报告已保存到版本控制（可选，reports/ 通常被 gitignore）
- [ ] MEMORY.md 已更新（如有关键决策需保留）

**文档清单:**
- ✅ `CLAUDE.md` (project CLAUDE.md) — 锁机制文档已完整
- ✅ `docs/architecture/architecture.md` — k6 helpers + phase 6 设计已更新
- ✅ `docs/qa/test-plan.md` — Phase 6 集成测试用例已列表
- ✅ `docs/qa/rtm.md` — 76/76 需求覆盖已确认
- ✅ `docs/project-management/risks.md` — H-14~H-18 已记录
- ✅ `docs/qa/reports/phase6-stage4-verification-report.md` — 验收报告已存在
- ✅ `docs/qa/reports/stage4-selftest-report.md` — 自测报告已生成
- ✅ `docs/qa/reports/logs-stage4/` — 所有日志已保存

**预期结果：** 所有 Phase 6 文档完整，可作为 Phase 7 的输入

---

## 📊 检查清单总结

| 步骤 | 内容 | 状态 | 估计时间 |
|------|------|------|---------|
| 1 | PR 创建 | ⏳ | 5 min |
| 2 | 根文档更新 | ⏳ | 10 min |
| 3 | 风险确认 | ⏳ | 5 min |
| 4 | Issue 关闭 | ⏳ | 5 min |
| 5 | 文档归档 | ✅ | 0 min |
| **总计** | | **20-30 min** | |

---

## 🔗 相关文件

- **验收报告:** `docs/qa/reports/stage4-selftest-report.md`
- **自测日志:** `docs/qa/reports/logs-stage4/`
- **实施计划:** `docs/qa/reports/stage4-auto-verify-implementation-plan.md`
- **手工检查清单:** `docs/qa/reports/phase6-stage4-manual-checklist.md`

---

## ⚠️ Stage 5 失败处理

| 场景 | 处理方案 |
|------|---------|
| PR review 要求修改 | 回到 feature 分支修改 → push → re-review |
| 冲突检测 (conflicts) | 本地 merge main，解决冲突，push |
| CI 在 main 报红 | 调查失败原因，回到 feature 分支修复 → push |

---

**下一步:** 等待 Stage 4 验收完成，然后按此清单执行 Stage 5。

