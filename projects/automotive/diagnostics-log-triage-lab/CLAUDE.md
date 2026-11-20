# diagnostics-log-triage-lab — CLAUDE.md

## 项目概述

汽车诊断协议与日志分析 simulation lab（合成数据）。CAN/CAN FD + UDS → 异常识别 → 聚类 → P1/P2 分流 → pytest 回归模板。

## 需求 ID

- Portfolio: PREQ-021 / Issue #838
- 项目: DLT-01 ~ DLT-15（Phase 1），DLT-20 ~ DLT-22（Phase 2），见 `docs/project-management/requirements.md`

## 当前阶段

Stage 5 — Closing。已知局限 A02/A07/A12 见 README，遗留风险转 [#891](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/891)。设计见 `docs/architecture/architecture.md`，偏差见其 §11。

## 命令

```bash
python3.13 -m venv venv && source venv/bin/activate && make install
make lint          # black / isort / flake8 / ruff
make test          # 单元测试 + 覆盖率门禁 85%
make integration   # eval 阈值 + 对抗样本 + demo 端到端
make demo          # generate → triage → 运行回归模板，产物在 out/
make serve         # FastAPI，端口 3030
```

## 模块

| 模块 | 需求 | 职责 |
|------|------|------|
| `generator.py` + `data/scenarios/` | DLT-01 | 手写场景驱动的合成 trace + labels |
| `can_parser.py` / `can_rules.py` | DLT-02/03 | candump 解析、CAN 规则 |
| `isotp.py` / `uds.py` / `uds_rules.py` | DLT-04/05 | ISO-TP、模拟 ECU、请求配对、UDS 规则 |
| `events.py` / `normalize.py` | DLT-06 | 统一事件 schema |
| `templates.py` / `clustering.py` | DLT-07/08 | Drain + 身份约束 TF-IDF 聚类 |
| `triage.py` + `data/triage_rules.json` | DLT-09 | P1/P2 与回归候选 |
| `llm.py` | DLT-10 | 可选 Claude 摘要（默认关闭） |
| `regression.py` / `metrics.py` / `report.py` | DLT-11/12 | 回归模板、指标、报告 |
| `pipeline.py` / `api.py` / `cli.py` | DLT-13/14 | 编排、API、CLI |

## 约定

- 本地 venv 用 Python 3.13（`python3.13 -m venv venv`）；CI 以 3.11/3.12 为准
- 数据只用合成 / 脱敏样例，不入库任何真实日志
- 默认分流路径必须确定性可复现；Claude 后端可选，测试中一律 mock
- 文档不写公司名 / 岗位 JD
- candump 解析、Drain、ISO-TP 均自写（PoC 结论见 architecture §7/§8），不引入 `python-can` / `drain3` / `can-isotp`
- 只锁直接依赖，不锁 numpy / scipy（RISK-09）
- 本地 API 端口 3030
