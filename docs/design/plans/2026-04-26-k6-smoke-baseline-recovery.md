# k6 Smoke Baseline Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 验证 `feature/fix-k6-smoke-baseline` 的有效修改是否仍缺失于当前 `main`，只在缺失时做最小手工移植，否则给出 no-op 结论并清理分支。

**Architecture:** 以当前 `main` 为唯一基线，逐文件对比 `feature/fix-k6-smoke-baseline` 原始涉及文件。先验证 `main` 是否已经具备目标行为；仅当某一文件缺失目标内容时，才把该文件中的最小代码块手工移植到当前工作分支，并立即运行对应验证。

**Tech Stack:** Git, Bash, Docker Compose, Node.js, Jest, BATS, Markdown

---

## 文件结构

| 路径 | 角色 |
|---|---|
| `performance-testing-platform/docker-compose.yml` | `#192/#193` 相关的 Docker Compose 配置真相源 |
| `performance-testing-platform/scripts/lib/setup.sh` | Grafana readiness 超时与启动探测逻辑 |
| `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md` | 根因分析文档 |
| `performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md` | 事件复盘文档 |
| `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md` | 缺陷与 waiver 登记表 |
| `do../design/plans/2026-04-26-k6-smoke-baseline-recovery.md` | 当前实施计划 |

## 目标分支与候选修改

| 项目 | 值 |
|---|---|
| 来源分支 | `feature/fix-k6-smoke-baseline` |
| 关键提交 | `1a7f9dc5` |
| 该提交原始涉及文件 | `docker-compose.yml`、`scripts/lib/setup.sh`、两份 postmortem 文档、`stage4-defect-waiver-register.md` |
| 预期结果 | 当前 `main` 已包含相同修复时不做代码编辑；若缺失则只补缺口 |

### Task 1: 建立文件级证据矩阵

**Files:**
- Modify: `performance-testing-platform/docker-compose.yml`
- Modify: `performance-testing-platform/scripts/lib/setup.sh`
- Modify: `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md`
- Modify: `performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md`
- Modify: `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md`

- [ ] **Step 1: 确认工作分支和基线**

```bash
git switch feature/manual-recover-k6-smoke-baseline
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main
```

Expected: 当前工作分支存在，且 `origin/main` 可读取。

- [ ] **Step 2: 列出来源提交的原始文件**

```bash
git --no-pager show --name-only --format=fuller 1a7f9dc5 -- \
  performance-testing-platform/docker-compose.yml \
  performance-testing-platform/scripts/lib/setup.sh \
  performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/qa/stage4-defect-waiver-register.md
```

Expected: 输出只包含上述 5 个目标文件。

- [ ] **Step 3: 对每个目标文件执行最终树对比**

```bash
git --no-pager diff origin/main..feature/fix-k6-smoke-baseline -- \
  performance-testing-platform/docker-compose.yml \
  performance-testing-platform/scripts/lib/setup.sh \
  performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/qa/stage4-defect-waiver-register.md
```

Expected: 如果输出为空，说明当前 `main` 对这些文件的最终内容已覆盖来源分支目标；若有输出，进入后续补丁任务。

- [ ] **Step 4: 建立 no-op 判定**

```bash
git diff --quiet origin/main..feature/fix-k6-smoke-baseline -- \
  performance-testing-platform/docker-compose.yml \
  performance-testing-platform/scripts/lib/setup.sh \
  performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/qa/stage4-defect-waiver-register.md
echo $?
```

Expected: `0` 表示这 5 个文件无需移植；`1` 表示至少一处仍需补丁。

- [ ] **Step 5: Commit**

```bash
git status --short
```

Expected: 若还没有文件修改，本任务不创建 commit，直接进入 Task 2 做内容级验证。

### Task 2: 验证当前 `main` 已具备 `#192/#193` 目标行为

**Files:**
- Modify: `performance-testing-platform/docker-compose.yml`
- Modify: `performance-testing-platform/scripts/lib/setup.sh`
- Modify: `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md`
- Modify: `performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md`
- Modify: `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md`

- [ ] **Step 1: 验证 `docker-compose.yml` 已具备目标配置**

```yaml
services:
  grafana:
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 30s
```

```bash
cd performance-testing-platform
grep -n "healthcheck" docker-compose.yml
grep -n "start_period: 30s" docker-compose.yml
grep -n "^version:" docker-compose.yml || true
docker compose config --quiet
```

Expected: 存在 `healthcheck` 和 `start_period: 30s`，不存在顶层 `version:`，`docker compose config --quiet` 退出码为 0。

- [ ] **Step 2: 如果 `docker-compose.yml` 缺失上述内容，补上最小修复**

```yaml
services:
  grafana:
    depends_on:
      - influxdb
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3000/api/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 30s
```

```bash
git add performance-testing-platform/docker-compose.yml
git diff --cached -- performance-testing-platform/docker-compose.yml
```

Expected: staged diff 只包含 `healthcheck` 补丁或 `version:` 删除，不包含无关改动。

- [ ] **Step 3: 验证 `scripts/lib/setup.sh` 已具备 120s readiness 逻辑**

```bash
cd performance-testing-platform
grep -n "GRAFANA_READY_TIMEOUT" scripts/lib/setup.sh
grep -n "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" scripts/lib/setup.sh
```

Expected: `GRAFANA_READY_TIMEOUT` 默认值为 `120`，且 `run_critical` 行使用 `120`。

- [ ] **Step 4: 如果 `setup.sh` 缺失 120s 逻辑，补上最小修复**

```bash
GRAFANA_READY_TIMEOUT="${GRAFANA_READY_TIMEOUT:-120}"

run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" "Wait for Grafana readiness" || return 1
```

```bash
git add performance-testing-platform/scripts/lib/setup.sh
git diff --cached -- performance-testing-platform/scripts/lib/setup.sh
```

Expected: staged diff 只包含 timeout 与 readiness 调整。

- [ ] **Step 5: 验证文档已经覆盖 `#192/#193` 结论**

```bash
cd performance-testing-platform
grep -n "#192" docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md
grep -n "#193" docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md
grep -n "DEF-001" docs/qa/stage4-defect-waiver-register.md
grep -n "DEF-002" docs/qa/stage4-defect-waiver-register.md
```

Expected: 两份 postmortem 文档和 defect register 都能命中对应条目。

- [ ] **Step 6: 如果文档缺失，补入精确段落**

```markdown
| DEF-001 | [#192](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/192) | Grafana readiness 超时 | P1 / High | 2026-04-24 | 代码修复（healthcheck + timeout 120s） |
| DEF-002 | [#193](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/193) | docker-compose.yml version 字段过时 | P3 / Low | 2026-04-24 | 代码修复（删除 version 字段） |
```

```bash
git add \
  performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/qa/stage4-defect-waiver-register.md
git diff --cached -- \
  performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md \
  performance-testing-platform/docs/qa/stage4-defect-waiver-register.md
```

Expected: staged diff 只补足 `#192/#193` 文档条目。

- [ ] **Step 7: Commit**

```bash
git status --short
git commit -m "fix(perf): restore missing issue 192 193 artifacts"
```

Expected: 只有在 Task 2 的文件被修改时才创建 commit；若 `git status --short` 为空，则跳过 commit。

### Task 3: 对任何实际移植内容执行完整验证

**Files:**
- Modify: `performance-testing-platform/docker-compose.yml`
- Modify: `performance-testing-platform/scripts/lib/setup.sh`
- Modify: `performance-testing-platform/docs/project-management/postmortems/RCA-2026-04-24-issue-192-193-grafana-readiness.md`
- Modify: `performance-testing-platform/docs/project-management/postmortems/postmortem-2026-04-24-issue-192-193-grafana-readiness.md`
- Modify: `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md`
- Test: `performance-testing-platform/tests/`

- [ ] **Step 1: 如果 Task 2 没有产生任何文件修改，记录 no-op 结论**

```bash
git diff --quiet origin/main..HEAD
echo $?
```

Expected: `0` 表示当前分支相对 `origin/main` 无任何实际改动，本任务后续验证命令可仅作为确认，不需要创建 PR。

- [ ] **Step 2: 运行代码质量与覆盖率验证**

```bash
cd performance-testing-platform
npm run lint
npm run format:check
npm run test:coverage
```

Expected: 三条命令全部退出码为 0。

- [ ] **Step 3: 运行集成与 shell 自测**

```bash
cd performance-testing-platform
npm run test:integration
PATH="/usr/local/bin:$PATH" ./node_modules/.bin/bats tests/unit/scripts/stage4-selftest-fast.bats
PATH="/usr/local/bin:$PATH" ./node_modules/.bin/bats tests/unit/scripts/stage4-selftest-integration.bats
```

Expected: `test:integration` 通过，BATS 两套测试均为 `0 failures`。

- [ ] **Step 4: 运行 `#192/#193` 关联运行时验证**

```bash
cd performance-testing-platform
npm run jmeter:dryrun
bash scripts/integration-test.sh
```

Expected: `jmeter:dryrun` 输出 `Dry-run passed`；`integration-test.sh` 成功完成 setup 与测试阶段，不因 Grafana readiness 失败退出。

- [ ] **Step 5: Commit**

```bash
git status --short
git commit -m "test(perf): verify recovered issue 192 193 changes"
```

Expected: 只有在 Task 3 过程中新增了验证产物且仓库允许提交这些产物时才提交；否则保持工作树干净。

### Task 4: 决策与收尾

**Files:**
- Modify: `do../design/plans/2026-04-26-k6-smoke-baseline-recovery.md`

- [ ] **Step 1: 判定是否需要 PR**

```bash
git diff --stat origin/main..HEAD
```

Expected:
- 若输出为空：判定为 **no-op**，说明 `feature/fix-k6-smoke-baseline` 的有效修改已在当前 `main` 中。
- 若输出非空：进入 Step 2 创建 PR。

- [ ] **Step 2: 若存在净新增修改，推送并创建 PR**

```bash
git push -u origin feature/manual-recover-k6-smoke-baseline
gh pr create \
  --base main \
  --head feature/manual-recover-k6-smoke-baseline \
  --title "fix(perf): recover issue 192 193 changes from baseline branch" \
  --body "Recover still-missing valid changes from feature/fix-k6-smoke-baseline onto current main."
```

Expected: PR 创建成功，并只包含 Task 2/Task 3 的净新增改动。

- [ ] **Step 3: 若判定为 no-op，回报并删除过期分支**

```bash
git switch main
git branch -D feature/fix-k6-smoke-baseline
git branch -D backup/local-main-before-reset-20260426 || true
```

Expected: 仅在用户确认不再需要历史备份时删除过期本地分支。

