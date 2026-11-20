# diagnostics-log-triage-lab 风险清单

**更新于**: Stage 5 — Closing（2026-11-20）
**Issue**: #838

---

## 活跃风险

| ID | 风险描述 | 类型 | 概率 | 影响 | 缓解措施 | 状态 |
|----|---------|------|------|------|---------|------|
| RISK-01 | 自证循环：生成器与规则出自同一人，准确率虚高 | 方法 | 高 | 高 | 场景与 `expected_priority` 手写，不来自 `triage_rules.json`（TC-GEN-06 检查）；上下文相关升级规则；dev / eval profile 分离且 eval 加扰动；手写对抗样本（TC-INT-04）；报告标注「合成场景上的分流一致性」 | Open |
| RISK-02 | 本机 Python 3.15 与 CI 3.11/3.12 行为差异 | 环境 | 中 | 中 | 本地 venv 用 3.13；CI matrix 3.11/3.12 为准 | Open |
| RISK-03 | LLM 输出不确定、有费用、需 key | 技术 | 中 | 低 | 后端可选；CI/单测 mock；不参与指标 | Open |
| RISK-04 | 协议深度失控（ISO-TP 时序、NRC 全集、DoIP/SOME/IP 细节） | 范围 | 中 | 中 | 仅实现需求表所列服务；README 写明简化点；DoIP/SOME/IP 归 Phase 2 | Open |
| RISK-05 | 「AI」宣称过度 | 声誉 | 中 | 高 | README 设「规则 / 模型边界」章节；默认路径称 statistical triage | Open |
| RISK-06 | 无真实车辆数据，结论外推性有限 | 数据 | 高 | 中 | 定位 simulation lab；指标仅对合成数据成立 | Open |
| RISK-07 | scikit-learn 等 native wheel 在新 Python 版本缺失 | 依赖 | 低 | 中 | 已 dry-run 验证 3.13/3.15；版本精确锁定 | Open |
| RISK-08 | 聚类质量高度依赖 `Event.message` 设计：字段通配过度会合并不同故障，TF-IDF 阈值过大会把不同 kind 并簇 | 技术 | 中 | 高 | PoC-1/4 已复现；分类字段永不通配；AD-08 身份约束（Stage 3 实测纯 TF-IDF 会误合并不同 ID）；TC-CL-01~03 | Mitigated |
| RISK-09 | numpy 2.5 / scipy 1.18 要求 Python ≥ 3.12，精确锁定会使 CI 3.11 安装失败 | 依赖 | 高 | 中 | 只锁直接依赖，numpy/scipy 由 scikit-learn 约束解析；已 dry-run 验证 3.11（numpy 2.4.6 / scipy 1.17.1）与 3.12；Stage 3 CI 3.11 / 3.12 安装与测试通过 | Resolved |
| RISK-10 | 不同 numpy 版本下聚类浮点结果可能有微小差异 | 环境 | 低 | 低 | 同环境内断言标签一致；跨版本只断言指标阈值，不断言具体标签 | Open |
| RISK-11 | 冷启动时 scikit-learn 首次导入（编译 .pyc）超过 60 s，可能拖慢 CI 首个测试 | 环境 | 中 | 低 | PoC-4 实测；Stage 3 中首次聚类测试 33 s；TC-INT-02 先预热再计时；5 个 seed 的回归模板合并为一次子进程运行 | Open |
| RISK-12 | 对抗样本暴露 3 个规则缺口（A02 / A07 分流、A12 tester 侧 ISO-TP） | 方法 | 已发生 | 中 | TC-INT-04 精确锁定；报告与 test-plan 公开记录；Stage 5 决定暂不修补以保持评估独立性，遗留项转 [#891](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/891) | Transferred |
| RISK-13 | 仓库 pre-commit 用 ruff format，项目用 black，两者格式可能冲突 | 工具 | 中 | 低 | 两者行宽统一为 120；`make lint` 同时运行两者；Stage 3 未再出现冲突 | Mitigated |

---

## 已解决风险

| ID | 描述 | 解决方式 |
|----|------|---------|
| — | `python-can` 读取器遇非法行中断（Stage 2 PoC-3 发现） | AD-01 自写解析器，移除该依赖 |
