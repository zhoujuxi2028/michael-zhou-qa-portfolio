# 集成测试架构重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `scripts/integration-test.sh` 重构为模块化、可重试、可观测的 Bash 集成测试框架，优先消除 flaky tests、硬延迟和错误泄漏。

**Architecture:** 采用 `scripts/lib/` 分层拆分 `common/setup/execute/report`，主脚本只负责参数解析和流程编排。测试定义下沉到 `tests/integration/registry.sh` 和 `tests/integration/phases/*.sh`，让新增测试不再修改主流程。

**Tech Stack:** Bash 5.x、curl、jq、Python 3、Docker Compose

---

## 文件结构

### 新增
- `scripts/lib/common.sh`
- `scripts/lib/setup.sh`
- `scripts/lib/execute.sh`
- `scripts/lib/report.sh`
- `tests/integration/registry.sh`
- `tests/integration/phases/phase-1-grafana.sh`
- `tests/integration/phases/phase-2-metrics.sh`
- `tests/integration/phases/phase-3-auth.sh`
- `tests/integration/phases/phase-4-soak.sh`
- `tests/integration/phases/phase-5-k6-helpers.sh`
- `tests/integration/phases/phase-6-rate-limiter.sh`
- `tests/integration/phases/phase-7-ci-integration.sh`
- `tests/integration/unit/common.test.sh`
- `docs/guides/SOP-integration-test.md`

### 修改
- `scripts/integration-test.sh`
- `docs/design/integration-test-design.md`

---

## 任务

### Task 1: 先写 common.sh 的日志测试

**Files:**
- Create: `tests/integration/unit/common.test.sh`
- Create: `scripts/lib/common.sh`

- [ ] **Step 1: 写失败测试**

```bash
source scripts/lib/common.sh

init_logging
log_info "hello"
log_warn "warn"
log_error "error"
```

- [ ] **Step 2: 运行测试，确认函数尚未实现时失败**

Run: `bash tests/integration/unit/common.test.sh`
Expected: `command not found` 或断言失败

- [ ] **Step 3: 实现 init_logging / log_info / log_warn / log_error / log_debug**

```bash
init_logging() {
  RUN_ID=$(date +%s)
  LOG_FILE="tests/integration/logs/integration-test-${RUN_ID}.log"
  mkdir -p "$(dirname "$LOG_FILE")"
  : > "$LOG_FILE"
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `bash tests/integration/unit/common.test.sh`
Expected: 日志文件创建成功，4 个日志级别都可用

### Task 2: 实现 retry_with_backoff

**Files:**
- Modify: `scripts/lib/common.sh`
- Modify: `tests/integration/unit/common.test.sh`

- [ ] **Step 1: 写重试测试**

```bash
retry_with_backoff 3 1 "true"
```

- [ ] **Step 2: 运行测试，确认重试函数不存在时失败**

Run: `bash tests/integration/unit/common.test.sh`
Expected: `retry_with_backoff: command not found`

- [ ] **Step 3: 实现指数退避重试**

```bash
retry_with_backoff() {
  local max_attempts="$1"
  local initial_delay="$2"
  shift 2
  local command="$*"
  local attempt=1
  local delay="$initial_delay"
  while [ "$attempt" -le "$max_attempts" ]; do
    if eval "$command"; then
      return 0
    fi
    [ "$attempt" -ge "$max_attempts" ] && return 1
    sleep "$delay"
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `bash tests/integration/unit/common.test.sh`
Expected: 首次成功、第二次成功、超限失败三类场景都通过

### Task 3: 实现 wait_for_endpoint

**Files:**
- Modify: `scripts/lib/common.sh`
- Modify: `tests/integration/unit/common.test.sh`

- [ ] **Step 1: 写等待测试**

```bash
wait_for_endpoint "http://localhost:9999/" "http_code" 10
```

- [ ] **Step 2: 运行测试，确认函数不存在时失败**

Run: `bash tests/integration/unit/common.test.sh`
Expected: `wait_for_endpoint: command not found`

- [ ] **Step 3: 实现轮询等待**

```bash
wait_for_endpoint() {
  local url="$1"
  local verification_type="$2"
  local timeout_seconds="$3"
  local start_time
  start_time=$(date +%s)
  while true; do
    case "$verification_type" in
      http_code)
        curl -sf -o /dev/null "$url" && return 0
        ;;
      json_parse)
        curl -sf "$url" | jq . >/dev/null 2>&1 && return 0
        ;;
      contains)
        local expected="$4"
        curl -sf "$url" | grep -q "$expected" && return 0
        ;;
    esac
    [ $(( $(date +%s) - start_time )) -ge "$timeout_seconds" ] && return 1
    sleep 0.5
  done
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `bash tests/integration/unit/common.test.sh`
Expected: endpoint ready / timeout 两个场景通过

### Task 4: 实现 run_critical 和 run_optional

**Files:**
- Modify: `scripts/lib/common.sh`
- Modify: `tests/integration/unit/common.test.sh`

- [ ] **Step 1: 写错误处理测试**

```bash
run_critical "true" "critical ok"
run_optional "false" "optional fail"
```

- [ ] **Step 2: 运行测试，确认函数不存在时失败**

Run: `bash tests/integration/unit/common.test.sh`
Expected: `run_critical: command not found`

- [ ] **Step 3: 实现显式错误处理**

```bash
run_critical() {
  local command="$1"
  local description="$2"
  eval "$command" || return 1
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `bash tests/integration/unit/common.test.sh`
Expected: 关键操作失败会中止，可选操作失败只记录日志

### Task 5: 拆分 setup / execute / report

**Files:**
- Create: `scripts/lib/setup.sh`
- Create: `scripts/lib/execute.sh`
- Create: `scripts/lib/report.sh`
- Create: `tests/integration/registry.sh`
- Create: `tests/integration/phases/*.sh`

- [ ] **Step 1: 先写 phase registry 测试**

```bash
source tests/integration/registry.sh
printf '%s\n' "${PHASE1_TESTS[@]}"
```

- [ ] **Step 2: 让 registry 测试失败**

Run: `bash tests/integration/unit/common.test.sh`
Expected: registry 文件不存在时失败

- [ ] **Step 3: 实现 registry 和 phase 函数**

```bash
PHASE1_TESTS=(
  "JM-GRF-01|test_jmgrf01_influxdb_write|3"
)
```

- [ ] **Step 4: 把旧脚本中的 phase 逻辑迁移到各自函数**

Run: `bash scripts/integration-test.sh --phase phase1`
Expected: 行为与旧脚本一致

### Task 6: 收尾和文档同步

**Files:**
- Modify: `scripts/integration-test.sh`
- Modify: `docs/design/integration-test-design.md`
- Create: `docs/guides/SOP-integration-test.md`

- [ ] **Step 1: 把主脚本缩到入口层**

```bash
source scripts/lib/common.sh
source scripts/lib/setup.sh
source scripts/lib/execute.sh
source scripts/lib/report.sh
```

- [ ] **Step 2: 更新设计文档和 SOP**

Run: `git diff -- docs/design/integration-test-design.md docs/guides/SOP-integration-test.md`
Expected: 设计与实现一致

- [ ] **Step 3: 回归验证并提交**

Run:
`bash scripts/integration-test.sh`

Expected: 现有 CI 工作流保持不变，退出码语义仍然是 0=pass / 1=fail

---

## Notes

- 保持现有 CI workflow 不变。
- 先补基础函数，再迁移 setup/execute/report，最后缩主脚本。
- 所有新行为先写失败测试，再补实现，再验证通过。
