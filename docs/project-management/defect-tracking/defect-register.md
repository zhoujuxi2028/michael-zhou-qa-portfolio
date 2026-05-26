# Portfolio 缺陷登记主表（Defect & Waiver Register）

> **范围:** Portfolio 跨项目缺陷 + 仓库级（CI/CD、文档、流程）问题  
> **维护规则:** 每次 Issue 状态变化 24h 内同步；Closed 行保留历史，永不删除  
> **制度文档:** [README.md](README.md) | [waiver-policy.md](waiver-policy.md)  
> **项目级登记表:** 见末尾"项目级登记入口"

---

## 1. 严重度速查

| 级别 | Gate 影响 | 必须 RCA? | 可 Waiver? |
|------|-----------|-----------|------------|
| P0 / Critical | 立即 BLOCKED | ✅ | ❌ |
| P1 / High | Blocking 时 BLOCKED | ✅ | 仅非核心场景 |
| P2 / Medium | 不阻塞 | 可选 | ✅ |
| P3 / Low | 不阻塞 | 否 | ✅ |

定义详情见 [README.md §3](README.md#3-严重度定义portfolio-统一)。

---

## 2. 活跃缺陷登记表（Active Defects）

> 跨项目或仓库级问题。项目内缺陷优先登记在项目级表，重大或跨项目影响的同步登记本表。

| Defect ID | GitHub Issue | 标题摘要 | 项目 / 范围 | 严重度 | Blocking? | 发现日期 | 状态 | 关联 Waiver | 关联 RCA / Postmortem |
|-----------|--------------|----------|-------------|--------|-----------|----------|------|-------------|------------------------|
| _(暂无 Portfolio 级活跃缺陷)_ | | | | | | | | | |

> 已存在的项目级活跃缺陷请见对应项目登记表（见第 6 节"项目级登记入口"）。
>
> **2026-04-27 关注：** `performance-testing-platform/DEF-011`（PR #232 stage4 bats 硬编码路径）属于项目内缺陷，仅阻塞 PR #232 CI；未跨项目，按制度不入 Portfolio 活跃表，仅在此提示并由项目级登记表跟踪闭环。

---

## 3. Waiver 登记表（Active Waivers）

> 仅 P1 非核心 / P2 / P3 可申请 Waiver；P0 不得 Waiver。审批流程见 [waiver-policy.md](waiver-policy.md)。

| Waiver ID | 关联 Defect | 关联 Issue | 项目 / 范围 | 豁免理由 | 风险评估 | 审批人 | 审批日期 | 有效期 | 状态 |
|-----------|-------------|------------|-------------|----------|----------|--------|----------|--------|------|
| _(暂无 Portfolio 级 Waiver)_ | | | | | | | | | |

---

## 4. 已关闭缺陷历史（Closed Defects）

> Closed 行**永不删除**，供审计追溯。

| Defect ID | GitHub Issue | 标题摘要 | 项目 / 范围 | 严重度 | 关闭日期 | 关闭方式 | 关联 Commit / PR |
|-----------|--------------|----------|-------------|--------|----------|----------|-------------------|
| PDEF-001 | N/A | `defect-register.md` 指向 `performance-testing-platform/docs/qa/defect-register.md` 的 Markdown 链接断链（真实路径为 `docs/qa/defects/register.md`），导致 `Repository Meta CI / lint` 在 PR #248（run #26346106861）报红 | 仓库级 / docs 治理 | P2 | 2026-05-23 | 修正链接 + 补充 RCA | PR (本次) / [RCA](../postmortems/RCA-2026-05-23-PDEF-001-broken-markdown-link.md) |
| PDEF-002 | N/A | `cicd-demo-pr.yml` 的 `pr-gate` 汇总 job 继承 workflow 级 `defaults.run.working-directory: cicd-demo`，但该 job 不 checkout 仓库，导致 `An error occurred trying to start process '/usr/bin/bash' with working directory '.../cicd-demo'. No such file or directory`，在 PR #249（run #26346396345）`CICD Demo / PR Gate` 报红 | cicd-demo / CI | P2 | 2026-05-24 | 在 `pr-gate` job 内显式设置 `defaults.run.working-directory: .` 覆盖 workflow 级默认；补充 RCA | PR #249 / [RCA](../postmortems/RCA-2026-05-24-PDEF-002-cicd-pr-gate-working-dir.md) |
| PDEF-003 | N/A | PR #262（`copilot/feat-add-pr-pipeline`）head commit `8d3d124` subject `docs(readme): align workflow table with cicd-demo PR/Deploy pipelines (#242)` 长度 76 > 72，`Commit Guard / Conventional Commits (subject rules)` 在 run #26380345263 / job #77648244381 报红；Cloud Agent 经 `report_progress` 提交时绕过 Husky `pre-push`，原本部署的 `scripts/check-commit-guard.sh` 防线失效 | 仓库级 / CI + 流程 | P2 | 2026-05-25 | 在根 `CLAUDE.md` Git Workflow 章节固化 Agent commit subject ≤ 72 字符与字符数自查规则；附 RCA。修复 commit 自身需仓库维护者 squash-merge 或本地 force-push（Agent 受 report_progress patch-id 去重限制无法重写） | PR #262 / [RCA](../postmortems/RCA-2026-05-25-PDEF-003-commit-subject-length.md) |
| PDEF-004 | N/A | `docs/guides/label-strategy.md` 指向 `performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md` 的 Markdown 链接断链（真实路径为 `docs/qa/reports/execution/phase6-stage4-verification-report.md`），导致 PR #269 在 `Repository Meta CI / lint`（run #26429424413，job #77799391938）报红 | 仓库级 / docs 治理 | P2 | 2026-05-26 | 修正链接到 `reports/execution` 实际路径；登记缺陷并补充 RCA | PR #269 / [RCA](../postmortems/RCA-2026-05-26-PDEF-004-label-strategy-broken-link.md) |
| PDEF-004 | N/A | PR #270（`copilot/optimize-cicd-demo`）`CICD Demo / Terraform CI` 在 run #26407541306 失败：`Terraform Security` 命中 `AVD-AWS-0132 (HIGH)`（`cicd-demo/terraform/main.tf` 两处 S3 SSE 使用 `AES256` 而非 CMK），导致 `Terraform Gate` 二次失败（同次 run 内 2 个失败 job） | cicd-demo / CI + Terraform 安全基线 | P2 | 2026-05-26 | 将两个 S3 加密策略统一升级为 `aws:kms` + `kms_master_key_id`，新增 `aws_kms_key`/`aws_kms_alias`；补充 RCA | PR #270（待 cherry-pick） / [RCA](../postmortems/RCA-2026-05-26-PDEF-004-pr270-terraform-kms-gate.md) |
| PDEF-005 | N/A | DEF-023 RCA 文件中 2 处相对路径多一层 `../`（5 层而非 4 层，指向 repo 外）；`defects/register.md` 中 RCA 反链少一层 `../`（1 层而非 2 层），导致 PR #276 `Repository Meta CI / lint`（run [#26445816667](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26445816667) / job [#77851746079](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26445816667/job/77851746079)）报红 3 处断链 | 仓库级 / docs 治理 | P2 | 2026-05-26 | 修正 3 处相对路径；登记 PDEF-005（Closed） | PR #276 |

---

## 5. 跨项目模式追踪（Pattern Tracking）

> 同类缺陷季度内 ≥ 3 次时，触发专项 Postmortem（见 [README.md §7](README.md#7-与-rca--postmortem-的联动)）。

| 模式 | 触发次数（本季度） | 季度 | 关联 Defect IDs | 关联 Postmortem | 状态 |
|------|--------------------|------|-----------------|-----------------|------|
| _(无活跃模式)_ | | | | | |

---

## 6. 项目级登记入口

| 项目 | 登记表位置 | 当前活跃数 | 最近更新 |
|------|------------|-----------|---------|
| performance-testing-platform | [defects/register.md](../../../performance-testing-platform/docs/qa/defects/register.md) | 10（DEF-005、DEF-006、DEF-007、DEF-008、DEF-011、DEF-012、DEF-017、DEF-020、DEF-021、DEF-023） | 2026-05-26 |
| api-testing-demo | _(按需初始化，复制 [模板](defect-register-template.md))_ | — | — |
| playwright-demo | _(按需初始化)_ | — | — |
| selenium-demo | _(按需初始化)_ | — | — |
| iwsva-cypress-e2e | _(按需初始化)_ | — | — |
| security-testing-demo | [defect-register.md](../../../security-testing-demo/docs/qa/defect-register.md) | 1（SEC-DEF-001） | 2026-05-17 |
| k8s-auto-testing-platform | _(按需初始化)_ | — | — |
| sid-iam-testing-platform | _(按需初始化)_ | — | — |
| microservice-testing-platform | _(按需初始化)_ | — | — |
| cicd-demo | _(按需初始化)_ | — | — |
| ai-testing-platform | _(按需初始化)_ | — | — |

> 初始化步骤详见 [README.md §11](README.md#11-当前在用的项目级登记表)。

---

## 7. 变更日志

| 日期 | 变更内容 | 操作人 |
|------|----------|--------|
| 2026-05-26 | 登记并关闭 `PDEF-005`：DEF-023 RCA 文件 2 处路径多 1 层 `../`（outside repo）；`defects/register.md` RCA 反链少 1 层；3 处断链导致 PR #276 `Repository Meta CI / lint`（run #26445816667）报红；修正路径后关闭 | QA |
| 2026-05-26 | 登记 `DEF-023`（[#278](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/278)）：perf-platform `stage4-selftest-fast.bats:144` 分支白名单缺 `docs/`，PR #276 CI 红灯（run #26438598385 / job #77827370629）；Fix in review（PR #276）；pre-push 改进 PR #277；活跃数 9 → 10 | QA |
| 2026-05-26 | 登记并关闭 `PDEF-004`：`docs/guides/label-strategy.md` 指向 `phase6-stage4-verification-report.md` 的路径缺少 `execution/` 目录，导致 PR #269 的 `Repository Meta CI / lint`（run #26429424413，job #77799391938）失败；已修复链接并补充 RCA | QA |
| 2026-05-26 | 登记并关闭 `PDEF-004`：PR #270 的 `cicd-demo-terraform.yml` 安全门禁命中 `AVD-AWS-0132`，同次 run 触发 `Terraform Security` + `Terraform Gate` 双失败；修复为 S3 改用 CMK（`aws:kms` + `kms_master_key_id`）并补充 RCA | QA |
| 2026-05-25 | 同步 GitHub Issue #259（DEF-019 覆盖率回归）、#260（DEF-022 commit subject 违规）至 perf-platform 项目级登记表：均已通过 PR #257 merge 修复，按缺陷生命周期搬迁至 Closed 区并补齐 Issue 反链；perf-platform 活跃数 10 → 9 | QA |
| 2026-05-25 | 登记并关闭 `PDEF-003`（PR #262 head commit subject 长度 76 > 72，`Commit Guard` 在 run #26380345263 报红；Cloud Agent `report_progress` 路径绕过 Husky `pre-push`）；在根 `CLAUDE.md` Git Workflow 章节增加 Agent commit subject 长度自查规则，附 RCA | QA |
| 2026-05-24 | DEF-022 状态修订：Agent 已尝试 `git filter-branch` 重写违规 subject，但受 `report_progress` 自动 rebase（patch-id 去重）影响无法 force-push；建议仓库维护者改 PR #257 base → `feature/performance-testing`（1 步解锁），或本地 force-push 重写后的历史 | QA |
| 2026-05-24 | 同步 `performance-testing-platform`：登记 `DEF-019`（PR #255 覆盖率回归，P1 Blocking）、`DEF-020`（登记表断链，P2）、`DEF-021`（stage4 register 断链，P3）；活跃数更新为 9 | QA |
| 2026-05-24 | 同步 `performance-testing-platform`：登记并关闭 `DEF-013`（#252，JMeter user.home 解析异常创建 `?` 目录）；活跃数更新为 6（补录 DEF-012） | QA |
| 2026-05-24 | 登记并关闭 `PDEF-002`（`cicd-demo-pr.yml` 的 `pr-gate` job 继承 workflow 级 `working-directory: cicd-demo`，因不 checkout 仓库导致 bash 启动失败）；在 job 内显式覆盖 `working-directory: .`，附 RCA | QA |
| 2026-05-23 | 登记并关闭 `PDEF-001`（`defect-register.md` 指向 perf-platform 项目级登记表的链接断链，导致 PR #248 `Repository Meta CI` 失败）；修正链接为 `defects/register.md`，附 RCA | QA |
| 2026-05-17 | 初始化 `security-testing-demo` 项目级登记表；登记 `SEC-DEF-001`（dependency-scan job 失败） | QA |
| 2026-04-27 | 同步 `performance-testing-platform`：登记 `DEF-011`（PR #232 bats 硬编码路径），活跃数 4 → 5；附 RCA-2026-04-27 | QA |
| 2026-04-26 | 同步 `performance-testing-platform`：`DEF-009` 已关闭，活跃数调整为 4 | QA |
| 2026-04-26 | 将 `performance-testing-platform` 入口切换到 `docs/qa/defect-register.md`；同步活跃数至 5（含 `DEF-009`） | QA |
| 2026-04-25 | 初始建表；Portfolio 级跟踪系统 v1.0 落地；登记 11 个项目级入口 | QA |
