# RCA-2026-04-24 — Grafana Readiness 超时 & docker-compose.yml version 字段过时

**类型**: 根本原因分析 (Root Cause Analysis)  
**关联 Issue**: [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) / [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193)  
**严重程度**: #192 P1（集成测试 setup 阻塞）/ #193 P3（噪音警告）  
**状态**: ✅ 已修复

---

## 1. 问题摘要

### Issue #192 — Grafana readiness 超时

执行 `bash scripts/integration-test.sh` 时，等待 Grafana `/api/health` 就绪的超时设定为 60s，
在资源受限的本地环境下 Grafana 容器启动耗时超过 60s，导致 setup 阶段 CRITICAL FAILURE 退出。

```text
[2026-04-23 16:03:14] [ERROR] Endpoint timeout after 60s: http://localhost:3010/api/health
[2026-04-23 16:03:14] [ERROR] CRITICAL FAILURE: Wait for Grafana readiness (exit code 1)
```

### Issue #193 — docker-compose.yml version 字段过时

`docker-compose.yml` 顶层包含 `version: '3.8'`，Docker Compose v2 中该字段已废弃并输出 WARN，
增加日志噪音并引发误导性排查。

```text
WARN[0000] .../docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it...
```

---

## 2. 直接原因

| Issue | 直接原因 |
|-------|---------|
| #192 | `scripts/lib/setup.sh` 的 `wait_for_endpoint` timeout 硬编码为 60s，不足以覆盖资源受限场景下 Grafana 初始化时间 |
| #192 | `docker-compose.yml` 中 grafana service 缺少 `healthcheck` 定义，Docker 自身无法感知服务就绪状态 |
| #193 | `docker-compose.yml` 顶层保留了 Docker Compose v1 时代的 `version: '3.8'` 字段 |

---

## 3. 根本原因（5 Why）

### #192 超时根因

| 层级 | 问题 | 原因 |
|------|------|------|
| Why 1 | 为什么集成测试 setup 失败？ | `wait_for_endpoint` 超时，Grafana API 在 60s 内未就绪 |
| Why 2 | 为什么 60s 不够？ | Grafana 10.2.0 在资源受限环境（低内存/低 CPU）下冷启动需要 70-90s |
| Why 3 | 为什么没有更可靠的就绪探测？ | grafana service 缺少 Docker `healthcheck`，脚本只能盲等轮询 |
| Why 4 | 为什么 timeout 一开始设为 60s？ | 开发时在资源充裕机器上测试，60s 足够；未考虑 CI 或低配机器场景 |
| Why 5 | 为什么没有回归守护？ | 缺少对"容器就绪耗时上界"的可观测性，超时阈值无历史数据支撑 |

**根本原因**: 超时值基于资源充裕环境的经验值，未与 Docker healthcheck 机制联动，无法适配跨环境启动时间差异。

### #193 版本字段根因

| 层级 | 问题 | 原因 |
|------|------|------|
| Why 1 | 为什么出现废弃警告？ | `docker-compose.yml` 保留 `version: '3.8'` |
| Why 2 | 为什么字段未被移除？ | 项目初期使用 Docker Compose v1 规范编写，升级 Compose 后未清理遗留字段 |
| Why 3 | 为什么没有在升级时发现？ | 该 WARN 不阻塞执行，容易被忽略；缺少 docker-compose 配置校验步骤 |

**根本原因**: 配置文件未随 Docker Compose 大版本迭代同步清理，积累了遗留噪音字段。

---

## 4. 影响评估

| Issue | 影响范围 | 影响程度 |
|-------|---------|---------|
| #192 | Stage 4 集成测试 setup 阶段完全阻塞；本地回归不稳定 | P1 — 间歇性阻断验收 |
| #193 | `docker compose` 命令输出 WARN，干扰排障时的日志阅读 | P3 — 不影响功能，仅增加噪音 |

---

## 5. 修复措施

### 5.1 直接修复

**Fix 1 — 删除废弃 `version` 字段（#193）**

```diff
- version: '3.8'
-
 services:
```

**Fix 2 — 为 grafana 添加 Docker healthcheck（#192）**

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -sf http://localhost:3000/api/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 12
  start_period: 30s
```

覆盖逻辑：`start_period=30s` 内不计入失败；之后每 10s 探测一次，最多 12 次重试 = 最长等待约 150s。

**Fix 3 — 提升 `wait_for_endpoint` 超时（#192）**

```diff
- run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 60" "Wait for Grafana readiness"
+ run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" "Wait for Grafana readiness"
```

### 5.2 预防措施

| 措施 | 目标 |
|------|------|
| Docker healthcheck 作为就绪标准 | 后续可用 `depends_on: condition: service_healthy` 替代轮询 |
| 统一超时基准为 120s | 为低资源环境提供合理缓冲 |
| CI preflight 中可加 `docker compose config --quiet` 校验 | 捕获 docker-compose.yml 配置问题 |

---

## 6. 验证方案

```bash
# 验证 docker-compose.yml 无 version 字段 + healthcheck 生效
cd performance-testing-platform
docker compose config --quiet     # 无 WARN 输出即通过

# 验证 setup.sh timeout 已更新
grep "wait_for_endpoint" scripts/lib/setup.sh  # 应显示 120
```

---

## 7. Lessons Learned

1. **超时阈值需与环境多样性挂钩**：基于开发机的经验值在 CI / 低配机上会失效，应加宽 + 配合 healthcheck
2. **Docker healthcheck 是更可靠的就绪探测**：比脚本轮询更贴近容器实际状态
3. **配置文件需随依赖工具版本同步清理**：废弃字段即使不阻塞也会引发噪音和排查误判

---

## 8. 关联文件

- `performance-testing-platform/docker-compose.yml`
- `performance-testing-platform/scripts/lib/setup.sh`
- `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md`
