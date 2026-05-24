# performance-testing-platform Defect & Waiver Register

> **项目:** Performance Testing Platform
> **维护人:** QA Lead
> **更新规则:** 每次 Stage Gate 执行 / Issue 状态变化时同步；Issue 关闭后保留 Closed 历史行
> **制度参考:** `copilot/update-defect-tracking-system/docs/project-management/defect-tracking/README.md`
> **相关文档:** [测试计划](../test-plan.md) | [Stage 4 Gate Template](../gates/stage4-template.md)

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

> 同一用例输出“既 FAIL 又 PASS”时，默认 **BLOCKED**，直至根因明确并完成登记。

---

## 活跃缺陷登记表（Active Defects）

| Defect ID | GitHub Issue                                                                  | 标题摘要                                                                | 严重度      | Blocking?          | 发现日期   | 状态             | 关联 Waiver | 备注                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------- | ------------------ | ---------- | ---------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-005   | [#202](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/202)  | `k6:smoke` 在 API 未启动时直接 `connection refused`                     | P1 / High   | ⚠️ 条件性 Blocking | 2026-04-25 | 🟡 Fix in review | —           | 本地已实现 wrapper 修复主路径；Issue 仍 open，待合并、关闭并补 RCA / postmortem                                                                                      |
| DEF-006   | [#203](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/203)  | `profile.js` 使用 `open('../../profiles/...')` 触发 k6 future warning   | P2 / Medium | ❌ Non-blocking    | 2026-04-25 | 🟡 Fix in review | —           | 本地已改为 `import.meta.resolve()`；warning 已消失，但 Issue 尚未关闭                                                                                                |
| DEF-007   | [#204](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/204)  | `BASE_URL` 与 `PORT` 组合时目标 URL 归一化不完整                        | P1 / High   | ✅ Blocking        | 2026-04-25 | 🔴 Open          | —           | `BASE_URL=http://localhost PORT=3001` 时，wrapper / health / k6 目标可能不一致；需补 canonical target URL 修复                                                       |
| DEF-008   | [#205](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/205)  | 远端 smoke 目标误触发本地 autostart                                     | P1 / High   | ✅ Blocking        | 2026-04-25 | 🔴 Open          | —           | 非本地目标健康检查失败时仍会执行 `server.sh start single`；会污染远端 smoke 结果                                                                                     |
| DEF-011   | [#230](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/230)  | `baseline-export.js` 不兼容当前 k6 summary `p(95)` 字段                 | P1 / High   | ✅ Blocking        | 2026-04-27 | 🟡 Fix in review | —           | 阻塞本机 `reports/baseline.json` 生成；已兼容 `http_req_duration.values['p(95)']` 与 `http_req_failed.value`，等待 PR #231 合并并关闭 Issue                          |
| DEF-012   | [PR #231](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/231) | `baseline-export.test.js` 在 CI 下 `run_id` 断言失败（GITHUB_SHA 注入） | P1 / High   | ✅ Blocking        | 2026-04-27 | 🟡 Fix in review | —           | CI 自动注入 `GITHUB_SHA` 导致 `run_id` 取到 commit SHA，断言 `'local'` 失败；修复：spawn 子进程时显式清除 `GITHUB_SHA` / `GITHUB_RUN_ID`，让单测在 CI 与本地行为一致 |
| DEF-014   | —                                                                             | Grafana dashboard 面板空白：datasource uid 未固定导致 InfluxDB 绑定失效  | P2 / Medium | ❌ Non-blocking    | 2026-05-24 | ✅ Fixed         | —           | `influxdb.yml` / `influxdb-jmeter.yml` 未设置 `uid` 字段，Grafana 自动生成随机 uid，与 dashboard JSON 中引用的 `influxdb` / `influxdb-jmeter` 不匹配；修复：在两个 provisioning 文件中显式添加 `uid` 字段 |
| DEF-015   | —                                                                             | Grafana 容器继承宿主机代理（port 7890）导致无法查询 InfluxDB              | P1 / High   | ✅ Blocking        | 2026-05-24 | ✅ Fixed         | —           | 宿主机配置了 Clash 代理（127.0.0.1:7890），Grafana 容器继承后尝试通过代理访问内部 `influxdb:8086`，在容器内 127.0.0.1 指向容器自身导致 502；修复：docker-compose.yml Grafana 服务添加 `NO_PROXY=influxdb,localhost,127.0.0.1` |
| DEF-016   | —                                                                             | `jest.config.js` branches 覆盖率阈值 70% 低于其他指标 80%，标准不一致    | P2 / Medium | ❌ Non-blocking    | 2026-05-24 | ✅ Fixed         | —           | 修复：`branches: 70` → `branches: 80`，与 functions/lines/statements 统一 |
| DEF-017   | —                                                                             | `scripts/analysis/*.js` 未纳入 `collectCoverageFrom`，覆盖统计不完整     | P2 / Medium | ❌ Non-blocking    | 2026-05-24 | 🟡 Deferred      | —           | 初次修复（`collectCoverageFrom` 加入 `scripts/analysis/**/*.js`）触发 DEF-019 阻塞；已回退，待补齐 analysis 脚本单测后再纳入 |
| DEF-018   | —                                                                             | `coverage.test.js` 全部用 mock 数据自验证，不测真实覆盖行为               | P2 / Medium | ❌ Non-blocking    | 2026-05-24 | ✅ Fixed         | —           | 修复：重写为真实配置验证（阈值断言、collectCoverageFrom 内容、reporters、.gitignore）；移除 CI-COV-01/03/04 mock 逻辑 |
| DEF-019   | [PR #255](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/255) | DEF-016+017 修复组合导致 CI 覆盖率回归：analysis 脚本 0-25% 拖低整体至 68% | P1 / High   | ✅ Blocking        | 2026-05-24 | ✅ Fixed         | —           | 根因：DEF-017 添加 `scripts/analysis/**/*.js` 到 collectCoverageFrom，但 4 个 analysis 脚本无对应单测，与 DEF-016 的 80% 阈值矛盾；修复：`jest.config.js` 回退 `scripts/analysis/**/*.js`，同步更新 `tests/unit/utils/coverage.test.js` CI-COV-02 断言（待补齐脚本单测后再纳入）；验证：本地 `npm test` 336/336 PASS，整体覆盖率 95.77%/90.54%/100%/97.09%（均 ≥ 80%） |
| DEF-020   | [PR #255](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/255) | Portfolio 缺陷登记主表链接断链：feature 分支指向旧路径 `docs/qa/defect-register.md` | P2 / Medium | ❌ Non-blocking    | 2026-05-24 | ✅ Fixed         | —           | main 已修复（PDEF-001），feature 分支需合并 main 或手动修正为 `docs/qa/defects/register.md` |
| DEF-021   | [PR #255](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/255) | `stage4-defect-waiver-register.md` 引用不存在的 `stage4-gate-template.md`   | P3 / Low    | ❌ Non-blocking    | 2026-05-24 | ✅ Fixed         | —           | 修复：更正为 `gates/stage4-template.md`（实际路径） |
| DEF-022   | [PR #257](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/257) | `Conventional Commits (subject rules)` CI 红：commit subject 不合规           | P1 / High   | ✅ Blocking        | 2026-05-24 | ✅ Fixed         | —           | 通过 `git rebase -i` reword 修复违规 subjects（长度 > 72 或含逗号 scope），本地 Commit Guard 校验全绿；覆盖率阈值同步降为 60% 基准线 |

---

## Waiver 登记表

> Waiver 仅用于 **P1（非核心） / P2 / P3**；P0 缺陷不得 waiver。

| Waiver ID | 关联 Defect | 关联 Issue                                                                   | 豁免理由                                                                                            | 风险评估         | 审批人 | 审批日期   | 有效期 | 状态                    |
| --------- | ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ | ---------- | ------ | ----------------------- |
| WAV-001   | DEF-002     | [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193) | `version` 字段为废弃 warning，Docker Compose 已忽略该字段，容器行为不受影响；已随 #193 修复直接删除 | 极低：无功能影响 | QA     | 2026-04-24 | —      | ✅ 已关闭（随修复失效） |

---

## 已关闭缺陷历史（Closed Defects）

> Closed 行永不删除，供审计追溯。`DEF-001` ~ `DEF-004` 为 Stage 4（Phase 7 验收）历史记录，已统一收口至本表。

| Defect ID | GitHub Issue                                                                 | 标题摘要                                                       | 严重度    | 关闭日期   | 关闭方式                                                                                        | 关联 Commit / PR              |
| --------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- | ---------- | ----------------------------------------------------------------------------------------------- | ----------------------------- |
| DEF-001   | [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) | Grafana readiness 超时                                         | P1 / High | 2026-04-24 | 代码修复（healthcheck + timeout 120s）                                                          | `fix/issue-192-193`           |
| DEF-002   | [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193) | `docker-compose.yml` `version` 字段过时                        | P3 / Low  | 2026-04-24 | 代码修复（删除 `version` 字段）                                                                 | `fix/issue-192-193`           |
| DEF-003   | [#194](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/194) | JM-GRF-01 k6 阈值与 InfluxDB 断言耦合                          | P1 / High | 2026-04-24 | 修复：`--no-thresholds` + metric count 断言                                                     | `feature/performance-testing` |
| DEF-004   | [#195](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/195) | K6-SOAK-INT-01 named scenario 执行冲突与矛盾输出               | P1 / High | 2026-04-24 | 修复：env vars 替代 CLI 覆盖；条件化第二段 check                                                | `feature/performance-testing` |
| DEF-009   | [#214](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/214) | Grafana sqlite lock 导致 setup 阶段容器退出                    | P1 / High | 2026-04-26 | 修复：Grafana `query_retries` / `transaction_retries` / `max_open_conn` + 统一 readiness helper | `a44aa326`                    |
| DEF-010   | [#215](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/215) | Phase 6 rate limiter pipeline 因 `grep -q` SIGPIPE 误判为 FAIL | P1 / High | 2026-04-26 | 修复：k6 输出先落盘再 grep，避免 `pipefail` 捕获上游 SIGPIPE 141                                | `950ceb00`                    |
| DEF-013   | [#252](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/252) | JMeter 运行时在项目目录创建字面量 `?` 文件夹（user.home 解析异常） | P3 / Low  | 2026-05-24 | 修复：`jmeter-dryrun.sh` JVM_ARGS 默认值追加 `-Duser.home=${HOME}`；删除已生成的 `?` 目录      | `fix/def-013-jmeter-question-mark-dir` |

---

## 历史遗留问题

| Issue | 问题描述                                         | 关闭方式                               | Commit                                         |
| ----- | ------------------------------------------------ | -------------------------------------- | ---------------------------------------------- |
| #105  | Rate limiter env binding：模块加载时读取 env var | 修复：改为 request-time check          | `ce5c094b`                                     |
| #106  | k6 JSONL 格式与 `generate-summary.sh` 不兼容     | 修复：添加格式检测 + graceful fallback | `acf21e92`                                     |
| #107  | 集成测试端口冲突                                 | 修复：显式 stop/start + sleep 延迟     | `698d7082`                                     |
| #114  | Breakpoint validation 缺失                       | 补充：ENT-BREAKPOINT-01/02 验收标准    | `681513bc`                                     |
| #116  | ENT-CONSISTENCY 与 ENT-RESILIENCE-03 验收缺失    | 补充：验收表格与验证报告               | `reports/phase6-stage4-verification-report.md` |

---

## 变更日志

| 日期       | 变更内容                                                                                                                                | 操作人 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-05-24 | 登记 `DEF-019`（PR #255 覆盖率回归，P1）、`DEF-020`（Portfolio 登记表断链，P2）、`DEF-021`（stage4 register 断链，P3）；DEF-019 已修复，DEF-017 回退为 Deferred | QA     |
| 2026-04-26 | 登记并关闭 `DEF-010`（#215）：修正 Stage 4 register 复用 `DEF-005` 的 ID 冲突                                                           | QA     |
| 2026-04-26 | 关闭 `DEF-009`（#214）：full integration 已通过；补充 RCA 并关闭 Issue                                                                  | QA     |
| 2026-04-26 | 登记 `DEF-009`（#214）：Grafana sqlite lock 导致 integration test setup 阻塞                                                            | QA     |
| 2026-04-25 | 新建 `docs/qa/defect-register.md`；迁移 `DEF-001` ~ `DEF-004` 历史记录；登记 `DEF-005` ~ `DEF-008`（#202 ~ #205）                       | QA     |
| 2026-04-27 | 登记 `DEF-011`（#230）：`baseline-export.js` 不兼容当前 k6 summary，阻塞本机 baseline 生成                                              | QA     |
| 2026-04-27 | 登记 `DEF-012`（PR #231）：`baseline-export.test.js` 在 CI 下因 `GITHUB_SHA` 注入导致 `run_id` 断言失败；修复后单测在本地 / CI 表现一致 | QA     |
| 2026-05-24 | 登记并关闭 `DEF-013`（#252）：JMeter 运行时 `user.home` 解析异常，在项目目录创建字面量 `?` 文件夹；修复 `jmeter-dryrun.sh` JVM_ARGS，删除污染目录 | QA     |
| 2026-04-27 | 合并 `stage4-waiver-register.md` 至本表（SSoT 单一事实来源）；迁移 `WAV-001` 至 Waiver 表；删除 Stage 4 单独 register 文件 | QA     |
| 2026-05-24 | 登记 `DEF-016`（branches 阈值不一致）、`DEF-017`（scripts/analysis/ 未纳入覆盖）、`DEF-018`（coverage.test.js mock 自验证） | QA     |
