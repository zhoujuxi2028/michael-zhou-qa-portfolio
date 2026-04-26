# Grafana sqlite lock 缺陷修复设计

## 问题说明

在 `performance-testing-platform` 当前 `main` 基线上，执行 `bash scripts/integration-test.sh` 时，Grafana 容器会在启动阶段退出，随后导致 `http://localhost:3010/api/health` readiness 超时。

已采集到的关键症状如下：

| 项目 | 现象 |
|---|---|
| 触发命令 | `bash scripts/integration-test.sh` |
| 失败阶段 | setup / Grafana readiness |
| 容器状态 | `performance-testing-platform-grafana-1` 启动后退出，exit code `1` |
| 关键日志 | `migration failed: executing migration: database is locked` |
| 影响 | Stage 4 integration test 无法稳定通过 |

本次问题与已关闭的 `DEF-001 / #192` 不同。`DEF-001` 的主要表象是 readiness 超时；本次根因线索已经收敛到 **Grafana SQLite 在启动期迁移 / dashboard provisioning 阶段出现锁冲突**。

## 目标与非目标

| 类型 | 内容 |
|---|---|
| 目标 | 让 Grafana 在本机 integration test 启动链中稳定完成初始化 |
| 目标 | 消除 `database is locked` 导致的容器提前退出 |
| 目标 | 统一 `setup.sh` 与 `phase-1-grafana.sh` 的 Grafana readiness 等待逻辑 |
| 目标 | 按 defect-tracking 流程创建 GitHub Issue，并同步项目级与 Portfolio 级登记表 |
| 非目标 | 将 Grafana backend 改造成 PostgreSQL / MySQL |
| 非目标 | 重构整个 Grafana provisioning 目录结构 |
| 非目标 | 顺手修改与当前 lock 缺陷无关的性能、CI 或 dashboard 内容 |

## 缺陷分级与处理策略

| 维度 | 结论 |
|---|---|
| 缺陷类型 | `bug/test` |
| 项目范围 | `performance-testing-platform` |
| 严重度 | `P1 / High` |
| Blocking | `✅ Blocking` |
| 处理方式 | 修复后重新验证，不走 waiver |
| 文档联动 | 需要项目级 defect register；如关闭则补 RCA / postmortem |

> **说明：** 该缺陷直接阻塞 integration test setup，符合“重要功能降级，影响验收结论”的 P1 定义。

## 方案对比

| 方案 | 做法 | 优点 | 风险 | 结论 |
|---|---|---|---|---|
| A | 在 `docker-compose.yml` 增加 Grafana SQLite 锁冲突容错配置，并统一 readiness 入口 | 改动最小，直接命中当前症状 | 仍然保留 SQLite 架构边界 | **推荐** |
| B | 调整 provisioning / dashboards 目录和加载顺序 | 更贴近潜在内部触发点 | 改动面更大，容易影响现有 dashboard 行为 | 不推荐 |
| C | 替换 Grafana 默认 SQLite 为外部数据库 | 从根上规避 SQLite 锁 | 明显超出本次修复范围 | 禁用 |

## 推荐设计

### 1. 配置级稳定性修复

在 `docker-compose.yml` 的 `grafana.environment` 中加入 SQLite 锁冲突容错参数。

| 配置方向 | 目的 |
|---|---|
| `GF_DATABASE_MAX_OPEN_CONN` | 限制 SQLite 打开连接数，减少启动期写锁竞争 |
| `GF_DATABASE_QUERY_RETRIES` | 查询遇到 SQLite lock 时重试 |
| `GF_DATABASE_TRANSACTION_RETRIES` | transaction 遇到 SQLite lock 时重试 |

这些配置只影响 Grafana 容器内部 SQLite 行为，不改动外部接口，也不会改变现有 dashboards / datasources 的语义。

### 2. 统一 readiness 路径

当前 `scripts/lib/setup.sh` 已经存在 `wait_for_grafana_ready()`，但实际 setup 仍调用裸 `wait_for_endpoint`；`tests/integration/phases/phase-1-grafana.sh` 也仍使用旧等待方式。

本次将统一改为复用 `wait_for_grafana_ready()`：

| 文件 | 调整 |
|---|---|
| `scripts/lib/setup.sh` | `setup_phase()` 改为调用 `wait_for_grafana_ready()` |
| `tests/integration/phases/phase-1-grafana.sh` | 改为 source 公共脚本后复用同一等待函数 |

这样可以保证：

| 收益 | 说明 |
|---|---|
| 行为一致 | setup 与 phase 测试不再使用两套不同 timeout / probe |
| 诊断完整 | readiness 失败时自动 dump `grafana` / `influxdb` 日志 |
| 维护更简单 | 避免后续只修一处、另一处继续漂移 |

### 3. 缺陷跟踪闭环

修复同时补齐 defect-tracking 文档链路。

| 项目 | 动作 |
|---|---|
| GitHub Issue | 创建新 Issue，标题使用英文，正文可中文 |
| 项目级登记表 | 在 `performance-testing-platform/docs/qa/defect-register.md` 新增活跃缺陷 |
| Portfolio 主表 | 在 `docs/project-management/defect-tracking/defect-register.md` 登记该项目当前活跃缺陷入口更新 |
| 关闭后文档 | 若本次完成关闭，补一份项目级 RCA / postmortem |

## 变更范围

| 类型 | 文件 |
|---|---|
| 配置 | `performance-testing-platform/docker-compose.yml` |
| 脚本 | `performance-testing-platform/scripts/lib/setup.sh` |
| 测试脚本 | `performance-testing-platform/tests/integration/phases/phase-1-grafana.sh` |
| 项目缺陷登记 | `performance-testing-platform/docs/qa/defect-register.md` |
| Portfolio 缺陷登记 | `docs/project-management/defect-tracking/defect-register.md` |
| RCA / postmortem | `performance-testing-platform/docs/project-management/postmortems/` 下新文件（仅在缺陷关闭时创建） |

## 验证策略

| 类型 | 命令 |
|---|---|
| 配置有效性 | `cd performance-testing-platform && docker compose config --quiet` |
| 代码质量 | `cd performance-testing-platform && npm run lint` |
| 覆盖率回归 | `cd performance-testing-platform && npm run test:coverage` |
| 集成测试 | `cd performance-testing-platform && bash scripts/integration-test.sh` |
| Grafana 关键路径 | `cd performance-testing-platform && bash tests/integration/phases/phase-1-grafana.sh` |

## 成功标准

| 标准 | 说明 |
|---|---|
| Grafana 不再因 `database is locked` 退出 | 容器保持 running，`/api/health` 可达 |
| integration test 通过 | `bash scripts/integration-test.sh` 成功 |
| readiness 逻辑统一 | 不再保留重复的裸 `wait_for_endpoint` 实现路径 |
| defect 文档齐全 | Issue、项目级表、Portfolio 主表同步完成 |
