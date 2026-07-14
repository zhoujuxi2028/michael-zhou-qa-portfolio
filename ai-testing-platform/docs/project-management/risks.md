# AI Testing Platform — 风险登记册

## 风险等级

| 等级 | 含义 | 响应策略 |
|------|------|---------|
| 🔴 HIGH | 可能阻断阶段推进 | 立即缓解 / PoC 验证 |
| 🟡 MEDIUM | 导致额外工作范围 | 规划缓解方案 |
| 🟢 LOW | 可接受 | 监控即可 |

---

## 活跃风险

| ID | 风险描述 | 等级 | 类别 | 可能性 | 影响 | 缓解措施 | 状态 |
|----|---------|------|------|--------|------|---------|------|
| RSK-LLM-001 | **API Key 在 CI 不可用**: 24 个 LLM 集成测试需要 `OPENAI_API_KEY`，CI 环境无密钥 | 🟡 MEDIUM | 环境 | 高 | 中 | 双模式：`-m "not llm"` 跳过；CI 仅运行 16 个单元测试 | ✅ 已处理 |
| RSK-LLM-002 | **LLM 输出非确定性**: DeepEval 依赖 GPT 评分，同一输入可能产生波动分 | 🟡 MEDIUM | 技术 | 中 | 中 | 阈值断言（≥ 0.5）而非精确匹配；记录 LLM reason 供审计 | ✅ 已处理 |
| RSK-LLM-003 | **DeepEval API 变更**: 4.x 版本仍在演进中，5.x 可能 break | 🟡 MEDIUM | 依赖 | 低 | 高 | `requirements.txt` 锁定版本；PoC 已验证 4.1.0 兼容 | ✅ 已处理 |
| RSK-LLM-004 | **OpenAI 速率限制**: gpt-4o-mini 免费层有 RPM/TPM 限制 | 🟢 LOW | 环境 | 低 | 低 | 每次运行 ≤ 40 个 LLM 调用，分布式测试间隔 | 监控 |
| RSK-LLM-005 | **gpt-4o-mini 评测质量不稳定**: 小模型可能对复杂评测（bias/toxicity）结果不准确 | 🟢 LOW | 技术 | 低 | 中 | 可配置 `model` 参数切换 gpt-4o；FR-LLM 阈值按指标独立设置 | 监控 |
| RSK-LLM-006 | **prompt injection 指标缺失**: DeepEval 无内置 injection 指标，需通过 GEval + 正则 fallback | 🟡 MEDIUM | 技术 | 中 | 中 | GEval 自定义 criteria + 正则注入模式表双重检测 | ✅ 已处理 |
| RSK-LLM-007 | **DeepSeek 兼容性**: 非 OpenAI 模型在某些 DeepEval 指标可能行为不同 | 🟢 LOW | 技术 | 低 | 中 | PoC 已验证 GPTModel 构造 + 指标配置均正常；如遇兼容问题可切换 gpt-4o-mini | 监控 |

---

## 已关闭风险历史

| ID | 风险描述 | 等级 | 关闭日期 | 关闭原因 |
|----|---------|------|----------|---------|
| RSK-LLM-007 | **Python 3.14 兼容性**: DeepEval 可能不支持 Python 3.14 | 🔴 HIGH | 2026-07-13 | PoC 验证通过：`pip install deepeval` + 核心 imports 在 3.14 正常 |