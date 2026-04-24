# scripts/ 企业级重组 + ShellCheck + BATS CI 集成设计

> **实施日期：** 2026-04-24  
> **分支：** `copilot/organize-scripts-for-enterprise-standard`  
> **关联 PR：** [#197](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/197)

---

## 1. 背景与目标

**背景：** scripts/ 目录原有结构将阶段专用脚本、工具库、数据分析脚本混放于同一层级，导致：
- 脚本职责不清（工具库 vs 独立可执行 vs 阶段专用）
- ShellCheck 警告未处理（8 处，涉及 trap、redirect、unused variable）
- BATS shell 测试（`stage4-selftest.bats`）仅能本地手动运行，未接入 CI

**目标：**
1. 按职责分层重组 `scripts/` 为企业级目录结构
2. 修复所有 ShellCheck `--severity=warning` 警告
3. 将 BATS 测试集成到 CI 流水线（新增 `shell-tests` 并行作业）

---

## 2. scripts/ 目录结构设计

### 2.1 重组前后对比

| 旧路径                              | 新路径                        | 说明                    |
| ----------------------------------- | ----------------------------- | ----------------------- |
| `scripts/lock.sh`                   | `scripts/lib/lock.sh`         | 工具库，非独立可执行    |
| `scripts/integration-test-phase6.sh` | `scripts/phases/phase6-rate-limiter.sh` | 阶段专用集成测试 |
| `scripts/integration-test-phase7-soak.sh` | `scripts/phases/phase7-soak.sh` | 阶段专用集成测试 |
| `scripts/analysis/*.js`             | `scripts/analysis/`（已存在） | Node.js 数据分析工具    |

### 2.2 最终目录结构

```
scripts/
├── lib/                        # Shell 工具库（内部复用，不直接执行）
│   ├── common.sh               # 日志函数、重试机制、端点等待
│   ├── execute.sh              # 测试执行引擎（阶段调度、结果记录）
│   ├── lock.sh                 # 互斥锁工具（基于 mkdir 原子性）
│   ├── report.sh               # 报告生成（Markdown / JSON）
│   └── setup.sh                # 环境准备（Docker 启动、服务等待）
│
├── phases/                     # 阶段专用集成测试脚本
│   ├── phase6-rate-limiter.sh  # Phase 6：限流中间件集成测试
│   └── phase7-soak.sh          # Phase 7：Grafana + InfluxDB 浸泡监控集成测试
│
├── analysis/                   # Node.js 数据分析工具
│   ├── baseline-export.js
│   ├── baseline-compare.js
│   ├── ci-lint.js
│   └── trend-collect.js
│
├── server.sh                   # 服务器生命周期管理
├── preflight-check.sh          # 环境预检
├── jmeter-dryrun.sh            # JMeter 预检
├── generate-summary.sh         # 报告汇总
├── integration-test.sh         # 主集成测试入口
└── stage4-selftest.sh          # Stage 4 自测脚本
```

### 2.3 路径解析惯例

移入子目录的脚本需要额外一层 `dirname` 解析：

```bash
# phases/ 脚本的路径解析
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"   # → scripts/phases/
SCRIPTS_DIR="$(dirname "$SCRIPT_DIR")"         # → scripts/
PROJECT_DIR="$(dirname "$SCRIPTS_DIR")"        # → performance-testing-platform/
```

---

## 3. ShellCheck 修复清单

| 文件 | 规则 | 问题描述 | 修复方式 |
| ---- | ---- | -------- | -------- |
| `scripts/lib/lock.sh` | SC2064 | `trap` 内使用双引号导致变量提前展开 | 改为单引号：`trap 'rm -rf "$LOCK_DIR"' EXIT` |
| `scripts/phases/phase7-soak.sh` | SC2034 | `INFLUXDB_ORG`、`INFLUXDB_TIMEOUT` 未使用（由外部引用） | 添加 `# shellcheck disable=SC2034` |
| `scripts/phases/phase7-soak.sh` | SC2034 | `for i in {1..10}` 的循环变量 `i` 未使用 | 改为 `for _ in {1..10}` |
| `scripts/integration-test.sh` | SC2034 | `DEBUG_MODE=1` 设置后未被当前 shell 引用 | 改为 `export DEBUG_MODE=1` |
| `scripts/stage4-selftest.sh` | SC2034 | 未使用变量 `DATE`、`API_PID` | 删除未使用变量 |
| `scripts/stage4-selftest.sh` | SC2155 | `local load=$(...)` 同时声明和赋值 | 拆分为 `local load; load=$(...)` |
| `scripts/stage4-selftest.sh` | SC2069 | `2>&1 >file` 重定向顺序错误 | 改为 `>file 2>&1` |

---

## 4. BATS CI 集成设计

### 4.1 CI Job 设计

新增 `shell-tests` 作业，与 `unit-tests` 并行运行：

```yaml
shell-tests:
  name: Performance Testing / Shell Tests (BATS)
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install bats-core
      run: sudo apt-get install -y bats
    - name: Run BATS shell tests
      run: bats tests/unit/scripts/stage4-selftest.bats
      working-directory: performance-testing-platform
```

### 4.2 依赖关系更新

```
performance-lint
    ├── unit-tests   ──┐
    └── shell-tests  ──┴── smoke-test / jmeter-dryrun
```

`jmeter-dryrun` 和 `smoke-test` 的 `needs` 从 `[unit-tests]` 更新为 `[unit-tests, shell-tests]`。

### 4.3 BATS 测试范围

`tests/unit/scripts/stage4-selftest.bats` — 25 个用例，覆盖：

| 分组 | 用例范围 | 验证内容 |
| ---- | -------- | -------- |
| 前置条件 | 9.1 | 当前分支为有效工作分支（非 main） |
| 1.x 代码质量 | 1.1–1.4 | 单元测试通过、ESLint 0 error、Prettier 格式、覆盖率 |
| 2.x Shell 集成 | 2.1–2.2 | k6 集成（可 SKIP）、互斥锁机制 |
| 3.x RTM | 3.1 | RTM 覆盖率 ≥75 项 |
| 4.x 风险 | 4.1 | 历史风险已记录 |
| 5.x 安全 | 5.1–5.3 | Issue 状态、XSS 修复代码、HTTP 头 |
| 6.x CI | 6.1–6.2 | CI 状态（可 SKIP）、无非豁免 continue-on-error |
| 8.x 文档 | 8.1–8.3 | 验收报告存在、CLAUDE.md 锁机制文档、架构文档 |
| 9.x 提交 | 9.2 | 最近提交符合 conventional commits 格式 |

---

## 5. 影响范围

### 5.1 需更新引用路径的文件

| 文件 | 旧路径 | 新路径 |
| ---- | ------ | ------ |
| `docs/design/integration-test-design.md` | `scripts/integration-test-phase7-soak.sh` | `scripts/phases/phase7-soak.sh` |
| `docs/design/integration-test-design.md` | `scripts/lock.sh` | `scripts/lib/lock.sh` |
| `docs/qa/test-cases/phase7-cicd.md` | `scripts/integration-test-phase7-soak.sh` | `scripts/phases/phase7-soak.sh` |
| `docs/qa/test-cases/phase4-soak.md` | `scripts/integration-test-phase7-soak.sh` | `scripts/phases/phase7-soak.sh` |
| `docs/qa/test-plan.md` | `scripts/integration-test-phase7-soak.sh` | `scripts/phases/phase7-soak.sh` |
| `tests/unit/scripts/*.test.js` | `scripts/lock.sh` 等 | `scripts/lib/lock.sh` 等 |
| `scripts/integration-test.sh` | `scripts/lib/lock.sh` source 路径 | 已更新 |

### 5.2 不需要更新的文件

- `docs/project-management/postmortems/`：历史记录，保持原貌
- `docs/project-management/plans/2026-04-17-*.md`：历史计划文档，保持原貌
- `docs/qa/reports/archive/`：归档文件，保持原貌

---

## 6. 验证方式

```bash
# ShellCheck 全量检查
find performance-testing-platform/scripts/ -name "*.sh" -print0 \
  | xargs -0 shellcheck --severity=warning

# BATS 本地运行
cd performance-testing-platform
bats tests/unit/scripts/stage4-selftest.bats

# CI 验证
# push → GitHub Actions → Performance Testing / Shell Tests (BATS) 作业绿灯
```
