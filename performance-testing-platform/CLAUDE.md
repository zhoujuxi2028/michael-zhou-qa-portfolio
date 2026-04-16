# CLAUDE.md - 性能测试平台 (Performance Testing Platform)

**分类:** 性能测试 | k6 + JMeter 双引擎 | 148 unit + 31 integration + 33 performance tests

## 🔴 分支规则

**所有开发、测试、验证必须在 `feature/performance-testing` 分支，禁止在 `main` 上操作。**

```bash
git checkout feature/performance-testing
```

## 快速命令

```bash
npm install && npm start &        # 启动 API
npm test                          # 单元测试 (148 tests)
npm run k6:smoke                  # k6 smoke test
bash scripts/integration-test.sh  # 集成测试 (31 cases，需 Docker)
```

> ⚠️ **集成测试锁机制:** `scripts/integration-test.sh` 使用互斥锁防止并发执行
>
> - 锁文件: `/tmp/integration-test.lock`
> - 若前次运行异常退出未释放锁: `rm -rf /tmp/integration-test.lock`
> - 同时运行多个实例会立即失败，提示"already running"

完整命令见 [README.md](README.md#npm-脚本)

## 关键文档

- **架构与设计:** [docs/architecture/architecture.md](docs/architecture/architecture.md)
- **测试计划:** [docs/qa/test-plan.md](docs/qa/test-plan.md)
- **测试用例统计:** [docs/qa/test-cases/index.md](docs/qa/test-cases/index.md) ← Phase 1~7 用例数、通过率、详细分类
- **需求追溯矩阵:** [docs/qa/rtm.md](docs/qa/rtm.md)
- **实施计划 Phase 6:** [docs/project-management/implementation-plan-phase6.md](docs/project-management/implementation-plan-phase6.md)
- **风险清单:** [docs/project-management/risks.md](docs/project-management/risks.md)

## SLA

| p95 延迟 | 错误率 |
| -------- | ------ |
| < 500ms  | < 1%   |

## 集成测试锁机制

**问题:** 多个 `scripts/integration-test.sh` 实例同时运行会导致端口冲突、数据库损坏、Grafana 容器冲突。

**解决方案:** 基于 `mkdir` 原子性的互斥锁（`scripts/lock.sh`）

| 操作     | 命令                                                      | 说明                      |
| -------- | --------------------------------------------------------- | ------------------------- |
| 获取锁   | `bash scripts/lock.sh acquire /tmp/integration-test.lock` | 成功则继续，失败则 exit 1 |
| 释放锁   | `bash scripts/lock.sh release /tmp/integration-test.lock` | 幂等操作，总是成功        |
| 自动管理 | `bash scripts/lock.sh guard /tmp/lock "cmd"`              | 获取 → 执行 → 自动释放    |

**如何处理锁冲突:**

```bash
# 情况 1: 前次运行异常退出，锁未释放
rm -rf /tmp/integration-test.lock
bash scripts/integration-test.sh

# 情况 2: 查看谁持有锁
ls -la /tmp/integration-test.lock

# 情况 3: 强制清理（仅在确认无其他进程使用时）
rm -rf /tmp/integration-test.lock
```

## 测试统计数据管理

**原则:** README 只放索引链接，详细统计数据维护在 `docs/qa/test-cases/index.md`

| 位置                          | 内容                                 | 更新频率              |
| ----------------------------- | ------------------------------------ | --------------------- |
| `README.md`                   | 测试类型概览表（不含数字）+ 索引链接 | 很少改变              |
| `docs/qa/test-cases/index.md` | Phase 1~7 用例统计、通过率、变更记录 | 每个 Phase 完成时更新 |
| `CLAUDE.md`                   | 第一行的项目描述含用例总数           | 每个大版本更新        |

**更新流程:**

1. 当单元测试/集成测试数量有变时，直接编辑 `docs/qa/test-cases/index.md` 表格
2. 在表格下方的"用例变更记录"添加一行说明变更
3. 同时更新 `CLAUDE.md` 第一行的项目描述和快速命令部分
4. 不要用 echo/xargs 脚本查询数据，直接编辑 Markdown 表格

**实现细节:**

- 锁文件: `/tmp/integration-test.lock`（目录，不是文件）
- 获取机制: `mkdir` 的原子性保证互斥
- 自动释放: 脚本退出时 trap 调用 `release_lock`
- 单元测试: `tests/unit/scripts/lock.test.js` (9 tests, 100% PASS)

## CI 工作流

`performance-ci.yml` — lint → unit test → k6/JMeter smoke gate
