# Stage 4 Defect & Waiver Register

> **项目:** Performance Testing Platform  
> **维护人:** QA Lead  
> **更新规则:** 每次 Stage 4 Gate 执行时同步更新；issue 关闭后标记 Closed，保留历史行  
> **相关文档:** [Gate Template](../gates/stage4-template.md) | [项目级缺陷登记](register.md) | [测试计划](../test-plan.md)

---

## 严重度定义

| 级别              | 含义                              | Gate 影响                               |
| ----------------- | --------------------------------- | --------------------------------------- |
| **P0 / Critical** | 核心功能不可用，数据不可信        | 立即 BLOCKED，必须修复后重新执行        |
| **P1 / High**     | 重要功能降级，影响验收结论        | 标记 Blocking 时 BLOCKED；否则可 waiver |
| **P2 / Medium**   | 非核心功能异常，有合理 workaround | 不阻塞，可 waiver                       |
| **P3 / Low**      | 轻微问题，不影响功能或结论        | 不阻塞，记录即可                        |

---

## 矛盾结果处理规则

> 同一用例输出"既 FAIL 又 PASS"时，**默认 BLOCKED**，直至根因明确。  
> 需在本表登记，说明两段输出的来源与差异。

---

## 活跃缺陷登记表（Active Defects）

| Defect ID | GitHub Issue                                                                 | 标题摘要                                                               | 严重度    | Blocking?                    | 发现日期   | 状态               | 关联 Waiver | 备注                                                                                                                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------- | ---------------------------- | ---------- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-001   | [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) | Grafana readiness 超时（集成测试 setup 阶段）                          | P1 / High | ⚠️ 条件性 Blocking（若复现） | 2026-04-23 | ✅ Closed          | —           | 修复：grafana 添加 healthcheck；timeout 60→120s                                                                                                                                                                                                                                                                           |
| DEF-002   | [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193) | `docker-compose.yml` `version` 字段过时警告                            | P3 / Low  | ❌ Non-blocking              | 2026-04-23 | ✅ Closed          | WAV-001     | 修复：删除顶层 `version: '3.8'` 字段                                                                                                                                                                                                                                                                                      |
| DEF-003   | [#194](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/194) | JM-GRF-01 失败（Grafana 集成阶段 k6 http_req_failed 86.66%）           | P1 / High | ✅ Blocking                  | 2026-04-23 | 🟢 Fixed           | —           | 根因：k6 smoke 阈值与 Grafana 集成断言耦合。修复：加 `--no-thresholds` + InfluxDB 指标计数断言。Commit: _(本次)_                                                                                                                                                                                                          |
| DEF-004   | [#195](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/195) | K6-SOAK-INT-01 结果矛盾（metrics not written vs custom metrics found） | P1 / High | ✅ Blocking                  | 2026-04-23 | 🟢 Fixed           | —           | 根因：`--vus`/`--duration` 覆盖 named scenario，找不到 `default` 导出。修复：改用 env vars 配置时长；第二段 check 改为条件执行。Commit: _(本次)_                                                                                                                                                                          |
| DEF-005   | [#215](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/215) | Phase 6 rate limiter pipeline 因 `grep -q` SIGPIPE 误判为 FAIL         | P1 / High | ✅ Blocking                  | 2026-04-26 | 🟢 Fixed           | —           | 根因：`tests/integration/phases/phase-6-rate-limiter.sh` 在 `set -o pipefail` 下使用 `npm ... 2>&1 \| grep -q "rate limited (429)"`，`grep -q` 命中后提前退出导致上游 SIGPIPE，pipeline 返回 141。修复：改为先把 k6 输出落盘再 grep，按业务信号 `rate limited (429)` 判 PASS，npm 退出码非零仅记录 WARN。Commit: _(本次)_ |
| DEF-011   | [#230](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/230) | `baseline-export.js` 不兼容当前 k6 summary `p(95)` 字段                | P1 / High | ✅ Blocking                  | 2026-04-27 | 🟡 Fix in progress | —           | 阻塞 `npm run baseline:export`，导致本机 `reports/baseline.json` 无法生成。修复方向：兼容 k6 summary `values['p(95)']`、`http_req_failed.value` 与 `http_reqs.count`                                                                                                                                                      |

---

## Waiver 登记表

> Waiver 仅用于 **P2/P3** 级别，或经过充分论证的 P1 非核心缺陷。  
> P0 缺陷**不得** waiver。

| Waiver ID | 关联 Defect | 关联 Issue | 豁免理由                                                                                            | 风险评估         | 审批人 | 审批日期   | 有效期 | 状态                    |
| --------- | ----------- | ---------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ | ---------- | ------ | ----------------------- |
| WAV-001   | DEF-002     | #193       | `version` 字段为废弃 warning，Docker Compose 已忽略该字段，容器行为不受影响；已随 #193 修复直接删除 | 极低：无功能影响 | QA     | 2026-04-24 | —      | ✅ 已关闭（随修复失效） |

---

## 已关闭缺陷历史（Closed Defects）

> 关闭后保留记录，供审计追溯。

| Defect ID | GitHub Issue                                                                 | 标题摘要                                                       | 严重度    | 关闭日期   | 关闭方式                                                         | 关联 Commit                        |
| --------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- | ---------- | ---------------------------------------------------------------- | ---------------------------------- |
| DEF-001   | [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) | Grafana readiness 超时                                         | P1 / High | 2026-04-24 | 代码修复（healthcheck + timeout 120s）                           | fix/issue-192-193                  |
| DEF-002   | [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193) | docker-compose.yml version 字段过时                            | P3 / Low  | 2026-04-24 | 代码修复（删除 version 字段）                                    | fix/issue-192-193                  |
| DEF-003   | [#194](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/194) | JM-GRF-01 k6 阈值与 InfluxDB 断言耦合                          | P1        | 2026-04-24 | 修复：`--no-thresholds` + metric count 断言                      | _(见 feature/performance-testing)_ |
| DEF-004   | [#195](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/195) | K6-SOAK-INT-01 named scenario exec 函数找不到 + 矛盾输出       | P1        | 2026-04-24 | 修复：env vars 替代 `--vus`/`--duration`；条件化第二段 check     | _(见 feature/performance-testing)_ |
| DEF-010   | [#215](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/215) | Phase 6 rate limiter pipeline 因 `grep -q` SIGPIPE 误判为 FAIL | P1 / High | 2026-04-26 | 修复：k6 输出先落盘再 grep，避免 `pipefail` 捕获上游 SIGPIPE 141 | `950ceb00`                         |

---

## Phase 6 历史遗留问题（已关闭）

| Issue | 问题描述                                          | 关闭方式                               | Commit                                                    |
| ----- | ------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| #105  | Rate limiter env binding — 模块加载时读取 env var | 修复：改为 request-time check          | ce5c094b                                                  |
| #106  | k6 JSONL 格式不兼容 generate-summary.sh           | 修复：添加格式检测 + graceful fallback | acf21e92                                                  |
| #107  | 集成测试端口冲突                                  | 修复：显式 stop/start + sleep 延迟     | 698d7082                                                  |
| #114  | Breakpoint validation 缺失                        | 补充：ENT-BREAKPOINT-01/02 验收标准    | 681513bc                                                  |
| #116  | ENT-CONSISTENCY & ENT-RESILIENCE-03 验收缺失      | 补充：CONS-01~05, RESIL-03 验收表格    | _(已归档至 reports/phase6-stage4-verification-report.md)_ |

---

## 变更日志

| 日期       | 变更内容                                                                               | 操作人 |
| ---------- | -------------------------------------------------------------------------------------- | ------ |
| 2026-04-24 | 初始建表；登记 DEF-001~004（源自 Phase 7 集成测试运行 #192~#195）；创建 WAV-001 草稿   | QA     |
| 2026-04-24 | DEF-001/DEF-002 标为 Closed（代码已修复）；WAV-001 关闭；更新 Closed 历史表            | QA     |
| 2026-04-24 | 修复 DEF-003/DEF-004，状态改为 Fixed；同步至 Closed Defects 历史                       | QA     |
| 2026-04-24 | DEF-001/DEF-002 标为 Closed（代码已修复，#192/#193）；WAV-001 关闭；更新 Closed 历史表 | QA     |
| 2026-04-26 | 将 #215 从冲突的 `DEF-005` 改为 `DEF-010`，并移入 Closed Defects 历史                  | QA     |
| 2026-04-27 | 登记 DEF-011（#230）：`baseline-export.js` 不兼容当前 k6 summary，阻塞 baseline 生成   | QA     |
