# Grafana Sqlite Lock Defect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `performance-testing-platform` 中 Grafana 因 SQLite lock 在启动期退出的问题，并完成 defect-tracking 闭环。

**Architecture:** 先用文本级单测锁定三类行为：Grafana compose 环境变量、`setup.sh` 统一 readiness 入口、`phase-1-grafana.sh` 复用共享 helper。然后做最小实现，只改 `docker-compose.yml` 和两处 shell 脚本；最后创建 GitHub Issue、更新 defect register，并用完整验证证明缺陷关闭。

**Tech Stack:** Docker Compose, Grafana 10.2, Bash, Jest, gh CLI, Markdown

---

## 文件结构

| 路径 | 角色 |
|---|---|
| `performance-testing-platform/docker-compose.yml` | Grafana 容器环境变量与 healthcheck 配置 |
| `performance-testing-platform/scripts/lib/setup.sh` | 集成测试 setup 阶段的共享 readiness 逻辑 |
| `performance-testing-platform/tests/integration/phases/phase-1-grafana.sh` | Phase 1 Grafana + InfluxDB 集成入口 |
| `performance-testing-platform/tests/unit/scripts/setup.test.sh` | shell 层单测，验证 `setup_phase()` 调用顺序 |
| `performance-testing-platform/tests/unit/scripts/grafana-sqlite-lock.test.js` | 新增 Jest 单测，锁定 compose 配置与共享 helper 复用 |
| `performance-testing-platform/docs/qa/defect-register.md` | 项目级缺陷登记表，新增并关闭 `DEF-009` |
| `docs/project-management/defect-tracking/defect-register.md` | Portfolio 级入口与最近更新时间 |
| `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-26-grafana-sqlite-lock.md` | `DEF-009` 关闭后的 RCA 文档 |
| `do../design/plans/2026-04-26-grafana-sqlite-lock-defect.md` | 当前实施计划 |

## 目标缺陷

| 项目 | 值 |
|---|---|
| 项目级 Defect ID | `DEF-009` |
| 缺陷类型 | `bug/test` |
| 严重度 | `P1 / High` |
| Gate 影响 | `✅ Blocking` |
| 关闭条件 | `bash scripts/integration-test.sh` 不再因 Grafana `database is locked` 失败 |

### Task 1: 添加失败测试，锁定预期行为

**Files:**
- Create: `performance-testing-platform/tests/unit/scripts/grafana-sqlite-lock.test.js`
- Modify: `performance-testing-platform/tests/unit/scripts/setup.test.sh`
- Test: `performance-testing-platform/tests/unit/scripts/grafana-sqlite-lock.test.js`
- Test: `performance-testing-platform/tests/unit/scripts/setup.test.sh`

- [ ] **Step 1: 在 Jest 中写 compose / phase script 的失败测试**

```js
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../../../');
const COMPOSE_FILE = path.join(PROJECT_ROOT, 'docker-compose.yml');
const SETUP_SCRIPT = path.join(PROJECT_ROOT, 'scripts/lib/setup.sh');
const PHASE1_SCRIPT = path.join(PROJECT_ROOT, 'tests/integration/phases/phase-1-grafana.sh');

describe('grafana sqlite lock hardening', () => {
  test('docker-compose 为 Grafana 配置 sqlite lock 容错参数', () => {
    const compose = fs.readFileSync(COMPOSE_FILE, 'utf8');

    expect(compose).toContain('- GF_DATABASE_MAX_OPEN_CONN=1');
    expect(compose).toContain('- GF_DATABASE_QUERY_RETRIES=50');
    expect(compose).toContain('- GF_DATABASE_TRANSACTION_RETRIES=50');
  });

  test('setup 脚本通过共享 helper 等待 Grafana readiness', () => {
    const script = fs.readFileSync(SETUP_SCRIPT, 'utf8');

    expect(script).toContain('run_critical "wait_for_grafana_ready" "Wait for Grafana readiness"');
    expect(script).not.toContain(
      `run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" "Wait for Grafana readiness"`
    );
  });

  test('phase 1 grafana 脚本复用共享 helper，而不是单独 wait_for_endpoint', () => {
    const script = fs.readFileSync(PHASE1_SCRIPT, 'utf8');

    expect(script).toContain('run_critical "wait_for_grafana_ready" "Wait for Grafana readiness"');
    expect(script).not.toContain(`wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 60`);
  });
});
```

- [ ] **Step 2: 在 shell 单测中锁定 `setup_phase()` 调用了共享 helper**

```bash
#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

source scripts/lib/common.sh
source scripts/lib/setup.sh

calls=()

lock_acquire() { calls+=("lock:$1"); return 0; }
lock_release() { calls+=("unlock:$1"); return 0; }
run_critical() { calls+=("critical:$1|$2"); return 0; }
run_optional() { calls+=("optional:$2"); return 0; }
wait_for_grafana_ready() { calls+=("grafana-ready"); return 0; }
wait_for_endpoint() { calls+=("legacy-endpoint:$1:$2:$3"); return 0; }

assert_call() {
  local expected="$1"
  local call
  for call in "${calls[@]}"; do
    if [ "$call" = "$expected" ]; then
      printf '✓ %s\n' "$expected"
      return 0
    fi
  done
  printf '✗ missing call: %s\n' "$expected"
  return 1
}

setup_phase

assert_call "lock:/tmp/integration-test.lock"
assert_call "critical:bash scripts/preflight-check.sh --stage4|Environment preflight check"
assert_call "critical:docker compose up -d influxdb grafana|Start Docker services"
assert_call "critical:wait_for_grafana_ready|Wait for Grafana readiness"

if printf '%s\n' "${calls[@]}" | grep -q '^legacy-endpoint:'; then
  printf '✗ legacy wait_for_endpoint should not be called\n'
  exit 1
fi
```

- [ ] **Step 3: 运行测试，确认它们先失败**

Run:

```bash
cd performance-testing-platform
npx jest tests/unit/scripts/grafana-sqlite-lock.test.js --runInBand
bash tests/unit/scripts/setup.test.sh
```

Expected:
- `grafana-sqlite-lock.test.js` 失败，提示缺少 Grafana SQLite 参数与 helper 调用
- `setup.test.sh` 失败，提示仍在使用 legacy `wait_for_endpoint`

- [ ] **Step 4: Commit**

```bash
git status --short
```

Expected: 只有测试文件改动；本任务不创建 commit，直接进入实现任务。

### Task 2: 做最小实现，让测试转绿

**Files:**
- Modify: `performance-testing-platform/docker-compose.yml`
- Modify: `performance-testing-platform/scripts/lib/setup.sh`
- Modify: `performance-testing-platform/tests/integration/phases/phase-1-grafana.sh`
- Test: `performance-testing-platform/tests/unit/scripts/grafana-sqlite-lock.test.js`
- Test: `performance-testing-platform/tests/unit/scripts/setup.test.sh`

- [ ] **Step 1: 给 Grafana 增加 SQLite lock 容错配置**

```yaml
  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - '3010:3000'
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_DATABASE_MAX_OPEN_CONN=1
      - GF_DATABASE_QUERY_RETRIES=50
      - GF_DATABASE_TRANSACTION_RETRIES=50
```

- [ ] **Step 2: 把 `setup_phase()` 切到共享 helper**

```bash
setup_phase() {
  log_info "=============================================="
  log_info " Setup Phase: Environment Initialization"
  log_info "=============================================="

  lock_acquire "$LOCK_DIR" || return 1

  run_critical "bash scripts/preflight-check.sh --stage4" "Environment preflight check" || return 1
  run_optional "rm -f data/perf.db*" "Clean stale database files"
  run_critical "docker compose up -d influxdb grafana" "Start Docker services" || return 1
  run_critical "wait_for_grafana_ready" "Wait for Grafana readiness" || return 1
  run_critical "bash scripts/server.sh start single" "Start API service" || return 1

  log_info "✅ Setup phase complete"
  return 0
}
```

- [ ] **Step 3: 把 phase 1 Grafana 测试切到同一 helper**

```bash
run_phase_1_grafana() {
  log_info "Phase 1: Grafana + InfluxDB"
  run_critical "docker compose up -d influxdb grafana" "Start Grafana + InfluxDB" || return 1
  run_critical "wait_for_grafana_ready" "Wait for Grafana readiness" || return 1
  run_critical "bash scripts/server.sh start single" "Start API (single mode)" || return 1
```

- [ ] **Step 4: 运行新增单测，确认转绿**

Run:

```bash
cd performance-testing-platform
npx jest tests/unit/scripts/grafana-sqlite-lock.test.js --runInBand
bash tests/unit/scripts/setup.test.sh
```

Expected:
- `3 passed`
- shell 单测输出 `✓ critical:wait_for_grafana_ready|Wait for Grafana readiness`

- [ ] **Step 5: Commit**

```bash
git add \
  performance-testing-platform/docker-compose.yml \
  performance-testing-platform/scripts/lib/setup.sh \
  performance-testing-platform/tests/integration/phases/phase-1-grafana.sh \
  performance-testing-platform/tests/unit/scripts/grafana-sqlite-lock.test.js \
  performance-testing-platform/tests/unit/scripts/setup.test.sh
git commit -m "fix(perf): harden grafana sqlite startup"
```

### Task 3: 创建 Issue 并同步 defect register

**Files:**
- Modify: `performance-testing-platform/docs/qa/defect-register.md`
- Modify: `docs/project-management/defect-tracking/defect-register.md`

- [ ] **Step 1: 创建 GitHub Issue**

Run:

```bash
cat > /tmp/grafana-sqlite-lock-issue.md <<'EOF'
## 问题说明

`bash scripts/integration-test.sh` 在 setup 阶段会拉起 Grafana，但当前容器会因 SQLite lock 在启动期退出：

- log: `migration failed: executing migration: database is locked`
- symptom: `http://localhost:3010/api/health` 超时
- impact: Phase 7 integration test 被阻塞

## 复现步骤

```bash
cd performance-testing-platform
bash scripts/integration-test.sh
```

## 期望结果

Grafana 保持 running，`/api/health` 成功，integration test 可继续执行。
EOF

ISSUE_URL="$(gh issue create \
  --title 'fix(perf): grafana sqlite lock aborts phase 7 integration startup' \
  --body-file /tmp/grafana-sqlite-lock-issue.md \
  --label performance-testing \
  --label bug/test \
  --label P1)"
ISSUE_NUMBER="${ISSUE_URL##*/}"
printf 'issue=%s\nurl=%s\n' "$ISSUE_NUMBER" "$ISSUE_URL"
```

Expected: 输出实际 `issue=<number>`，后续步骤统一使用该 `ISSUE_NUMBER`。

- [ ] **Step 2: 在项目级 defect register 新增 `DEF-009` 活跃缺陷**

在 `performance-testing-platform/docs/qa/defect-register.md` 的 Active Defects 表中追加一行：

```markdown
| DEF-009 | [#${ISSUE_NUMBER}](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/${ISSUE_NUMBER}) | Grafana sqlite lock 导致 setup 阶段容器退出 | P1 / High | ✅ Blocking | 2026-04-26 | 🟡 Fixing | — | 根因线索：Grafana SQLite 在 migration / dashboard provisioning 启动期发生 `database is locked`，导致 `/api/health` 永远不可达 |
```

并在变更日志追加：

```markdown
| 2026-04-26 | 登记 `DEF-009`：Grafana sqlite lock 导致 integration test setup 阻塞 | QA |
```

- [ ] **Step 3: 更新 Portfolio 主登记表入口**

把 `docs/project-management/defect-tracking/defect-register.md` 的 `performance-testing-platform` 行改成：

```markdown
| performance-testing-platform | [defect-register.md](../../../performance-testing-platform/docs/qa/defects/register.md) | 5（DEF-005、DEF-006、DEF-007、DEF-008、DEF-009） | 2026-04-26 |
```

- [ ] **Step 4: 校验文档更新**

Run:

```bash
git diff -- performance-testing-platform/docs/qa/defect-register.md docs/project-management/defect-tracking/defect-register.md
```

Expected:
- 项目级表新增 `DEF-009`
- Portfolio 主表链接从旧的 `stage4-defect-waiver-register.md` 切到当前 `defect-register.md`
- Active count 更新为 5

- [ ] **Step 5: Commit**

```bash
git add \
  performance-testing-platform/docs/qa/defect-register.md \
  docs/project-management/defect-tracking/defect-register.md
git commit -m "docs(perf): track grafana sqlite lock defect"
```

### Task 4: 完整验证并关闭缺陷

**Files:**
- Modify: `performance-testing-platform/docs/qa/defect-register.md`
- Modify: `docs/project-management/defect-tracking/defect-register.md`
- Create: `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-26-grafana-sqlite-lock.md`

- [ ] **Step 1: 先做配置与单测验证**

Run:

```bash
cd performance-testing-platform
docker compose config --quiet
npx jest tests/unit/scripts/grafana-sqlite-lock.test.js --runInBand
bash tests/unit/scripts/setup.test.sh
```

Expected: 三条命令全部退出码 `0`。

- [ ] **Step 2: 跑仓库既有回归**

Run:

```bash
cd performance-testing-platform
npm run lint
npm run test:coverage
```

Expected:
- `npm run lint` 通过
- `npm run test:coverage` 通过，且没有因本次改动引入新的 unit regression

- [ ] **Step 3: 跑缺陷对应的运行时验证**

Run:

```bash
cd performance-testing-platform
docker compose down
bash scripts/integration-test.sh
```

Expected:
- Grafana 容器保持 running
- `database is locked` 不再导致启动中止
- integration test 完整通过

- [ ] **Step 4: 写 RCA 并关闭 `DEF-009`**

创建 `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-26-grafana-sqlite-lock.md`：

```markdown
# RCA: Grafana sqlite lock during phase 7 integration startup

## 事件摘要

| 项目 | 内容 |
|---|---|
| Defect | `DEF-009` |
| Issue | `#${ISSUE_NUMBER}` |
| 发现日期 | 2026-04-26 |
| 影响 | `bash scripts/integration-test.sh` setup 阶段被阻塞 |

## 根因

| 层面 | 说明 |
|---|---|
| 直接原因 | Grafana 使用默认 SQLite，在 migration / dashboard provisioning 启动期发生短时 lock 冲突 |
| 放大因素 | 启动链对 SQLite lock 缺少 retry / busy-timeout 容错 |
| 诊断缺口 | `setup.sh` 与 `phase-1-grafana.sh` 各自维护 readiness 逻辑，失败信息不一致 |

## 修复

| 文件 | 修改 |
|---|---|
| `docker-compose.yml` | 添加 `GF_DATABASE_MAX_OPEN_CONN=1`、`GF_DATABASE_QUERY_RETRIES=50`、`GF_DATABASE_TRANSACTION_RETRIES=50` |
| `scripts/lib/setup.sh` | 改为 `wait_for_grafana_ready` |
| `tests/integration/phases/phase-1-grafana.sh` | 改为复用 `wait_for_grafana_ready` |

## 验证

| 命令 | 结果 |
|---|---|
| `docker compose config --quiet` | PASS |
| `npm run lint` | PASS |
| `npm run test:coverage` | PASS |
| `bash scripts/integration-test.sh` | PASS |
```

先记录代码修复 commit：

```bash
CODE_COMMIT="$(git rev-parse --short HEAD)"
printf 'code_commit=%s\n' "$CODE_COMMIT"
```

然后把 `performance-testing-platform/docs/qa/defect-register.md` 中 `DEF-009` 从 Active 区移到 Closed Defects：

```markdown
| DEF-009 | [#${ISSUE_NUMBER}](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/${ISSUE_NUMBER}) | Grafana sqlite lock 导致 setup 阶段容器退出 | P1 / High | 2026-04-26 | 代码修复（SQLite retry/busy-timeout + 统一 readiness helper） | `${CODE_COMMIT}` |
```

并把 Portfolio 主表入口行更新为：

```markdown
| performance-testing-platform | [defect-register.md](../../../performance-testing-platform/docs/qa/defects/register.md) | 4（DEF-005、DEF-006、DEF-007、DEF-008） | 2026-04-26 |
```

- [ ] **Step 5: 关闭 GitHub Issue 并提交文档**

Run:

```bash
gh issue close "$ISSUE_NUMBER" --comment "Verified in local defect fix workflow: compose config, unit tests, lint, coverage, and full integration test all passed."
git add \
  performance-testing-platform/docs/qa/defect-register.md \
  docs/project-management/defect-tracking/defect-register.md \
  performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-26-grafana-sqlite-lock.md
git commit -m "docs(perf): close grafana sqlite lock defect"
```
