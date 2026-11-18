# diagnostics-log-triage-lab 需求文档

**Portfolio 需求 ID**: PREQ-021
**GitHub Issue**: [#838](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/838)
**状态**: Stage 1 — Requirements
**定位**: 汽车诊断协议与日志分析 simulation lab（合成数据，不代表实车/量产 ECU 经验）

---

## 业务背景

车载集成验证中，大量时间花在「从诊断日志到根因与回归资产」的人工分析上。本项目用合成 CAN/CAN FD 与 UDS 日志，演示：协议级异常识别 → 日志聚类去重 → P1/P2 分流 → 缺陷转为 pytest 回归模板 的闭环，并对每一步给出可复现指标。

---

## 用户故事 / Use Cases

| 角色 | 故事 | 验收标准 |
|------|------|---------|
| 集成验证工程师 | 拿到一份 CAN/UDS trace，需要快速知道有哪些协议级异常 | CLI 输出带协议故障标签的事件列表 |
| 缺陷分析工程师 | 大量重复报错淹没真正问题，需要聚类去重并排优先级 | 输出聚类结果 + P1/P2 分流 + 回归候选标记 |
| 测试工程师 | 已确认的缺陷要变成永久回归检查 | 一条命令生成可运行的 pytest 回归模板 |
| QA 负责人 | 需要知道分流结果可信度 | 报告给出对照 ground truth 的准确率 / 误报率 |
| 外部系统 | 通过 API 提交日志并获取分流结果 | `POST /triage` 返回结构化 JSON |

---

## 需求清单 — Phase 1（DLT-01 ~ DLT-15）

| ID | 需求描述 | 类型 | 优先级 | 验收标准 | 状态 |
|----|---------|------|--------|---------|------|
| DLT-01 | 合成数据生成器：CAN/CAN FD trace（candump 格式）+ UDS 会话，可注入故障，固定 seed，输出 ground-truth 标签 | FR | P1 | 同 seed 输出逐字节一致；每条注入故障有标签 | Proposed |
| DLT-02 | CAN/CAN FD 解析：candump 行解析 + 自制最小 DBC 解码（cantools） | FR | P1 | 合法行解析成功率可计算；非法行计数而不中断 | Proposed |
| DLT-03 | CAN 异常规则：周期丢失、DLC 不符、信号越界、error frame、计数器跳变 | FR | P1 | 每条规则正/负例单测 | Proposed |
| DLT-04 | UDS（ISO 14229）模拟：0x10/0x22/0x27/0x2E/0x19/0x3E 请求/正响应/NRC，ISO-TP 单帧与多帧 | FR | P1 | 每个服务正响应 + ≥1 个 NRC 路径有测试 | Proposed |
| DLT-05 | UDS 异常规则：NRC 分类、P2/P2* 超时、0x78 responsePending 循环、安全访问失败 | FR | P1 | 每条规则正/负例单测 | Proposed |
| DLT-06 | 日志标准化：CAN / UDS 事件映射到统一事件 schema | FR | P1 | schema 校验测试；两种来源可混合处理 | Proposed |
| DLT-07 | Drain 风格日志模板挖掘 | FR | P1 | 相同模板不同参数归为同一模板 | Proposed |
| DLT-08 | TF-IDF 相似度聚类 + 重复故障识别 | FR | P1 | 对 ground truth 输出 cluster purity | Proposed |
| DLT-09 | 规则 triage：P1/P2 分流 + 回归候选标记 | FR | P1 | 对 ground truth 输出准确率与误报率 | Proposed |
| DLT-10 | 可选 Claude 后端：triage 摘要 + 根因假设；CI/单测用 mock，设置 `ANTHROPIC_API_KEY` 才启用 | FR | P2 | 无 key 时自动降级为确定性路径；不参与指标计算 | Proposed |
| DLT-11 | 缺陷 → pytest 回归模板生成 | FR | P1 | 生成文件可被 pytest 收集并运行 | Proposed |
| DLT-12 | triage 报告（Markdown + JSON）+ 指标计算 | FR | P1 | 报告含协议故障标签、聚类、分流、指标 | Proposed |
| DLT-13 | FastAPI 薄层：`POST /triage`、`GET /clusters`、`GET /health`，与 CLI 共用核心 | FR | P2 | TestClient 覆盖每个端点（含 4xx） | Proposed |
| DLT-14 | `make demo` 一键：生成数据 → 解析 → 分流 → 报告 → 回归模板 | NFR | P1 | 干净 venv 一条命令跑通 | Proposed |
| DLT-15 | 独立 CI workflow：lint + 测试，Python 3.11/3.12 matrix | NFR | P1 | GitHub Actions 绿灯 | Proposed |

## 需求清单 — Phase 2（登记，不展开）

| ID | 需求描述 | 优先级 | 状态 |
|----|---------|--------|------|
| DLT-20 | DoIP（ISO 13400）：vehicle identification、routing activation、诊断消息流程 | P2 | Deferred → Phase 2 |
| DLT-21 | SOME/IP：服务发现（SD）、请求/响应超时、错误码规则 | P2 | Deferred → Phase 2 |
| DLT-22 | 标准化 / 聚类 / 分流 / 回归模板扩展支持 DoIP、SOME/IP | P2 | Deferred → Phase 2 |

---

## 指标（Issue「可验证指标」，阈值 Stage 2 确定）

| 指标 | 口径 | 来源 |
|------|------|------|
| 日志解析成功率 | 成功解析行 / 合法行 | DLT-02 |
| 重复故障识别率 | cluster purity（对 ground truth） | DLT-08 |
| triage 准确率 / 误报率 | P1/P2 对 ground truth 混淆矩阵 | DLT-09 |
| 人工 vs 自动耗时 | 自动为实测；人工为**估算并注明假设** | DLT-12 |
| 缺陷→回归资产覆盖率 | 已生成可运行模板的缺陷 / 已确认缺陷 | DLT-11 |

---

## Scope 边界

| In scope | Out of scope |
|----------|-------------|
| 合成 / 脱敏数据 | 真实车辆、台架、公司日志 |
| CAN/CAN FD 帧级（candump） | 物理层（仲裁、位时序、CRC 错误检测） |
| UDS 所列 6 个服务 + ISO-TP | 完整 ISO 14229 服务集、刷写流程 |
| 确定性 triage + 可选 LLM 摘要 | LLM 作为分流主路径 |
| 通用汽车 I&V 能力映射 | 任何公司名 / 岗位 JD 映射（放私有求职仓库） |
| Phase 2：DoIP、SOME/IP | FlexRay、Android/AOSP、GB C7 / CN-eCall 法规 |

---

## 可行性评估（2026-11-17 本机实测）

| 项 | 结果 |
|----|------|
| Python | 本机 3.15.2 / 3.13.12；CI 3.11 / 3.12 |
| 依赖（wheel 安装 dry-run，3.15 与 3.13 venv） | scikit-learn、fastapi、httpx、cantools、python-can、anthropic 均可装 |
| `ANTHROPIC_API_KEY` | 未设置 → 符合「可选后端」设计，CI 不依赖 |
| 可复用参考 | `ivi-integration-lab`（cantools DBC、python-can 用法），不跨项目 import |
| 端口 | DLT-13 API 本地端口 Stage 2 分配（避开 root CLAUDE.md 已占用端口） |

---

## 依赖清单（Stage 2 锁版本）

| 依赖 | 用途 |
|------|------|
| cantools、python-can | DBC 解码、CAN 帧/candump 格式 |
| scikit-learn | TF-IDF + 聚类 |
| fastapi、httpx | API 与 TestClient |
| anthropic | 可选 LLM 后端 |
| pytest、pytest-cov、black、isort、flake8 | 测试与 lint（与 root 规范一致） |
