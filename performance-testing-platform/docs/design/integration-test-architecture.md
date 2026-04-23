# 集成测试架构设计文档

**项目:** Performance Testing Platform  
**版本:** Phase 7 - Architecture Redesign  
**日期:** 2026-04-21  
**状态:** Design Review  

---

## 目录

- [1. 设计动机](#1-设计动机)
- [2. 架构概览](#2-架构概览)
- [3. 核心改进](#3-核心改进)
- [4. 模块设计](#4-模块设计)
- [5. 实现指南](#5-实现指南)
- [6. 迁移计划](#6-迁移计划)

---

## 1. 设计动机

### 1.1 现状问题分析

当前 `scripts/integration-test.sh` (500 行) 存在**三大可靠性问题**：

| 问题 | 表现 | 危害 |
|------|------|------|
| **不支持重试** | 网络抖动/临时故障 → 直接 FAIL | Flaky tests 导致人工重跑，浪费 CI 配额 |
| **硬延迟不精确** | `sleep 2/3/5` 盲目等待 | 竞态条件：Grafana 未就绪就测试 → 虚假通过 |
| **错误泄漏** | 180+ 处 `\|\| true` 隐藏失败 | 测试失败被隐藏，CI 绿灯虚假，bug 流入生产 |

### 1.2 优化目标

**优先级排序（用户选择）：**

1. **P0 (TOP1):** 支持重试机制 - 减少 flaky tests 70%
2. **P0 (TOP2):** 精确等待（消除硬延迟） - 提升稳定性 50%
3. **P0 (TOP3):** 禁止错误泄漏 - 错误 100% 可见

**次要目标：**
- 可维护性：模块化 → 易于扩展
- 可观测性：统一日志 + 可视化报告
- 可测试性：能为 integration-test.sh 本身编写单元测试

---

## 2. 架构概览

### 2.1 新架构图

```
┌────────────────────────────────────────────────────────────┐
│              scripts/integration-test.sh (60行)             │
│         主入口：参数解析 + 流程编排 + exit code管理          │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┬──────────────┐
    ▼                     ▼              ▼              ▼
┌────────────┐  ┌────────────────┐  ┌───────────┐  ┌────────────┐
│ lib/       │  │ lib/           │  │ lib/      │  │ lib/       │
│ common.sh  │  │ setup.sh       │  │execute.sh │  │report.sh   │
├────────────┤  ├────────────────┤  ├───────────┤  ├────────────┤
│核心函数库  │  │环境初始化      │  │测试编排   │  │结果汇总    │
│            │  │                │  │            │  │            │
│·retry_with │  │·lock_acquire   │  │·load_tests │  │·aggregate_ │
│ _backoff() │  │·preflight_check│  │·execute_  │  │stats()     │
│            │  │·start_services │  │test_with_ │  │            │
│·wait_for_  │  │·init_env       │  │retry()    │  │·generate_  │
│endpoint()  │  │                │  │            │  │html_report │
│            │  │                │  │·collect_  │  │()          │
│·run_       │  │                │  │result()    │  │            │
│critical()  │  │                │  │            │  │·generate_  │
│            │  │                │  │            │  │md_report() │
│·run_       │  │                │  │            │  │            │
│optional()  │  │                │  │            │  │·capture_   │
│            │  │                │  │            │  │grafana_    │
│·log_*()    │  │                │  │            │  │snapshot()  │
│            │  │                │  │            │  │            │
│·init_      │  │                │  │            │  │            │
│logging()   │  │                │  │            │  │            │
└────────────┘  └────────────────┘  └───────────┘  └────────────┘
     ▲                 ▲                  ▲              ▲
     └─────────────────┴──────────────────┴──────────────┘
                      被调用的函数库

┌────────────────────────────────────────────────────────────┐
│              tests/integration/registry.sh                  │
│         测试注册表（数组 + 元数据，无代码重复）            │
└────────────────────────────────────────────────────────────┘
     ▲
     │ 数据源
     │
┌────────────────────────────────────────────────────────────┐
│         tests/integration/phases/*.sh (测试实现)             │
│  phase-1-grafana.sh / phase-2-metrics.sh / ... 等            │
│  (每个 phase 是独立的函数定义，无独立执行)                 │
└────────────────────────────────────────────────────────────┘
     ▲
     │ 业务逻辑
     │
┌────────────────────────────────────────────────────────────┐
│                    被测系统 (SUT)                            │
│          Express API + SQLite + Metrics endpoint            │
└────────────────────────────────────────────────────────────┘
```

### 2.2 执行流程

```
主程序 (integration-test.sh)
  │
  ├─ Parse CLI args (--phase N|phaseN / --verbose)
  │
  ├─ Source libs (common, setup, execute, report)
  │
  ├─ Setup Phase (lib/setup.sh)
  │  ├─ init_logging  → 生成 RUN_ID, 开始记录日志
  │  ├─ lock_acquire  → 互斥锁获取
  │  ├─ preflight_check --stage4  → 环境检测
  │  ├─ start_services  → Docker/API/Grafana (with retry + precise wait)
  │  └─ init_env  → 清理旧数据，初始化 DB
  │
  ├─ Execute Phase (lib/execute.sh)
  │  ├─ load_tests_from_registry  → 根据 --phase 参数加载测试列表
  │  └─ for each test:
  │     └─ execute_test_with_retry  → 最多 3 次重试 (exponential backoff)
  │        ├─ Attempt 1: 立即执行
  │        ├─ Attempt 2: 失败后 wait 2s 再试
  │        ├─ Attempt 3: 失败后 wait 4s 再试
  │        └─ Result: PASS/FAIL/SKIP (记录重试次数)
  │
  ├─ Report Phase (lib/report.sh)
  │  ├─ aggregate_stats  → 统计 PASS/FAIL/SKIP/耗时
  │  ├─ capture_grafana_snapshot  → 截图 (optional)
  │  ├─ generate_html_report  → 生成 HTML (可视化)
  │  ├─ generate_md_report  → 生成 Markdown (PR 友好)
  │  └─ emit_results  → stdout + files
  │
  └─ Exit with status code (0 if all pass, 1 if any fail)
```

---

## 3. 核心改进

### 3.1 重试机制 (Priority 1)

**问题:** 网络抖动或临时故障导致随机失败。

**解决方案:** `lib/common.sh:retry_with_backoff()`

```bash
# 函数签名：
# retry_with_backoff <max_attempts> <initial_delay> <command>
# 
# 返回值：命令最终的 exit code
# 日志记录：每次尝试的 timestamp, attempt#, exit code

# 示例用法：
retry_with_backoff 3 2 "docker compose up -d grafana"
# 尝试 1: 立即执行，若失败 → log + wait 2s
# 尝试 2: 执行，若失败 → log + wait 4s (2^2)
# 尝试 3: 执行，若失败 → log + return exit code

# 参数解释：
# - max_attempts=3: 概率 P(成功>=1) ≈ 99.9% (for 95% success rate per attempt)
# - initial_delay=2: 给临时故障 2-8 秒恢复时间
# - command: 任意 bash 命令，失败返回非 0 exit code

# 特性：
# - 自动处理 exit code（无需手工检查）
# - 详细日志（便于事后分析）
# - 单次尝试最多 30s timeout（防止无限挂起）
```

**设计决策：**

| 决策项 | 值 | 理由 |
|--------|------|------|
| 重试次数 | 3 | P(>=1 success) ≈ 99.9% for 95% endpoint success |
| 初始延迟 | 2 秒 | 给容器启动足够时间 |
| 延迟增长 | 指数 (2s → 4s → 8s) | 避免频繁重试耗尽资源 |
| 单次超时 | 30 秒 | 防止脚本无限挂起 |
| 可重试判定 | exit code != 0 | 简单规则，不区分"永久"vs"临时"失败 |

---

### 3.2 精确等待机制 (Priority 2)

**问题:** `sleep 5` 盲目等待 → 竞态条件（过早或过晚）。

**解决方案:** `lib/common.sh:wait_for_endpoint()`

```bash
# 函数签名：
# wait_for_endpoint <url> <verification_type> <timeout_seconds> [expected_substring]
#
# verification_type: "http_code" | "json_parse" | "contains"
# 返回值：0 (ready) 或 1 (timeout)

# 示例用法：
# 等待 Grafana 健康检查
wait_for_endpoint "http://localhost:3010/api/health" "json_parse" 60
# 行为：轮询 http://localhost:3010/api/health
#       每 0.5 秒尝试一次，HTTP 200 + JSON parse 成功 → 返回 0
#       60 秒后仍未成功 → 返回 1

# 等待 API 返回特定内容
wait_for_endpoint "http://localhost:3000/health" "contains" 30 '"status":"ok"'

# 特性：
# - 轮询间隔 0.5 秒（快速检测，但不过度消耗 CPU）
# - 失败原因记录（curl 详细错误）
# - 超时时间可配置（默认 60s for Grafana, 10s for API）
# - 如果 curl 完全失败（网络问题）→ 自动重试（每 0.5s）
```

**设计决策：**

| 决策项 | 值 | 理由 |
|--------|------|------|
| 轮询间隔 | 0.5 秒 | 平衡：快速检测 vs CPU 消耗 |
| 验证方式 | 支持多种 | JSON parse > HTTP code > regex |
| Grafana 超时 | 60 秒 | 最坏情况 (15-30s 正常，留余量) |
| API 超时 | 10 秒 | 通常立即就绪 |
| 失败诊断 | 记录 curl 错误 | 便于 RCA |

---

### 3.3 错误处理（禁止 `|| true`）(Priority 3)

**问题:** 180+ 处 `|| true` 隐藏失败，CI 无法检测。

**解决方案：** 新增 `run_critical()` 和 `run_optional()` wrapper

```bash
# 关键操作：失败立即中止
run_critical() {
  local cmd="$1" description="$2"
  log_debug "Running: $cmd"
  if ! eval "$cmd"; then
    log_error "CRITICAL FAILURE: $description (exit $?)"
    return 1  # 调用者可决定是否 exit 1
  fi
  log_info "✅ $description"
  return 0
}

# 可选操作：失败记日志但继续
run_optional() {
  local cmd="$1" description="$2"
  log_debug "Running (optional): $cmd"
  if ! eval "$cmd"; then
    log_warn "OPTIONAL FAILED (non-blocking): $description (exit $?)"
    return 1  # 调用者知道这是可选的
  fi
  log_info "✅ $description"
  return 0
}

# 使用示例：
# ❌ 旧方式
docker compose up -d grafana 2>/dev/null || true

# ✅ 新方式
run_critical "docker compose up -d grafana" "启动 Grafana"

# 或者
run_optional "pkill -9 orphan-process" "清理孤进程（可选）"
```

**迁移规则：**

| 旧模式 | 新模式 | 理由 |
|--------|--------|------|
| `cmd \|\| true` (Docker/API) | `run_critical` | 这些是必需的，失败需停止 |
| `cmd \|\| true` (清理) | `run_optional` | 这些是清理操作，失败无关紧要 |
| `cmd 2>/dev/null` | `cmd 2>&1 \| log_debug` | 错误应该被记录，不是隐藏 |

---

## 4. 模块设计

### 4.1 lib/common.sh - 基础函数库

**职责：** 可重用的底层函数，供其他模块调用。

**关键函数：**

```bash
# 日志函数 (4 个)
log_error <msg> [diagnostic_cmd]    # ERROR 级别日志 + 可选诊断
log_warn <msg> [diagnostic_cmd]     # WARN 级别日志
log_info <msg>                      # INFO 级别日志
log_debug <msg>                     # DEBUG 级别日志

# 初始化函数 (1 个)
init_logging                        # 生成 RUN_ID, 创建日志文件

# 重试 & 等待函数 (2 个)
retry_with_backoff <max> <delay> <cmd>              # 带指数退避的重试
wait_for_endpoint <url> <type> <timeout> [substring]  # 精确等待端点就绪

# 错误处理函数 (2 个)
run_critical <cmd> <desc>          # 关键操作，失败则记日志
run_optional <cmd> <desc>          # 可选操作，失败记警告但继续

# 工具函数 (3+ 个)
is_port_in_use <port>              # 检查端口是否被占用
is_service_ready <service_name>    # 检查特定服务就绪状态
ensure_command <cmd>               # 确保命令可用
```

**约束：**
- 不涉及业务逻辑，只提供通用函数
- 所有函数都应该有日志记录
- 从不直接 `exit 1`（由调用者决定）

---

### 4.2 lib/setup.sh - 环境初始化

**职责：** 准备测试环境，启动依赖服务。

**主要函数：**

```bash
setup_phase() {
  # 1. 获取互斥锁
  lock_acquire "$LOCK_DIR" || return 1
  
  # 2. 初始化日志
  init_logging
  
  # 3. 运行环境检查
  run_critical \
    "bash scripts/preflight-check.sh --stage4" \
    "环境检查"
  
  # 4. 启动基础设施 (Docker)
  run_critical \
    "retry_with_backoff 3 2 'docker compose up -d influxdb grafana'" \
    "启动 InfluxDB + Grafana"
  
  # 5. 等待 Grafana 就绪
  run_critical \
    "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 60" \
    "等待 Grafana 就绪"
  
  # 6. 启动 API 服务
  run_critical \
    "bash scripts/server.sh start single" \
    "启动 API (single mode)"
  
  # 7. 初始化测试数据
  run_critical \
    "rm -f data/perf.db* && npm run seed-db" \
    "初始化测试数据"
}
```

**特点：**
- 所有启动操作都使用 `retry_with_backoff`
- 所有等待操作都使用 `wait_for_endpoint`
- 错误导致立即返回（由 `run_critical` 处理）

---

### 4.3 lib/execute.sh - 测试编排

**职责：** 加载测试、执行测试、收集结果。

**主要函数：**

```bash
execute_phase() {
  local phase="$1"  # e.g. "phase1" / "phase2" / "all"
  
  # 1. 从 registry 加载测试列表
  source tests/integration/registry.sh
  local tests_array=()
  case "$phase" in
    phase1) tests_array=("${PHASE1_TESTS[@]}") ;;
    phase2) tests_array=("${PHASE2_TESTS[@]}") ;;
    *) tests_array=("${ALL_TESTS[@]}") ;;
  esac
  
  # 2. 执行每个测试
  for test_spec in "${tests_array[@]}"; do
    # test_spec format: "test_id|test_function|retry_enabled"
    IFS='|' read -r test_id test_func retry_enabled <<< "$test_spec"
    
    execute_test_with_retry "$test_id" "$test_func" "$retry_enabled"
  done
}

execute_test_with_retry() {
  local test_id="$1" test_func="$2" retry_enabled="$3"
  local attempt=1
  local max_attempts="${retry_enabled:-1}"  # 默认不重试
  
  while [ $attempt -le $max_attempts ]; do
    local start_time=$(date +%s%N)
    
    # 执行测试函数，捕获 exit code
    if "$test_func" >> "$LOG_FILE" 2>&1; then
      local duration=$(($(date +%s%N) - start_time))
      record_result "$test_id" "PASS" "$duration" "" "$attempt"
      return 0
    else
      local exit_code=$?
      local duration=$(($(date +%s%N) - start_time))
      
      if [ $attempt -lt $max_attempts ]; then
        local delay=$((2 ** (attempt - 1)))  # 1s, 2s, 4s...
        log_warn "Test $test_id attempt $attempt/$max_attempts failed, retrying in ${delay}s..."
        sleep "$delay"
      else
        record_result "$test_id" "FAIL" "$duration" "Exit code $exit_code" "$attempt"
        return 1
      fi
    fi
    
    attempt=$((attempt + 1))
  done
}
```

**特点：**
- 支持按 phase 执行或全部执行
- 每个测试可配置重试次数
- 记录执行时间、重试次数、错误信息

---

### 4.4 lib/report.sh - 结果汇总

**职责：** 生成结果报告（HTML + Markdown + JSON）。

**主要函数：**

```bash
report_phase() {
  # 1. 聚合统计信息
  aggregate_stats
  
  # 2. 生成报告
  generate_html_report "$RUN_ID"
  generate_md_report "$RUN_ID"
  generate_json_report "$RUN_ID"
  
  # 3. 捕获 Grafana 截图 (可选)
  capture_grafana_snapshot "$RUN_ID" || true
  
  # 4. 输出结果
  emit_test_summary
  
  # 5. 返回 exit code
  [ "$TOTAL_FAIL" -eq 0 ] && return 0 || return 1
}

generate_html_report() {
  local run_id="$1"
  local output_file="logs/integration-test-${run_id}.html"
  
  # 生成 HTML 报告（包含）：
  # - 总览 (PASS/FAIL/SKIP 饼图)
  # - 分阶段统计表
  # - 失败用例详情
  # - 性能统计 (P50/P95)
  # - Grafana 截图 (if available)
  # - 日志链接
  
  cat > "$output_file" <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>Integration Test Report - $run_id</title>
  <style>
    /* CSS for chart/table styling */
  </style>
</head>
<body>
  <!-- Report HTML content -->
</body>
</html>
EOF
}

capture_grafana_snapshot() {
  local run_id="$1"
  
  # 调用 Grafana API 获取 dashboard JSON
  # 使用 screenshot API 或 data export
  # 保存到 logs/snapshots/${run_id}/
  
  # 若 Grafana 不可用 → skip (non-blocking)
  curl -sf "http://localhost:3010/api/dashboards/uid/k6-results" \
    | jq '.dashboard' \
    > "logs/snapshots/${run_id}/dashboard-state.json" || true
}
```

**特点：**
- 支持多种输出格式 (HTML/MD/JSON)
- HTML 包含可视化图表
- Markdown 可直接粘贴到 PR
- JSON 便于 CI 解析

---

### 4.5 tests/integration/registry.sh - 测试注册表

**职责：** 定义所有集成测试，支持动态加载。

**结构：**

```bash
# 数组格式：test_id | test_function | retry_enabled(1=no, 3=yes)

PHASE1_TESTS=(
  "JM-GRF-01|test_jmgrf01_influxdb_write|3"
  "JM-GRF-02|test_jmgrf02_grafana_dashboard|3"
  "JM-GRF-03|test_jmgrf03_vus_panel|3"
  "JM-GRF-04|test_jmgrf04_response_time_panel|3"
)

PHASE2_TESTS=(
  "SM-UT-01|test_smut01_metrics_cpu|1"
  "SM-UT-02|test_smut02_metrics_memory|1"
  # ...
)

# ...

ALL_TESTS=("${PHASE1_TESTS[@]}" "${PHASE2_TESTS[@]}" ...)

# 新增测试 → 仅需在此文件添加一行，无需修改主脚本
```

**优势：**
- 测试定义与实现分离
- 易于按 phase 组织
- 支持动态过滤（如 `--test-id JM-GRF-01`）

---

### 4.6 tests/integration/phases/*.sh - 测试实现

**职责：** 各 phase 的测试函数实现。

**示例：tests/integration/phases/phase-1-grafana.sh**

```bash
#!/bin/bash

# Phase 1: Grafana + InfluxDB Integration Tests

test_jmgrf01_influxdb_write() {
  log_info "Test JM-GRF-01: k6 → InfluxDB write"
  
  # Arrange
  local k6_script="tests/performance/smoke.k6.js"
  
  # Act
  k6 run --out influxdb=http://localhost:8086/k6 \
    --duration 10s --vus 2 "$k6_script" || return 1
  
  # Assert
  local measurements=$(curl -sf "http://localhost:8086/query?db=k6&q=SHOW+MEASUREMENTS" \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print(len(r['results'][0].get('series', [])))" \
    2>/dev/null)
  
  [ "$measurements" -gt 0 ] && return 0 || return 1
}

test_jmgrf02_grafana_dashboard() {
  log_info "Test JM-GRF-02: Grafana dashboard loads"
  
  local panels=$(curl -sf "http://localhost:3010/api/dashboards/uid/k6-results" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['dashboard']['panels']))" \
    2>/dev/null || echo "0")
  
  [ "$panels" -gt 0 ] && return 0 || return 1
}

# ... 其他测试函数 ...
```

**特点：**
- 每个文件对应一个 phase
- 函数遵循 AAA 模式（Arrange-Act-Assert）
- 返回 0 (成功) 或 1 (失败)

---

## 5. 实现指南

### 5.1 新文件清单

```
scripts/
  ├─ integration-test.sh          (改造，60 行)
  └─ lib/                         (新建目录)
      ├─ common.sh                (新建，500 行)
      ├─ setup.sh                 (新建，200 行)
      ├─ execute.sh               (新建，300 行)
      └─ report.sh                (新建，400 行)

tests/integration/
  ├─ registry.sh                  (新建，100 行)
  ├─ phases/                      (新建目录)
  │  ├─ phase-1-grafana.sh        (新建，80 行)
  │  ├─ phase-2-metrics.sh        (新建，100 行)
  │  ├─ phase-3-auth.sh           (新建，60 行)
  │  └─ ...
  └─ logs/                        (新建目录，运行时生成)
      ├─ integration-test-<run_id>.log
      ├─ integration-test-<run_id>.diag
      ├─ integration-test-<run_id>.html
      ├─ integration-test-<run_id>.md
      └─ snapshots/
```

### 5.2 使用方法

```bash
# 运行所有集成测试
bash scripts/integration-test.sh

# 运行特定 phase
bash scripts/integration-test.sh --phase phase1

# 详细日志输出
bash scripts/integration-test.sh --verbose

# 输出：
# - stdout: 简明摘要
# - logs/integration-test-<timestamp>.log: 详细日志
# - logs/integration-test-<timestamp>.html: 可视化报告
# - logs/integration-test-<timestamp>.md: PR 友好报告
```

---

## 6. 迁移计划

### 6.1 阶段 1：实现新架构（Week 1）

- [ ] 编写 `lib/common.sh` (retry, wait, logging)
- [ ] 编写 `lib/setup.sh`
- [ ] 编写 `lib/execute.sh`
- [ ] 编写 `lib/report.sh`
- [ ] 编写 `tests/integration/registry.sh`
- [ ] 编写 `tests/integration/phases/*.sh`
- [ ] 新 `integration-test.sh` (60 行)

### 6.2 阶段 2：验证 & 调优（Week 1 后半）

- [ ] 与旧脚本对比（结果应一致）
- [ ] 性能对比（应无显著下降）
- [ ] 日志可读性评审
- [ ] 报告格式评审

### 6.3 阶段 3：文档更新

- [ ] `docs/design/integration-test-design.md` 添加架构章节
- [ ] `docs/guides/SOP-integration-test.md` (新增)
- [ ] `CLAUDE.md` 更新快速命令
- [ ] 生成 Architecture RCA 文档

### 6.4 阶段 4：平滑切换

- [ ] CI workflow 改为使用新脚本
- [ ] 旧脚本重命名为 `integration-test.sh.bak`（保留备份）
- [ ] 监控 CI 运行结果（确保无回归）
- [ ] 1 周后删除备份

---

## 7. 性能指标

**预期改进：**

| 指标 | 当前 | 目标 | 改进% |
|------|------|------|-------|
| Flaky tests (随机失败) | ~15% | ~2% | 87% |
| 平均执行时间 | ~5 分钟 | ~5.2 分钟 | -4% (可接受，增加了重试逻辑) |
| 故障诊断时间 | ~20 分钟 | ~5 分钟 | 75% (详细日志) |
| 新增测试的实施时间 | ~1 小时 | ~10 分钟 | 83% (只需添加注册) |

---

## 8. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 旧脚本和新脚本结果不一致 | 中 | 中 | 并行运行两个脚本，逐个对比测试 |
| 新增日志功能 bug | 低 | 中 | 单元测试覆盖日志函数 |
| Grafana 截图 API 不可用 | 低 | 低 | 截图失败非阻塞（optional） |
| 旧 CI 工作流依赖现有格式 | 低 | 高 | 保持 exit code 语义不变（0=pass, 1=fail） |

---

**文档完成。** 等待 review。
