# Diagnostics & Log Triage Lab

汽车诊断协议与日志分析实验室：合成 CAN/CAN FD + UDS 日志 → 协议级异常识别 → 聚类去重 → P1/P2 分流 → 缺陷转 pytest 回归模板。

> **状态**：Stage 1 — Requirements（[#838](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/838)）
> **声明**：simulation lab，全部使用合成数据，不代表实车、台架或量产 ECU 经验。

## 范围

| Phase | 内容 |
|-------|------|
| 1 | CAN/CAN FD 解析与异常规则、UDS 诊断模拟、日志聚类与分流、回归模板生成、FastAPI 薄层、`make demo` |
| 2 | DoIP、SOME/IP |

详见 [需求文档](docs/project-management/requirements.md)、[风险清单](docs/project-management/risks.md)。

## 规则 / 模型边界

| 环节 | 实现 | 是否参与指标 |
|------|------|-------------|
| 异常识别、聚类、P1/P2 分流 | 确定性：规则 + Drain 模板挖掘 + TF-IDF | ✅ |
| 摘要、根因假设 | 可选 Claude 后端（需 `ANTHROPIC_API_KEY`） | ❌ |

## 能力映射（汽车集成与验证）

> Stage 5 补充证据链接。

| 能力 | 本项目证据 |
|------|-----------|
| 诊断协议（CAN/CAN FD、UDS） | _待补_ |
| 日志分析与失败聚类 | _待补_ |
| 缺陷分流与根因分析 | _待补_ |
| 缺陷 → 永久回归检查 | _待补_ |
| CI / 自动化 / API | _待补_ |
