# diagnostics-log-triage-lab — CLAUDE.md

## 项目概述

汽车诊断协议与日志分析 simulation lab（合成数据）。CAN/CAN FD + UDS → 异常识别 → 聚类 → P1/P2 分流 → pytest 回归模板。

## 需求 ID

- Portfolio: PREQ-021 / Issue #838
- 项目: DLT-01 ~ DLT-15（Phase 1），DLT-20 ~ DLT-22（Phase 2），见 `docs/project-management/requirements.md`

## 当前阶段

Stage 1 — Requirements。代码、命令、模块表在 Stage 2 设计后补充。

## 约定

- 本地 venv 用 Python 3.13（`python3.13 -m venv venv`）；CI 以 3.11/3.12 为准
- 数据只用合成 / 脱敏样例，不入库任何真实日志
- 默认分流路径必须确定性可复现；Claude 后端可选，测试中一律 mock
- 文档不写公司名 / 岗位 JD
