# RCA-2026-04-26 — Grafana SQLite lock 阻塞 integration setup

**类型:** 根本原因分析 (Root Cause Analysis)  
**关联 Issue:** [#214](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/214)  
**关联 Defect:** `DEF-009`  
**严重程度:** P1 / High  
**状态:** 已修复并关闭

---

## 1. 问题摘要

执行 `bash scripts/integration-test.sh` 时，Grafana 容器在 setup 阶段退出，`/api/health` 无法就绪。容器日志显示 SQLite migration / provisioning 期间发生锁冲突。

```text
migration failed: executing migration: database is locked
```

该问题直接阻塞 Stage 4 full integration，属于 P1 Blocking defect。

---

## 2. 直接原因

| 项目 | 说明 |
|------|------|
| 触发点 | Grafana 启动期执行 migration / dashboard provisioning |
| 失败信号 | Grafana 容器退出，`/api/health` 长时间不可达 |
| 错误信息 | `database is locked` |
| 影响阶段 | `scripts/integration-test.sh` setup phase |

---

## 3. 根本原因（5 Why）

| 层级 | 问题 | 原因 |
|------|------|------|
| Why 1 | 为什么 integration setup 失败？ | Grafana `/api/health` 未就绪并最终超时 |
| Why 2 | 为什么 Grafana 未就绪？ | 容器启动阶段退出 |
| Why 3 | 为什么容器退出？ | SQLite migration / provisioning 遇到 `database is locked` |
| Why 4 | 为什么锁冲突未被容错？ | `docker-compose.yml` 未配置 Grafana 10.2.0 支持的 SQLite query / transaction retry 与 open connection 限制 |
| Why 5 | 为什么 readiness 路径未统一？ | `setup.sh` 与 phase script 存在重复等待逻辑，缺少统一 helper 约束 |

**根本原因:** Grafana SQLite 启动期锁冲突缺少容错配置，同时 readiness 调用未统一，导致 transient lock 被放大为 setup 阶段阻塞。

---

## 4. 修复措施

| 文件 | 修复内容 |
|------|----------|
| `docker-compose.yml` | 增加 `GF_DATABASE_MAX_OPEN_CONN=1`、`GF_DATABASE_QUERY_RETRIES=50`、`GF_DATABASE_TRANSACTION_RETRIES=50` |
| `scripts/lib/setup.sh` | `setup_phase()` 统一调用 `wait_for_grafana_ready()` |
| `tests/integration/phases/phase-1-grafana.sh` | 统一复用 `wait_for_grafana_ready()` |
| `tests/unit/scripts/grafana-sqlite-lock.test.js` | 覆盖 SQLite lock 容错配置和 helper 复用 |
| `tests/unit/scripts/setup.test.sh` | 防止 setup 阶段回退到 legacy `wait_for_endpoint` 路径 |

关联修复提交：`a44aa326 fix(perf): harden grafana sqlite startup`

---

## 5. 验证结果

| 验证项 | 结果 |
|--------|------|
| `docker compose config --quiet` | PASS |
| `npx jest tests/unit/scripts/grafana-sqlite-lock.test.js --runInBand` | PASS |
| `bash tests/unit/scripts/setup.test.sh` | PASS |
| `npm run lint` | PASS |
| `npm run test:coverage` | PASS |
| `bash scripts/integration-test.sh --phase 6` | PASS |
| `bash scripts/integration-test.sh` | PASS |

> 注：full integration 期间曾被本机 CPU / load preflight gate 拦截；环境负载恢复后重新执行已通过。

---

## 6. Lessons Learned

| 经验 | 后续约束 |
|------|----------|
| 容器启动期 transient lock 需要显式容错 | SQLite-backed 服务需配置 query retry / transaction retry / connection limit |
| Readiness helper 必须单一来源 | setup 与 phase script 统一复用 shared helper |
| Stage 4 blocker 需区分代码失败与环境门禁 | preflight 失败不等于功能回归失败，需单独记录环境信号 |

---

## 7. 关联文件

| 文件 | 说明 |
|------|------|
| `performance-testing-platform/docker-compose.yml` | Grafana SQLite 容错配置 |
| `performance-testing-platform/scripts/lib/setup.sh` | setup readiness helper |
| `performance-testing-platform/tests/integration/phases/phase-1-grafana.sh` | phase readiness helper |
| `performance-testing-platform/docs/qa/defect-register.md` | `DEF-009` 关闭记录 |
| `docs/project-management/defect-tracking/defect-register.md` | Portfolio 活跃数同步 |
