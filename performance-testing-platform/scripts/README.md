# scripts/ — 脚本目录说明

本目录包含性能测试平台的所有运维与自动化脚本，按职责分组如下：

---

## 目录结构

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
│   ├── phase6-rate-limiter.sh  # Phase 6：限流中间件集成测试 (RL-INT-01~03 + GEN-INT)
│   └── phase7-soak.sh          # Phase 7：Grafana + InfluxDB 浸泡监控集成测试
│
├── analysis/                   # Node.js 数据分析工具
│   ├── baseline-export.js      # 导出当前 k6 结果为 baseline.json
│   ├── baseline-compare.js     # 对比前后两次基线，检测性能回归
│   ├── ci-lint.js              # CI workflow 输出目录卫生检查 (ISS-019)
│   └── trend-collect.js        # 追加历史趋势数据到 trend.json
│
├── server.sh                   # 服务器生命周期管理（start/stop/restart/collect）
├── preflight-check.sh          # 性能测试前环境预检（负载、内存、CPU、Docker）
├── jmeter-dryrun.sh            # JMeter 预检：1 线程验证所有请求成功后再跑全量
├── integration-test.sh         # 集成测试主入口（--phase 参数分发）
├── generate-summary.sh         # 解析 k6 JSON 输出，生成 Markdown 执行摘要
└── stage4-selftest.sh          # Stage 4 验收自测（代码质量、集成测试、文档完整性）
```

---

## 快速参考

| 场景 | 命令 |
|------|------|
| 启动 API 服务 | `bash scripts/server.sh start cluster` |
| 停止 API 服务 | `bash scripts/server.sh stop` |
| 环境预检 | `bash scripts/preflight-check.sh` |
| JMeter 预检 | `npm run jmeter:dryrun` |
| 运行集成测试 | `bash scripts/integration-test.sh` |
| 运行阶段集成测试 | `bash scripts/integration-test.sh --phase 6` |
| 运行 Phase 7 浸泡测试 | `bash scripts/integration-test.sh --phase soak` |
| 导出性能基线 | `npm run baseline:export` |
| 趋势数据收集 | `npm run trend:collect` |
| CI workflow 卫生检查 | `npm run ci:lint` |
| Stage 4 验收自测 | `bash scripts/stage4-selftest.sh` |

---

## 分层说明

### `lib/` — Shell 工具库

这些文件由 `integration-test.sh` 等入口脚本 `source` 引入，**不应直接执行**。

- **common.sh**：`log_info / log_warn / log_error / log_debug`、`retry_with_backoff`、`wait_for_endpoint`
- **execute.sh**：`execute_test_with_retry`、`execute_phase`（从 `tests/integration/registry.sh` 加载测试注册表）
- **lock.sh**：`acquire_lock / release_lock`（基于 `mkdir` 原子性，防止并发执行）
- **report.sh**：`generate_markdown_report`、`generate_json_report`、`capture_grafana_snapshot`
- **setup.sh**：`setup_phase`（预检 → 锁定 → 启动 Docker → 等待服务就绪 → 启动 API）

### `phases/` — 阶段专用集成测试

这些脚本针对特定功能阶段的集成测试场景，由 `integration-test.sh` 在 `--phase soak` 时委托调用，也可单独执行：

```bash
bash scripts/phases/phase6-rate-limiter.sh   # 限流测试
bash scripts/phases/phase7-soak.sh           # 浸泡监控测试（需 Docker）
```

### `analysis/` — Node.js 数据分析工具

从项目根目录执行（`npm run` 或直接 `node scripts/analysis/...`）：

```bash
node scripts/analysis/baseline-export.js    # 从 summary.json 提取基线
node scripts/analysis/baseline-compare.js   # 对比基线（--test-mode 用于集成测试）
node scripts/analysis/trend-collect.js      # 追加趋势条目
node scripts/analysis/ci-lint.js            # 检查 CI 输出目录规范
```

---

## 锁机制（并发防护）

`lib/lock.sh` 使用 `mkdir` 的原子性防止集成测试并发执行：

```bash
bash scripts/lib/lock.sh acquire /tmp/my.lock   # 加锁（失败则退出 1）
bash scripts/lib/lock.sh release /tmp/my.lock   # 解锁
```

如果测试异常退出导致锁文件残留：

```bash
rm -rf /tmp/integration-test.lock
```
