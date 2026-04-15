# CLAUDE.md - 性能测试平台 (Performance Testing Platform)

**分类:** 性能测试 | k6 + JMeter 双引擎 | 95 unit + 23 integration + 26 performance tests

## 🔴 分支规则

**所有开发、测试、验证必须在 `feature/performance-testing` 分支，禁止在 `main` 上操作。**

```bash
git checkout feature/performance-testing
```

## 快速命令

```bash
npm install && npm start &        # 启动 API
npm test                          # 单元测试 (95 tests)
npm run k6:smoke                  # k6 smoke test
bash scripts/integration-test.sh  # 集成测试 (需 Docker)
```

完整命令见 [README.md](README.md#npm-脚本)

## 关键文档

- **架构与设计:** [docs/architecture/architecture.md](docs/architecture/architecture.md)
- **测试计划:** [docs/qa/test-plan.md](docs/qa/test-plan.md)
- **需求追溯矩阵:** [docs/qa/rtm.md](docs/qa/rtm.md)
- **实施计划 Phase 6:** [docs/project-management/implementation-plan-phase6.md](docs/project-management/implementation-plan-phase6.md)
- **风险清单:** [docs/project-management/risks.md](docs/project-management/risks.md)

## SLA

| p95 延迟 | 错误率 |
|---------|--------|
| < 500ms | < 1%   |

## CI 工作流

`performance-ci.yml` — lint → unit test → k6/JMeter smoke gate
