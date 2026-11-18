# Diagnostics & Log Triage Lab

汽车诊断协议与日志分析实验室：合成 CAN/CAN FD + UDS 日志 → 协议级异常识别 → 聚类去重 → P1/P2 分流 → 缺陷转 pytest 回归模板。

> **状态**：Stage 4 — Testing（[#838](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/838)）
> **声明**：simulation lab，全部使用合成数据，不代表实车、台架或量产 ECU 经验。

## 范围

| Phase | 内容 |
|-------|------|
| 1 | CAN/CAN FD 解析与异常规则、UDS 诊断模拟、日志聚类与分流、回归模板生成、FastAPI 薄层、`make demo` |
| 2 | DoIP、SOME/IP |

详见 [需求文档](docs/project-management/requirements.md)、[架构](docs/architecture/architecture.md)、[实施计划](docs/project-management/implementation-plan.md)、[测试计划](docs/qa/test-plan.md)、[风险清单](docs/project-management/risks.md)。

## 快速开始

```bash
python3.13 -m venv venv && source venv/bin/activate && make install
make demo    # 生成 seed 42 数据 → 分流 → 报告 out/report.md → 运行回归模板
```

## 规则 / 模型边界

| 环节 | 实现 | 是否参与指标 |
|------|------|-------------|
| 异常识别、聚类、P1/P2 分流 | 确定性：规则 + Drain 模板挖掘 + TF-IDF | ✅ |
| 摘要、根因假设 | 可选 Claude 后端（需 `ANTHROPIC_API_KEY`） | ❌ |

## 已知局限

手写对抗样本（`tests/fixtures/adversarial/`）独立于规则编写，暴露 3 个缺口；为保持其评估独立性未调规则，由 TC-INT-04 精确锁定（召回 91.7%、分流准确率 81.8%、误报 0）。

| ID | 场景 | 当前行为 | 期望 |
|----|------|---------|------|
| A02 | 安全报文 0x100 车速单次越界 | P2（升级需 1 s 内 3 次） | P1 |
| A07 | 1 s 内 2 次 bus-off 错误帧 | P2（burst 需 3 次） | P1 |
| A12 | tester 侧多帧请求 CF 序号跳变 | 未检出（仅检查 ECU 响应方向） | `ISOTP_SEQUENCE_ERROR` / P2 |

另：生成数据上指标为 100%，因场景与规则出自同一理解，不代表泛化能力；以对抗样本结果为准。详见 [测试计划](docs/qa/test-plan.md#对抗样本已知缺口tc-int-04-锁定)。

## 能力映射（汽车集成与验证）

> Stage 5 补充证据链接。

| 能力 | 本项目证据 |
|------|-----------|
| 诊断协议（CAN/CAN FD、UDS） | _待补_ |
| 日志分析与失败聚类 | _待补_ |
| 缺陷分流与根因分析 | _待补_ |
| 缺陷 → 永久回归检查 | _待补_ |
| CI / 自动化 / API | _待补_ |
