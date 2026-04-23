# RCA & Postmortem — Issues #192 / #193 / #194 / #195

**日期：** 2026-04-23  
**影响范围：** `bash scripts/integration-test.sh` 全流程（Stage 4 验收被阻塞）  
**严重级别：** P1（#192 #194 #195）/ P2（#193）  
**状态：** ✅ 已修复并验证

---

## 1. 摘要

执行 `bash scripts/integration-test.sh` 时出现四处相互关联的失败，导致 Stage 4 无法通过验收：

| Issue | 简述 |
|-------|------|
| #192 | Grafana readiness 60s 超时，容器冷启动常超此值 |
| #193 | `docker-compose.yml` 保留废弃 `version` 字段，产生持续告警噪音 |
| #194 | Phase 1 在 API 服务就绪前直接运行 k6，导致大量 `Connection refused` |
| #195 | k6 `--vus/--duration` 与 soak-short.k6.js 的 scenarios 配置冲突；K6-SOAK-INT-01 输出互相矛盾的 PASS/FAIL |

---

## 2. 根因分析（RCA）

### #192 — Grafana readiness 超时

**根因：** `scripts/lib/setup.sh` 和 `tests/integration/phases/phase-1-grafana.sh` 均将 `wait_for_endpoint` 超时设为 60s。Grafana 10.2.0 镜像在冷启动（包括插件加载、数据源初始化）时需要 60–90s，超出限制后测试无条件退出。

**修复：** 将两处超时从 `60` → `120` 秒。

---

### #193 — docker-compose.yml version 字段

**根因：** Docker Compose v2（Compose specification）已废弃顶层 `version` 字段；保留该字段不影响执行，但每次运行都输出 `WARN … attribute 'version' is obsolete`，增加日志噪音，影响排障。

**修复：** 删除 `version: '3.8'` 行。

---

### #194 — k6 在 API 未就绪时发起请求

**根因：** Phase 1 的执行顺序是：

```
Start Grafana + InfluxDB → Wait Grafana Ready → Start API → k6 run
```

`scripts/server.sh start` 的健康检查最多等待 5s（25 × 0.2s），如果 5s 内 API 未响应则仅打印警告并继续。k6 随后立即发起请求，命中 `Connection refused`，导致 `http_req_failed` 高达 86.66%，触发 `rate<0.01` 阈值失败（JM-GRF-01 failed）。

**修复：** 在 `Start API` 之后增加 `wait_for_endpoint 'http://localhost:3000/health' 'http_code' 30`，确保 API 就绪后再运行 k6。

---

### #195 — k6 --vus/--duration 与 scenarios 冲突

**根因：**  

`scripts/integration-test-phase7-soak.sh` 调用：

```bash
k6 run --vus $SOAK_VUS --duration $SOAK_DURATION tests/performance/soak-short.k6.js
```

但 `soak-short.k6.js` 通过 `buildScenarioProfile('soak', {...})` 声明了自定义 scenarios（`executor: ramping-vus`，`exec: runSoakShortLoad`）。k6 的规则是：当脚本 `options` 中定义了 `scenarios`，CLI 传入 `--vus/--duration` 会强制切换为 default executor，要求脚本必须导出 `default` 函数；而该脚本只导出 `runSoakShortLoad`。因此 k6 报错：

```
function 'default' not found in exports
```

**次生问题（矛盾报告）：** 由于 k6 配置错误导致脚本整体失败，baseline 与 final 计数相同（`InfluxDB metrics not written`），`K6-SOAK-INT-01` 先被标记为 FAIL；随后代码继续检查 custom metrics（`soak_heap_used_mb`），若已存在历史数据则报 PASS——同一测试 ID 在一次运行中同时输出 PASS/FAIL，导致判定不可信。

**修复：**  
1. 移除 `--vus` 和 `--duration` CLI 标志，改通过 env vars 传递持续时间（`SOAK_SHORT_RAMP_UP_DURATION`、`SOAK_SHORT_STEADY_DURATION`、`SOAK_SHORT_RAMP_DOWN_DURATION`）。  
2. 重构 K6-SOAK-INT-01 判定逻辑：primary check（metric count 增长）失败时，fallback 检查 custom metrics，最终只输出**一个**唯一判定。

---

### 日志保留 — 无限增长问题

**背景：** 每次运行 `integration-test.sh` 在 `tests/integration/logs/` 下生成 `.log`、`.md`、`.json` 三组文件，且从未清理，长期运行后目录无限膨胀。

**修复：** 在 `scripts/lib/report.sh` 中实现 `prune_old_logs()`，每次 `report_phase()` 执行后保留最新 3 组（log/md/json），删除更旧的文件及对应 `snapshots/` 子目录。开发流程遵循 TDD：先写单元测试（5 个用例），再实现函数。

---

## 3. 时间线

| 时间 | 事件 |
|------|------|
| 2026-04-23 16:02 | 本地执行 `bash scripts/integration-test.sh`，Grafana readiness 60s 超时 |
| 2026-04-23 16:06 | 提高超时后重试，JM-GRF-01 因 API 未就绪导致高失败率 |
| 2026-04-23 16:07 | Phase 4 soak 报告 k6 配置错误 + K6-SOAK-INT-01 矛盾判定 |
| 2026-04-23 08:08–08:15 | 提交 Issues #192–#195 |
| 2026-04-23 09:20 | 开始修复，TDD 实现 prune_old_logs，全部单元测试通过（362/362） |

---

## 4. 修复文件清单

| 文件 | 变更 |
|------|------|
| `docker-compose.yml` | 删除 `version: '3.8'`（#193） |
| `scripts/lib/setup.sh` | Grafana readiness 超时 60→120s（#192） |
| `tests/integration/phases/phase-1-grafana.sh` | Grafana 超时 60→120s；增加 API readiness wait（#192 #194） |
| `scripts/integration-test-phase7-soak.sh` | 移除 --vus/--duration；单一 K6-SOAK-INT-01 判定（#195） |
| `scripts/lib/report.sh` | 实现 `prune_old_logs(3)`；从 `report_phase()` 调用 |
| `tests/unit/scripts/prune-logs.test.js` | TDD 单元测试（5 个用例，全部 PASS） |

---

## 5. 预防措施

1. **超时配置** 应从实测冷启动时间出发设定，并留有 2× 余量。
2. **服务就绪验证** 应在 `server.sh start` 之后的 `integration-test` 流程中显式 wait，不依赖 server.sh 内部的短暂轮询。
3. **k6 CLI flags 与 options 互斥规则** 应写入 `docs/guides/k6-scenarios.md`：scenarios 脚本禁用 `--vus/--duration`。
4. **测试判定唯一性原则**：同一测试 ID 在一次运行中只允许有一个最终 verdict（PASS/FAIL）；中间状态应以 `log_warn` 或 `log_debug` 输出。
5. **日志清理策略** 应在 `report_phase()` 末尾自动执行，避免目录无限膨胀。
