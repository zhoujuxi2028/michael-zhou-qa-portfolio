# Postmortem — 2026-04-24 Grafana Readiness 超时 & docker-compose.yml 配置遗留字段

> **事件时间**: 2026-04-23 16:03 +08:00  
> **影响范围**: `performance-testing-platform` 集成测试 setup 阶段  
> **严重级别**: #192 P1（Setup 阻塞）/ #193 P3（日志噪音）  
> **恢复时间**: 2026-04-24（代码修复 + 文档归档）  
> **关联 Issue**: [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) / [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193)

---

## 1. 事件摘要

在本地执行 `bash scripts/integration-test.sh` 进行 Stage 4 验收时，setup 阶段报告：

```text
[2026-04-23 16:03:14] [ERROR] Endpoint timeout after 60s: http://localhost:3010/api/health
[2026-04-23 16:03:14] [ERROR] CRITICAL FAILURE: Wait for Grafana readiness (exit code 1)
```

脚本在等待 Grafana `/api/health` 就绪阶段超时退出，导致后续所有集成测试阶段未能执行。  
同一运行中还持续输出 Docker Compose 废弃字段警告（#193），增加了日志噪音。

---

## 2. 时间线

| 时间 (本地 +08:00) | 事件 |
|-------------------|------|
| 2026-04-23 16:02 | 执行 `bash scripts/integration-test.sh` |
| 2026-04-23 16:02 | Docker compose up influxdb grafana 成功启动容器 |
| 2026-04-23 16:03:14 | `wait_for_endpoint` 60s 超时，setup 阶段退出 |
| 2026-04-23 16:03 | 集成测试未进入任何测试阶段，脚本退出码非零 |
| 2026-04-23 08:08 UTC | 提交 Issue #192（Grafana readiness 超时） |
| 2026-04-23 08:15 UTC | 提交 Issue #193（version 字段废弃警告） |
| 2026-04-23 08:08 UTC | 问题记录进 `stage4-defect-waiver-register.md`（DEF-001、DEF-002） |
| 2026-04-24 | 分析根因，实施修复，撰写 RCA + postmortem |

---

## 3. 处置过程

### 分析步骤

1. 查看 `scripts/lib/common.sh` 中 `wait_for_endpoint` 实现，确认 60s 为硬编码超时
2. 查看 `docker-compose.yml` grafana service，确认缺少 `healthcheck` 定义
3. 查看 `docker-compose.yml` 顶层，确认 `version: '3.8'` 仍存在
4. 确认第二次运行未复现（资源充裕时 60s 内 Grafana 可就绪），属间歇性问题

### 修复内容

| 修复项 | 文件 | 变更 |
|-------|------|------|
| 删除废弃 version 字段 | `docker-compose.yml` | 移除顶层 `version: '3.8'` |
| 添加 Grafana healthcheck | `docker-compose.yml` | 新增 `healthcheck` 配置（30s start_period，10s interval，12 retries） |
| 提升 readiness 超时 | `scripts/lib/setup.sh` | timeout 60 → 120 |

---

## 4. 用户影响

| 维度 | 影响 |
|------|------|
| Stage 4 验收 | setup 阶段失败，集成测试无法执行，Stage 4 gate 被阻塞 |
| 开发效率 | 需重新运行集成测试，额外消耗约 5-10 分钟 |
| 日志可读性 | Docker Compose WARN 增加排障噪音 |
| 数据可信度 | 该次运行无有效集成测试数据，需要重新验证 |

---

## 5. 做得好的地方

- 问题发现后第一时间以 GitHub Issue 的形式记录，并登记进 defect waiver register
- 第二次运行能够复现/排除，提供了"环境相关"的初步假设
- 现有 `wait_for_endpoint` 函数结构健壮，只需调整参数即可修复

---

## 6. 做得不好的地方

- 超时值 60s 来自开发机经验，未考虑资源受限场景
- grafana service 缺少 Docker healthcheck，容器 started ≠ API ready
- docker-compose.yml 未随 Compose v2 升级清理遗留字段

---

## 7. 行动项

| Action | 类型 | 负责人 | 状态 |
|--------|------|-------|------|
| 删除 `version: '3.8'` | 修复 | QA | ✅ 已完成 |
| 为 grafana 添加 Docker healthcheck | 修复/预防 | QA | ✅ 已完成 |
| 将 `wait_for_endpoint` timeout 提升至 120s | 修复 | QA | ✅ 已完成 |
| 关闭 Issue #192 | 收尾 | QA | ✅ 已完成 |
| 关闭 Issue #193 | 收尾 | QA | ✅ 已完成 |
| 更新 stage4-defect-waiver-register.md | 文档 | QA | ✅ 已完成 |

---

## 8. 后续防线

1. **新增 Docker service 时，必须配置 `healthcheck`**：healthcheck 是运行时就绪状态的唯一可靠来源
2. **超时值应基于 P95 启动时间 × 1.5 倍安全系数**：不能依赖单机经验值
3. **docker-compose.yml 变更时，执行 `docker compose config --quiet` 校验**：消除隐性配置警告
