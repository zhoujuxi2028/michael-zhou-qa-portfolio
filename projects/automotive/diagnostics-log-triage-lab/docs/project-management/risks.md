# diagnostics-log-triage-lab 风险清单

**更新于**: Stage 1 — Requirements
**Issue**: #838

---

## 活跃风险

| ID | 风险描述 | 类型 | 概率 | 影响 | 缓解措施 | 状态 |
|----|---------|------|------|------|---------|------|
| RISK-01 | 自证循环：生成器与规则出自同一人，准确率虚高 | 方法 | 高 | 高 | 评估集用独立 seed + 扰动/噪声；报告标注「合成数据」；规则开发集与评估集分离 | Open |
| RISK-02 | 本机 Python 3.15 与 CI 3.11/3.12 行为差异 | 环境 | 中 | 中 | 本地 venv 用 3.13；CI matrix 3.11/3.12 为准 | Open |
| RISK-03 | LLM 输出不确定、有费用、需 key | 技术 | 中 | 低 | 后端可选；CI/单测 mock；不参与指标 | Open |
| RISK-04 | 协议深度失控（ISO-TP 时序、NRC 全集、DoIP/SOME/IP 细节） | 范围 | 中 | 中 | 仅实现需求表所列服务；README 写明简化点；DoIP/SOME/IP 归 Phase 2 | Open |
| RISK-05 | 「AI」宣称过度 | 声誉 | 中 | 高 | README 设「规则 / 模型边界」章节；默认路径称 statistical triage | Open |
| RISK-06 | 无真实车辆数据，结论外推性有限 | 数据 | 高 | 中 | 定位 simulation lab；指标仅对合成数据成立 | Open |
| RISK-07 | scikit-learn 等 native wheel 在新 Python 版本缺失 | 依赖 | 低 | 中 | 已 dry-run 验证 3.13/3.15；版本精确锁定 | Open |

---

## 已解决风险

_（Stage 1 暂无）_
