# Phase 7 Gap Remediation 设计文档

> Issue [#135](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/135) — Phase 7 CI/CD Pipeline Implementation 收尾差距闭环

**作者**: DevOps / Performance Testing  
**日期**: 2026-05-25  
**状态**: 🟢 代码实施完成,待人工最终验证  
**关联需求**: `PERF-CI-COV-FR-003`, `PERF-CI-SCHED-FR-001/002`, `PERF-CI-BL-FR-002/008`  
**关联测试**: `CI-COV-02/03`, `SCHED-01~04`, `CI-BL-03`

---

## 1. 背景

Issue #135 验证后发现 RTM (`docs/qa/rtm.md`) 标记为 ✅ 但**实际缺失或不一致**的项目:

| ID | 需求 | RTM 状态 | 实际状态 |
|----|------|----------|----------|
| PERF-CI-COV-FR-003 | Jest 覆盖率门禁 (statements ≥80%, branches ≥70%, functions ≥80%, lines ≥80%) | ✅ | ❌ `jest.config.js` 阈值仅 60/60/60/60 |
| PERF-CI-SCHED-FR-001 | nightly soak + weekly capacity workflow | ✅ | ❌ `.github/workflows/nightly-soak.yml` **不存在** |
| PERF-CI-SCHED-FR-002 | scheduled artifact 保留 30 天 | ✅ | ❌ 依赖未存在的 workflow |
| PERF-CI-BL-FR-002 | baseline 回归 ≥ 50% 失败 + PR 告警 | ⚠️ | 退化时仅 CI 红灯,**无 PR sticky 评论提醒** |

> 历史上 SCHED-01~04 的单元测试仅断言 cron 字符串字面量是否合法,**未验证 workflow 文件存在**,因此 RTM 误判通过。

---

## 2. 目标

1. 让 RTM 中所有 ✅ 状态都有真实文件/配置支撑(避免"文档撒谎")。
2. 对齐需求文档 `phase7-cicd.md §7.3.2 / §7.3.4` 与实现。
3. 让基线回归在 PR 视角可见(目前只能在 CI 日志里看到)。

---

## 3. 方案

### 3.1 覆盖率门禁(PERF-CI-COV-FR-003)

**变更**: `performance-testing-platform/jest.config.js`

| 字段 | 旧值 | 新值 | 来源需求 |
|------|------|------|----------|
| `statements` | 60 | **80** | phase7-cicd.md §7.3.2 |
| `branches` | 60 | **70** | phase7-cicd.md §7.3.2 |
| `functions` | 60 | **80** | phase7-cicd.md §7.3.2 |
| `lines` | 60 | **80** | phase7-cicd.md §7.3.2 |

**风险评估**: 本地 `npx jest --coverage` 实测 statements 95.77% / branches 90.54% / functions 100% / lines 97.09%,**远超目标阈值**,提升后 CI 仍能通过,无回退风险。

**验证测试 (已存在)**:
- `CI-COV-02`: 覆盖率达标 → CI pass
- `CI-COV-03`: 覆盖率不足 → CI fail (由 Jest `coverageThreshold` 原生强制)

### 3.2 定时调度 workflow(PERF-CI-SCHED-FR-001/002)

**新建**: `.github/workflows/nightly-soak.yml`

**触发器**:
- `schedule.cron: '0 3 * * *'` — nightly soak-short (UTC 03:00 ≈ 北京 11:00)
- `schedule.cron: '0 6 * * 0'` — weekly capacity (周日 UTC 06:00)
- `workflow_dispatch` — 手动触发,允许选择 `soak-short` / `capacity`

**Job 结构**:

```
nightly-soak:
  if: github.event.schedule == '0 3 * * *' || inputs.scenario == 'soak-short'
  steps:
    - checkout / setup-node / install k6
    - 启动 target API
    - npm run k6:soak:short
    - upload-artifact (name=nightly-soak-{date}, retention-days=30)

weekly-capacity:
  if: github.event.schedule == '0 6 * * 0' || inputs.scenario == 'capacity'
  steps:
    - 同上,执行 capacity.k6.js
    - upload-artifact (name=weekly-capacity-{date}, retention-days=30)
```

**并发控制 (R-29 风险缓解)**:
- `concurrency.group: nightly-soak-${{ github.workflow }}`
- `cancel-in-progress: false` (定时任务不允许互相取消,后到者排队等待)

**默认目录**:
- `defaults.run.working-directory: performance-testing-platform` (与 `performance-ci.yml` 保持一致)

**验证测试 (已存在,断言更名为文件存在)**:
- `SCHED-01` actionlint 通过(可选,本仓库未引入 actionlint,改为人工 review + 现有 `repo-meta-ci.yml` 的 yaml lint)
- `SCHED-02/03` cron 字面量正确(已有单测)
- `SCHED-04` retention-days: 30 (workflow 内显式声明)

### 3.3 基线回归 PR 评论(PERF-CI-BL-FR-002 → 增强为 PR 可见)

**变更**: `.github/workflows/performance-ci.yml` 的 `baseline-compare` job

**新增 step**: 当 PR 事件 + `comparison-result.json` 包含 `status=WARNING/FAIL` 时,通过 `actions/github-script@v7` 发布 sticky 评论。

Marker: `<!-- perf-baseline-comment -->`

- 状态 PASS: 不发评论(避免噪音)
- 状态 WARNING: ⚠️ 文案 + delta 百分比
- 状态 FAIL: ❌ 文案 + delta 百分比 + 提醒检查

**与现有 trend 评论解耦**: 使用独立 marker,不互相覆盖。

**权限**: baseline-compare job 增加 `pull-requests: write`(与 trend-collect 一致)。

### 3.4 文档同步

- `docs/qa/rtm.md`: SCHED 与 COV 行的状态注释补一条 "实施日期 2026-05-25 闭环 #135"
- `docs/project-management/risks.md`: R-29 状态保持 🟡(并发互锁已生效)
- `CLAUDE.md` (root): 新增 `Nightly Soak` workflow 行
- 本设计文档:实施完成后更新状态为 ✅ Done

---

## 4. Out of Scope

| 项 | 原因 |
|----|------|
| rate-limit / breakpoint 加入 PR gate | rate-limit 需启动副本 API(`RATE_LIMIT_ENABLED=true`),breakpoint 探测极限耗时 5+ 分钟,均不适合 PR 关键路径。建议后续 issue 将其纳入 nightly-soak.yml 的第三个 job。 |
| Coverage diff PR comment(Codecov) | `phase7-cicd.md §7.4` 明确将 Codecov/Coveralls 列为 Out of Scope。 |
| 通用测试结果 summary PR comment | trend + baseline 评论已能覆盖主要性能回归视角;额外 summary 边际收益低。 |

这些项创建独立 follow-up issue 跟踪,不在本次 PR 内交付。

---

## 5. 验证计划

| 步骤 | 命令 | 期望 |
|------|------|------|
| Lint | `cd performance-testing-platform && npm run lint` | exit 0 |
| Format | `npm run format:check` | exit 0 |
| 单测 + 覆盖率 | `npm run test:coverage` | 全部通过,**新阈值不触发 fail** |
| YAML 语法 | `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/nightly-soak.yml','utf8'))"` 或 GitHub Actions 自身 lint | 无语法错误 |
| Repo-meta CI | PR 触发后 `.github/workflows/repo-meta-ci.yml` 自动跑 yaml/json lint | 绿灯 |

---

## 6. 实施 Checklist

- [x] 创建本设计文档 — `phase7-gap-remediation-design.md` 已交付
- [x] 修改 `jest.config.js` 阈值 — 当前为 `statements:80, branches:70, functions:80, lines:80`
- [x] 创建 `.github/workflows/nightly-soak.yml` — workflow 文件已存在(4.6 KB),包含 nightly soak + weekly capacity + artifact retention 30 天
- [x] 修改 `performance-ci.yml` baseline-compare,新增 PR 评论 step — `baseline-compare` job 已含 `pull-requests: write` 权限和 `actions/github-script@v7` step,marker 为 `<!-- perf-baseline-comment -->`
- [x] 更新 `docs/qa/rtm.md` 备注 — `PERF-CI-COV-FR-003` / `PERF-CI-SCHED-FR-001~002` / `PERF-CI-BL-FR-001~002,006` 三行已加 "(#135 闭环 2026-05-25)" 注释
- [x] 根 `CLAUDE.md` GitHub Actions 表已注册 `nightly-soak.yml`
- [ ] **人工验证项**: 本地 `npm run lint` + `npm run test:coverage` 验证(见下方 §7)
- [ ] **人工验证项**: codeql_checker 复核(见下方 §7)
- [ ] **人工验证项**: PR #257 触发 `performance-ci.yml`,确认基线评论可见

---

## 7. 人工验证指引

闭环最后三项需要人工执行验证,验证通过后将本文档状态改为 ✅ Done 并关闭 Issue #135。

### 7.1 本地 lint + 覆盖率门禁验证

```bash
cd performance-testing-platform
npm run lint            # 期望: exit 0,无 ESLint 错误
npm run format:check    # 期望: exit 0,Prettier 格式合规
npm run test:coverage   # 期望: 148/148 单测通过;
                        # 覆盖率应远超阈值(实测 statements 95.77% / branches 90.54% / functions 100% / lines 97.09%)
```

**验收标准**: 三条命令 exit code 全部为 0,Jest 输出末尾的 `Coverage threshold for branches/functions/lines/statements` 全部为 ✅ 而不是 ❌。

### 7.2 nightly-soak workflow 手动触发验证

```bash
gh workflow run nightly-soak.yml -f scenario=soak-short
gh run watch                                              # 等待结束
gh run view --log                                         # 查看 artifact 是否上传成功
```

**验收标准**: workflow 运行成功,artifact 名为 `nightly-soak-<日期>`,retention 显示 30 天。

### 7.3 baseline PR 评论可见性验证

1. 在 `performance-ci.yml` 触发的最近一个 PR(如 #257 或本 PR)中,查看 Conversation 时间线
2. 确认有以 `<!-- perf-baseline-comment -->` 为 marker 的 sticky 评论(状态 PASS 时不发评论,WARNING/FAIL 时发)
3. 若没有评论且 baseline-compare job 显示 PASS,属正常(避免噪音)
4. 若要主动验证评论逻辑,可在临时分支故意让 p95 退化(如降低 SLA 阈值)推一次 PR

**验收标准**: 至少观察到一次基线评论被正确发布,或确认 PASS 路径下静默(查看 Actions log 中 `actions/github-script` step 的输出)。

### 7.4 收尾动作(全部验证通过后)

```bash
# 1. 把本文档第 6 节最后三项 [ ] 改为 [x]
# 2. 把文档顶部状态由 "🟢 代码实施完成,待人工最终验证" 改为 "✅ Done"
# 3. 更新 "最后更新" 日期为验证当天
# 4. 关闭 Issue #135 并附完成摘要
gh issue close 135 --comment "Phase 7 收尾差距已闭环。本地验证记录:..."
```

---

**最后更新**: 2026-05-25
