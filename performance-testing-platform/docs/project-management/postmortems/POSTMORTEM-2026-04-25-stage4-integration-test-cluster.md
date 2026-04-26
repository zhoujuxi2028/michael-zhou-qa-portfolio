# POSTMORTEM-2026-04-25 — Stage 4 集成测试 #192–#195 集群事件复盘

> **事件窗口**: 2026-04-23 ~ 2026-04-24（本地 +08:00）
> **影响范围**: `performance-testing-platform` Stage 4 集成测试（setup → Phase 1 Grafana → Phase 7 Soak）
> **严重级别**: P1（Setup/Phase 阻塞，本地回归 flaky）
> **状态**: ✅ 全部修复已合入 `main`
> **关联 Issue**: [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) · [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193) · [#194](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/194) · [#195](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/195)
> **关联 RCA**: [RCA-2026-04-24-issue-192-193-grafana-readiness.md](RCA-2026-04-24-issue-192-193-grafana-readiness.md)
> **关联 Defect 登记**: [stage4-defect-waiver-register.md](../../qa/stage4-defect-waiver-register.md) DEF-001 ~ DEF-004

---

## 1. 事件摘要

Stage 4 集成测试 `bash scripts/integration-test.sh` 在一次本地全量执行中连续暴露 **4 个独立但同源** 的缺陷：

| Issue | 缺陷 | 阶段 | 现象 |
|-------|------|------|------|
| #192 | Grafana readiness 60s 超时 | setup | `wait_for_endpoint` 超时退出，setup CRITICAL FAILURE |
| #193 | `docker-compose.yml` 顶层 `version: '3.8'` 已废弃 | setup | Docker Compose v2 输出 WARN，污染日志 |
| #194 | JM-GRF-01 `http_req_failed` 86.66% | Phase 1 | k6 smoke 阈值与"基础设施联动断言"耦合，应用层 5xx 把基础设施判为 NG |
| #195 | K6-SOAK-INT-01 同时 FAIL + PASS | Phase 7 | `--vus`/`--duration` 覆盖 named scenario 配置，`default` 导出找不到；后续 custom metric 查询命中历史数据 |

四个 issue 一次运行全部触发，导致 Stage 4 验收无法继续；本地多次复跑结果不一致，验收结论不可信。

---

## 2. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-23 08:02 | 本地执行 `bash scripts/integration-test.sh`，setup 阶段 60s 超时 |
| 2026-04-23 08:08 | 提交 #192（Grafana readiness） |
| 2026-04-23 08:15 | 提交 #193（version 字段警告）、#194（JM-GRF-01）、#195（K6-SOAK-INT-01） |
| 2026-04-23 08:08 | 4 个缺陷登记进 `stage4-defect-waiver-register.md` (DEF-001 ~ DEF-004) |
| 2026-04-23 09:38 | PR #196（Copilot agent）提交合并修复，merge 进 `feature/performance-testing` 分支 |
| 2026-04-24 01:13 | commit `21491fe` 修复 DEF-003/DEF-004（#194/#195），并通过 `459b1b3` 合入 `main` |
| 2026-04-24 02:59 | commit `a8bb23f` 修复 DEF-001/DEF-002（#192/#193），合入 `feature/performance-testing` |
| 2026-04-25 早 | 漏合检查：发现 `a8bb23f` 未到 `main`；通过 PR #209（commit `c6fd7f8`）补合到 `main`，分层 Grafana readiness + 删除 `version` 字段 |
| 2026-04-25 | 创建本 Postmortem，归并防复发 Action Items |

---

## 3. 直接原因（按 issue 拆分）

| Issue | 直接原因 |
|-------|---------|
| #192 | `scripts/lib/setup.sh` 中 `wait_for_endpoint` timeout 硬编码 60s；grafana service 无 Docker `healthcheck`，setup 只能裸轮询 |
| #193 | `docker-compose.yml` 顶层保留 v1 时代字段 `version: '3.8'`，Docker Compose v2 已忽略并 WARN |
| #194 | `tests/integration/phases/phase-1-grafana.sh` 通过 k6 smoke 同时承担两件事：(a) 跑流量驱动 Grafana/InfluxDB；(b) 用 `http_req_failed<1%` 阈值判定整体健康。任一应用层 5xx 把基础设施判为 NG |
| #195 | `scripts/integration-test-phase7-soak.sh` 用 `--vus`/`--duration` CLI 覆盖了 `soak-short.k6.js` 的 `options.scenarios`，k6 回退到默认 executor 后找不到 `default` 导出函数；同一 case 还做了一段 InfluxDB custom metric 查询，命中历史数据 → "先 FAIL 后 PASS" 矛盾输出 |

---

## 4. 根本原因 — 两条系统性弱点

四个缺陷收敛到 **两条贯穿测试栈的系统性弱点**：

### S1 · 集成测试断言层错配（Assertion-Layer Misalignment）

> 典型样本：#194、#195

集成测试用单一 k6 跑批同时承担"驱动流量"与"健康判定"，且把"应用层错误率/默认 executor 假设"当成"基础设施健康"指标。任何上层抖动都会污染下层结论。

| 表现 | 反映的设计缺陷 |
|------|--------------|
| 应用 5xx 让基础设施判 NG（#194） | 断言对象错位：基础设施层应只校验"指标是否进入 InfluxDB / Grafana 数据源是否健康" |
| `--vus`/`--duration` 覆盖 named scenario（#195） | 测试驱动方式与脚本契约耦合，缺少 wrapper 层做契约校验 |
| 同 case 输出 FAIL+PASS（#195） | 单 case 多判定路径未串行收敛到唯一 verdict |

**根因（5-Why 终点）**：集成测试缺少"基础设施层 vs 应用层"的分层断言模型；同一 case 内允许并存多套判定路径而无强制收敛规则。

### S2 · 依赖升级缺 preflight 体检（Dependency-Upgrade Preflight Gap）

> 典型样本：#192、#193

依赖工具（Docker Compose、Grafana、k6）跨大版本演进时，旧配置/旧经验值未被强制审查，问题以 WARN/超时形式延后爆发。

| 表现 | 反映的工程缺陷 |
|------|--------------|
| `version: '3.8'` 残留（#193） | Compose v1 → v2 升级未配套配置体检；WARN 不阻塞 → 长期被忽略 |
| 60s 硬编码超时（#192） | 超时阈值是裸常量，未与 Docker `healthcheck` 联动，缺少跨环境（本地高配 / CI 低配 / 冷启动）启动耗时基线 |
| Grafana 升级到 10.2.0 后冷启动 70~90s | 升级时未跑"启动耗时回归"，容器 started ≠ API ready |

**根因（5-Why 终点）**：缺少在 setup 之前运行的 preflight 体检层；依赖工具/容器升级没有强制 lint + 健康基线回归门禁。

### S1 与 S2 的合流

`integration-test.sh` 是一条**没有缓冲层**的串联流水线：setup 直接进 Phase 1 直接进 Phase 7。S2 让 setup 在低资源/版本变化场景下不稳定，S1 让 Phase 1/7 的判定结果不可信，二者叠加把"flaky 集成测试"放大成"无法验收"。

---

## 5. 修复内容（已落地 main）

| Issue | 文件 | 关键修复 |
|-------|------|---------|
| #192 | `docker-compose.yml` | grafana 增加 `healthcheck`（30s start_period / 10s interval / 12 retries） |
| #192 | `scripts/lib/setup.sh` | `wait_for_endpoint` Grafana timeout 60 → 120s；后续抽出 `GRAFANA_HOST/PORT/READY_TIMEOUT` 常量并加分层 readiness + 诊断日志（commit `c6fd7f8` / `e3859ec`） |
| #193 | `docker-compose.yml` | 删除顶层 `version: '3.8'` |
| #194 | `tests/integration/phases/phase-1-grafana.sh` | k6 smoke 加 `--no-thresholds`；JM-GRF-01 断言改为"InfluxDB 指标计数是否增长"，与应用层错误率解耦 |
| #195 | `scripts/integration-test-phase7-soak.sh` | 移除 `--vus`/`--duration` CLI；改用 `SOAK_SHORT_RAMP_UP_DURATION` / `SOAK_SHORT_STEADY_DURATION` 等 env vars；custom metric 查询改为仅在主断言 PASS 后条件执行，单 case 单 verdict |

> 完整 5-Why 因果链与修复 diff 详见 [RCA-2026-04-24-issue-192-193-grafana-readiness.md](RCA-2026-04-24-issue-192-193-grafana-readiness.md)（#192/#193）以及 commit `21491fe` 的 message（#194/#195）。

---

## 6. 用户影响

| 维度 | 影响 |
|------|------|
| Stage 4 验收 | 集成测试无法跑完整链路，验收 gate 间歇性 BLOCKED |
| 本地开发回归 | 同一 case 同次运行输出相互矛盾，开发难以判断真实功能状态 |
| 文档可信度 | Stage 4 reports 数据需要重跑才能信任 |
| 工时损耗 | 估计 0.5–1 人日（单次 setup 失败需 5–10 min 重跑，叠加多次复现） |
| 数据丢失 | 无（仅测试运行被打断） |

---

## 7. 做得好的地方

- 4 个缺陷被**当场捕获并在同一天内逐条提 issue + 登记 defect register**，时间线可追溯
- DEF-001 ~ DEF-004 在 register 中既登记又随修复 close，闭环完整
- #192/#193 已沉淀 RCA，不重复造轮子
- Phase 7 soak 的"矛盾输出"被作为 register 显式规则（"同 case 既 FAIL 又 PASS → 默认 BLOCKED"）固化下来

## 8. 做得不好的地方

- **修复路径分裂**：#192/#193 修复一度只到 `feature/performance-testing`，未及时 land 到 `main`，需要事后补合
- **没有 preflight 防线**：4 个缺陷里 3 个本可在 setup 之前由 lint/health 体检拦下
- **断言耦合是设计问题**：JM-GRF-01 设计时就埋了"应用层错误率污染基础设施判定"的雷
- **超时常量裸散落**：每次问题都靠"再加 60 秒"打补丁，没有集中配置 + 历史 P95 基线

---

## 9. Action Items（防复发）

> Owner / 截止日待 QA Lead 在 review 中补齐；本表为防复发措施清单。

### 9.1 针对 S1（断言层错配）

| ID | 类别 | Action | DoD（Definition of Done） |
|----|------|--------|--------------------------|
| AI-1 | 测试设计 | 集成测试明文区分"基础设施层断言"与"应用层断言"，每个用例只允许一类主判定 | `phase-1-grafana.sh` 重构为：(a) INFRA-GRF-01 仅校验 Grafana datasource healthy + InfluxDB 指标计数增长；(b) APP-GRF-01 单独跑 k6 smoke 收集错误率，**不参与 gate 判定** |
| AI-2 | 测试守护 | 给所有 k6 集成 wrapper 加 lint：禁止同时使用 `--vus`/`--duration` 与 `options.scenarios`；命中即退出并打印诊断 | wrapper 中加 grep + bats 用例覆盖；故意写错 wrapper 触发非零退出 |
| AI-3 | 测试设计 | 单 case 单 verdict：禁止"先失败后成功"的多段输出；如需多重校验，必须串行收敛到唯一 exit code | 在 `scripts/lib/report.sh` 增加 `assert_single_verdict` helper；Phase 7 soak 用之 |
| AI-4 | 文档 | 在 `docs/qa/test-plan.md` 增加 "Assertion Layering" 章节，固化基础设施 vs 应用层断言规约 | test-plan.md 新增章节并在 PR review checklist 引用 |

### 9.2 针对 S2（依赖升级缺 preflight 体检）

| ID | 类别 | Action | DoD |
|----|------|--------|-----|
| AI-5 | 守护 | `scripts/preflight-check.sh` 增加 `docker compose config --quiet` 校验，发现 WARN/ERROR 即退出 | 故意改坏 `docker-compose.yml`（如恢复 `version`）触发 preflight 失败 |
| AI-6 | 守护 | 所有依赖容器（grafana / influxdb / api）补齐 Docker `healthcheck`；上层依赖改用 `depends_on: condition: service_healthy` 替代裸轮询 | `docker compose ps` 全部显示 `(healthy)` 才进 Phase 1 |
| AI-7 | 可观测性 | 把所有 readiness timeout 抽到 `scripts/lib/timeouts.conf`（默认 120s + per-service override），setup 结束打印各 service 实际就绪耗时 | 连续 5 次本地运行积累 P95 数据；timeout = max(P95×2, 120s) |
| AI-8 | 流程 | 任一依赖工具/镜像版本升级（Docker Compose、Grafana、InfluxDB、k6、Node）必须在同一 PR 跑一次 `integration-test.sh` 全流程；CHANGELOG 记录"启动耗时基线" | PR 模板新增"依赖升级体检"勾选项 |

### 9.3 流程红线

| ID | Action | DoD |
|----|--------|-----|
| AI-9 | 修复必须 land 到 `main` 才允许 close issue；feature 分支 merge 不算闭环 | 写入 `CONTRIBUTING.md` / 项目 `CLAUDE.md`；本次事件就是反例 |
| AI-10 | 集成类 issue close 前必须在 register 标 Closed + 绑定 main commit hash | `stage4-defect-waiver-register.md` 已示范，固化为模板 |

---

## 10. 关闭批次（本次执行）

| 批次 | Issue | 决策 | 关闭依据 |
|------|-------|------|---------|
| 第一批：直接关闭 | #194, #195 | ✅ Close | 修复 commit `21491fe` 已通过 `459b1b3` 合入 main；defect register DEF-003/DEF-004 已标 Fixed |
| 第二批：验证后关闭 | #192, #193 | ✅ Close | 修复 `502b52c`/`c6fd7f8` 已合入 main：`docker-compose.yml` 无 `version` 字段且 grafana 含 `healthcheck`；`scripts/lib/setup.sh` Grafana readiness timeout 已为 120s |

> 本 PR 描述使用 `Closes #192 #193 #194 #195` 触发 GitHub 在 merge 时自动关闭。

---

## 11. Lessons Learned（一句话版）

1. **集成测试断言一定要分层**：不要让"应用层错误率"污染"基础设施健康"判定。
2. **依赖升级必须配套 preflight 体检**：`docker compose config` / `healthcheck` / 启动耗时基线缺一不可。
3. **修复在 feature 分支 merge ≠ 修复完成**：必须落到 `main` 并验证后才能 close issue。
4. **超时不是参数，是契约**：每次"再加 60 秒"都是欠的债，应基于历史 P95 + 安全系数集中管理。
5. **单 case 单 verdict**：同一用例不允许出现 FAIL 与 PASS 并存的混合输出。

---

## 12. 关联文件

- `performance-testing-platform/docker-compose.yml`
- `performance-testing-platform/scripts/lib/setup.sh`
- `performance-testing-platform/scripts/integration-test-phase7-soak.sh`
- `performance-testing-platform/tests/integration/phases/phase-1-grafana.sh`
- `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md`
- `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md`
