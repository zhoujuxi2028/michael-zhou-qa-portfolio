# IVI 软件集成与持续验证实验室 — 架构设计

## 系统边界

实验室仅在本地/容器内处理合成包和模拟目标。任何适配器都不得默认连接真实设备、网络刷写服务或车厂系统。

## 端到端数据流

```text
固定输入 + package builder
      │ 合成包 + manifest/hash
      ▼
包校验（标识 / 版本 / hash）
      ▼
Run Coordinator ── run ID / 配置
      │
      ├── Deployment Simulator(target_id) ── target snapshot → stage → verify → commit
      │             └─ 失败 → rollback 同一 target → 记录状态
      ▼
Target Adapter（virtual | bench-sim）
      ▼
pytest suites（smoke → integration → regression）
      ▼
证据收集（结构化日志 / JUnit XML / HTML）
      ▼
Quality Gate → exit code + 指标记录
      ▲
Defect-to-Regression Registry（缺陷分类 → 用例 ID）
```

## 模块职责

| 模块 | 单一职责 | 关键契约 |
|---|---|---|
| `package_builder` | 从固定仓库输入生成合成包和 manifest/hash | 相同输入可重现；不产出真实固件 |
| `package_manager` | 读取 manifest、校验包标识与完整性 | 校验失败不得启动部署 |
| `deployment` | 按 `target_id` 维护模拟部署状态、版本快照和回滚 | 每个目标有独立当前版本；部署/回滚均指定同一目标；commit 前失败必须尝试恢复该目标旧版本 |
| `targets` | 提供 virtual、bench-sim 目标适配器和目标状态 | 共用协议；每个目标持有独立部署版本；目标类型和能力显式标识 |
| `runner` | 为运行创建上下文并选择测试层和目标 | 每次运行分配 run ID，收集阶段结果 |
| `tests` | 按 smoke/integration/regression 放置验收用例 | 通过 pytest markers 或目录分层独立选择 |
| `evidence` | 汇总日志、JUnit XML 和 HTML 报告 | 报告与 run ID 关联；生成失败对门禁可见 |
| `quality_gate` | 汇总测试、部署、回滚、报告结果 | 任何强制条件失败返回非零 |
| `defect_registry` | 维护缺陷分类、根因摘要和回归用例关联 | 每条已修复缺陷至少关联一个回归用例 |
| `metrics` | 记录耗时、稳定性、报告成功率和故障识别 | 记录分母、样本量、配置与结果，避免孤立百分比 |

## 状态与失败语义

部署状态建议为 `PENDING → VALIDATING → STAGING → VERIFYING → COMMITTED`。部署前记录当前模拟版本；在 `COMMITTED` 前出现错误，转入 `ROLLING_BACK`，成功则记录 `ROLLED_BACK`，失败则记录 `ROLLBACK_FAILED`。原错误和回滚错误都保留，门禁对两种部署失败状态均拒绝放行。

`run_id` 贯穿包构建、校验、部署、测试和报告；部署操作必须携带 `target_id`，目标适配器提供该目标当前版本，回滚只恢复该目标快照。失败分类建议至少包含 `package_build`、`package_validation`、`deployment`、`rollback`、`test_failure`、`report_generation`、`environment`。

## 建议目录

```text
ivi-integration-continuous-validation-lab/
├── src/ivi_lab/{package_builder,package_manager,deployment,targets,runner,evidence,quality_gate,metrics}/
├── tests/{unit,integration,smoke,regression}/
├── fixtures/{packages,defects}/
├── reports/                 # 运行产物，不提交
├── Makefile
├── Dockerfile
├── pyproject.toml
└── .github/workflows/       # 根仓库 workflow 的工作目录需显式设为子项目
```

该目录为设计建议；实现前应确认是否沿用仓库根 `.github/workflows/` 的 CI 约定。
