# JMeter Dry-run 与 k6 Smoke 测试用例

**版本:** 1.0
**日期:** 2026-04-20
**关联设计文档:** [jmeter-dryrun-k6-smoke-design.md](../../design/jmeter-dryrun-k6-smoke-design.md)

---

## 1. 概述

本文档定义 JMeter dry-run 和 k6 smoke 两个质量门禁的详细测试用例，涵盖单元测试、配置验证和端到端验证。

---

## 2. JMeter Dry-run 测试用例

### 2.1 脚本文件验证 (`tests/unit/scripts/jmeter-dryrun.test.js`)

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| DRYRUN-UT-01 | 脚本文件存在且可执行 | `scripts/jmeter-dryrun.sh` 存在，有 execute 权限 | UT P1 regression |
| DRYRUN-UT-02 | 脚本使用安全模式 | 包含 `set -euo pipefail` | UT P1 regression |
| DRYRUN-UT-03 | 脚本使用 bash shebang | 首行为 `#!/usr/bin/env bash` | UT P1 regression |

### 2.2 配置文件验证

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| DRYRUN-UT-04 | dryrun.properties 文件存在 | `tests/jmeter/config/dryrun.properties` 存在 | UT P1 regression |
| DRYRUN-UT-05 | 配置 threads=1 | 单线程验证，避免并发干扰 | UT P1 regression |
| DRYRUN-UT-06 | 配置 duration=10 | 10 秒足够验证所有端点 | UT P1 regression |
| DRYRUN-UT-07 | 配置 rampup=1 | 1 秒启动 | UT P1 regression |

### 2.3 JTL 解析逻辑验证

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| DRYRUN-UT-08 | 全部成功的 JTL 文件 | 解析 errors = 0 | UT P1 regression |
| DRYRUN-UT-09 | 部分失败的 JTL 文件 | 正确统计失败请求数 | UT P1 regression |
| DRYRUN-UT-10 | 空 JTL 文件（仅表头） | total = 0 | UT P1 regression |
| DRYRUN-UT-11 | 失败请求详情提取 | 输出包含 label 和 responseCode | UT P1 regression |

### 2.4 npm 脚本验证

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| DRYRUN-UT-12 | jmeter:dryrun 脚本存在 | 指向 `jmeter-dryrun.sh` + `smoke.jmx` | UT P1 regression |
| DRYRUN-UT-13 | jmeter:dryrun:auth 脚本存在 | 指向 `jmeter-dryrun.sh` + `auth-load.jmx` | UT P1 regression |

### 2.5 脚本内容完整性

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| DRYRUN-UT-14 | 结果文件存在性检查 | 包含 `! -f "$RESULT_FILE"` 检查 | UT P1 regression |
| DRYRUN-UT-15 | 0 请求检查 | 包含 `"$TOTAL" -eq 0` 检查 | UT P1 regression |
| DRYRUN-UT-16 | 错误数检查 | 包含 `"$ERRORS" -gt 0` 检查 | UT P1 regression |
| DRYRUN-UT-17 | 成功后清理临时文件 | 包含 `rm -f "$RESULT_FILE"` | UT P1 regression |
| DRYRUN-UT-18 | 默认使用 smoke.jmx | 脚本默认 JMX 文件为 `tests/jmeter/smoke.jmx` | UT P1 regression |

### 2.6 端到端验证（手动 / CI）

| 用例 ID | 测试场景 | 执行命令 | 预期结果 | 标签 |
|---------|----------|----------|----------|------|
| DRYRUN-E2E-01 | Dry-run 全部通过 | `npm run jmeter:dryrun` | exit 0, 输出 `✅ Dry-run passed` | PT P0 smoke |
| DRYRUN-E2E-02 | Dry-run 字段错误检测 | 修改 JMX 字段名后执行 | exit 1, 输出失败请求列表 | PT P1 regression |
| DRYRUN-E2E-03 | 认证 Dry-run | `npm run jmeter:dryrun:auth` | exit 0, 认证端点全部通过 | PT P1 regression |

---

## 3. k6 Smoke 测试用例

### 3.1 Profile 文件验证 (`tests/unit/helpers/smoke-config.test.js`)

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| K6-SMOKE-UT-01 | profiles/smoke.json 文件存在 | 文件存在 | UT P1 regression |
| K6-SMOKE-UT-02 | smoke.json 是有效 JSON | 解析无异常 | UT P1 regression |
| K6-SMOKE-UT-03 | vus 字段值为 5 | `profile.vus === 5` | UT P1 regression |
| K6-SMOKE-UT-04 | duration 字段值为 60s | `profile.duration === '60s'` | UT P1 regression |
| K6-SMOKE-UT-05 | 包含 p95 < 500ms 阈值 | `thresholds.http_req_duration` 含 `p(95)<500` | UT P1 regression |
| K6-SMOKE-UT-06 | 包含 error rate < 1% 阈值 | `thresholds.http_req_failed` 含 `rate<0.01` | UT P1 regression |
| K6-SMOKE-UT-07 | 通过 profile-parser 验证 | `loadProfile()` 返回完整配置 | UT P1 regression |

### 3.2 k6 脚本验证

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| K6-SMOKE-UT-08 | smoke.k6.js 文件存在 | 文件存在 | UT P1 regression |
| K6-SMOKE-UT-09 | 使用 loadProfile('smoke') | 脚本通过 profile 机制加载配置 | UT P1 regression |
| K6-SMOKE-UT-10 | 测试 /health 端点 | 脚本包含 `/health` 请求 | UT P1 regression |
| K6-SMOKE-UT-11 | 测试 /api/products 端点 | 脚本包含 `/api/products` 请求 | UT P1 regression |
| K6-SMOKE-UT-12 | 测试 /api/products/:id 端点 | 脚本包含动态商品 ID 请求 | UT P1 regression |
| K6-SMOKE-UT-13 | 使用 checkStatus helper | 脚本使用 `checkStatus()` 封装 | UT P1 regression |
| K6-SMOKE-UT-14 | 使用 checkDuration helper | 脚本使用 `checkDuration()` 封装 | UT P1 regression |
| K6-SMOKE-UT-15 | 包含 endpoint tag | 每个请求都有 `endpoint` tag | UT P1 regression |

### 3.3 Profile-parser Smoke 场景

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| K6-SMOKE-UT-16 | validateProfile 接受 vus+duration 模式 | 返回完整 profile 对象 | UT P1 regression |
| K6-SMOKE-UT-17 | 拒绝缺少 thresholds 的配置 | 抛出 "thresholds" 相关错误 | UT P1 regression |
| K6-SMOKE-UT-18 | 拒绝无 vus 和无 stages 的配置 | 抛出错误 | UT P1 regression |

### 3.4 npm 脚本验证

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| K6-SMOKE-UT-19 | k6:smoke 脚本存在 | package.json 包含 `k6:smoke` | UT P1 regression |
| K6-SMOKE-UT-20 | k6:smoke 输出 HTML 报告 | 输出路径为 `reports/k6-smoke.html` | UT P1 regression |
| K6-SMOKE-UT-21 | k6:smoke 执行 smoke.k6.js | 命令包含 `tests/performance/smoke.k6.js` | UT P1 regression |
| K6-SMOKE-UT-22 | k6:smoke 创建报告目录 | 命令包含 `mkdir -p reports` | UT P1 regression |

### 3.5 Profile 目录一致性

| 用例 ID | 测试场景 | 预期结果 | 标签 |
|---------|----------|----------|------|
| K6-SMOKE-UT-23 | 标准 profile 全部通过验证 | smoke/load/stress/spike/peak 均通过 | UT P1 regression |
| K6-SMOKE-UT-24 | smoke profile VUs 最小 | smoke.vus ≤ 所有 profile 的 vus | UT P1 regression |

### 3.6 端到端验证（手动 / CI）

| 用例 ID | 测试场景 | 执行命令 | 预期结果 | 标签 |
|---------|----------|----------|----------|------|
| K6-SMOKE-E2E-01 | Smoke 全部通过 | `npm run k6:smoke` | exit 0, 阈值全 ✓ | PT P0 smoke |
| K6-SMOKE-E2E-02 | HTML 报告生成 | 检查 `reports/k6-smoke.html` | 文件存在且 > 0 KB | PT P1 regression |
| K6-SMOKE-E2E-03 | 阈值失败检测 | 修改 profile p95 < 1ms 后执行 | exit 非 0, 阈值 ✗ | PT P1 regression |

---

## 4. CI 门禁测试用例

| 用例 ID | 测试场景 | 验证项 | 预期结果 | 标签 |
|---------|----------|--------|----------|------|
| GATE-CI-01 | k6 smoke 在 CI 中执行 | GitHub Actions job | 成功完成 | CI P0 smoke |
| GATE-CI-02 | JMeter smoke 在 CI 中执行 | GitHub Actions job | 成功完成 | CI P0 smoke |
| GATE-CI-03 | k6 smoke 失败时 CI 失败 | 阈值超标场景 | job 失败，阻塞合并 | CI P1 regression |
| GATE-CI-04 | JMeter dry-run 失败时 CI 失败 | 请求错误场景 | job 失败，阻塞合并 | CI P1 regression |

---

## 5. 用例统计

| 分类 | 用例数 | 自动化 | 手动 |
|------|--------|--------|------|
| JMeter Dry-run 单元测试 | 18 | 18 | 0 |
| k6 Smoke 单元测试 | 24 | 24 | 0 |
| Dry-run 端到端 | 3 | 0 | 3 |
| k6 Smoke 端到端 | 3 | 0 | 3 |
| CI 门禁 | 4 | 4 | 0 |
| **合计** | **52** | **46** | **6** |

---

## 6. 变更历史

| 日期 | 变更 |
|------|------|
| 2026-04-20 | 初始版本：整理 dry-run (18) + k6 smoke (24) + E2E (6) + CI (4) = 52 条测试用例 |
