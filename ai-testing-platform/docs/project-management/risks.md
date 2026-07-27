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
| RSK-DBCS-001 | **需求范围蔓延**: DBCS 支持可能被要求扩展到 `DefectPredictor` / `LLMEvaluator` 等模块 | 🟡 MEDIUM | 范围 | 中 | 中 | requirements.md 明确 scope 仅限 `case_generator`；其他模块需另开 Issue | 监控 |
| RSK-DBCS-002 | **Unicode 数字误匹配**: `\d` 在某些 Unicode 字符（如阿拉伯数字 ٣）下可能误命中边界正则 | 🟢 LOW | 技术 | 低 | 低 | 使用 `re.ASCII` flag 约束数字匹配范围；测试用例覆盖非 ASCII 数字场景 | 监控 |
| RSK-LLM-001 | **API Key 在 CI 不可用**: 24 个 LLM 集成测试需要 `OPENAI_API_KEY`，CI 环境无密钥 | 🟡 MEDIUM | 环境 | 高 | 中 | 双模式：`-m "not llm"` 跳过；CI 仅运行 16 个单元测试 | ✅ 已处理 |
| RSK-LLM-002 | **LLM 输出非确定性**: DeepEval 依赖 GPT 评分，同一输入可能产生波动分 | 🟡 MEDIUM | 技术 | 中 | 中 | 阈值断言（≥ 0.5）而非精确匹配；记录 LLM reason 供审计 | ✅ 已处理 |
| RSK-LLM-003 | **DeepEval API 变更**: 4.x 版本仍在演进中，5.x 可能 break | 🟡 MEDIUM | 依赖 | 低 | 高 | `requirements.txt` 锁定版本；PoC 已验证 4.1.0 兼容 | ✅ 已处理 |
| RSK-LLM-004 | **OpenAI 速率限制**: gpt-4o-mini 免费层有 RPM/TPM 限制 | 🟢 LOW | 环境 | 低 | 低 | 每次运行 ≤ 40 个 LLM 调用，分布式测试间隔 | 监控 |
| RSK-LLM-005 | **gpt-4o-mini 评测质量不稳定**: 小模型可能对复杂评测（bias/toxicity）结果不准确 | 🟢 LOW | 技术 | 低 | 中 | 可配置 `model` 参数切换 gpt-4o；FR-LLM 阈值按指标独立设置 | 监控 |
| RSK-LLM-006 | **prompt injection 指标缺失**: DeepEval 无内置 injection 指标，需通过 GEval + 正则 fallback | 🟡 MEDIUM | 技术 | 中 | 中 | GEval 自定义 criteria + 正则注入模式表双重检测 | ✅ 已处理 |
| RSK-LLM-007 | **DeepSeek 兼容性**: 非 OpenAI 模型在某些 DeepEval 指标可能行为不同 | 🟢 LOW | 技术 | 低 | 中 | PoC 已验证 GPTModel 构造 + 指标配置均正常；如遇兼容问题可切换 gpt-4o-mini | 监控 |
| RSK-LLM-008 | **ruff vs black 格式不一致**: pre-commit hook 用 ruff 但文档指定 black，导致多次提交失败 | 🟢 LOW | 工具 | 低 | 低 | 统一使用 ruff：`python3 -m ruff format`；`black --check` 已在 CI 通过 | ✅ 已处理 |
| RSK-LLM-009 | **设计文档被覆盖**: 多次分支切换导致 design doc（risks.md, test-plan.md）丢失，需从 commit 历史恢复 | 🟡 MEDIUM | 流程 | 中 | 中 | 始终在 feature 分支工作；commit 后立即 push；使用 git stash 管理跨分支变更 | ✅ 已处理 |

---

## 已关闭风险历史

| ID | 风险描述 | 等级 | 关闭日期 | 关闭原因 |
|----|---------|------|----------|---------|
| RSK-LLM-010 | **Python 3.14 兼容性**: DeepEval 可能不支持 Python 3.14 | 🔴 HIGH | 2026-07-13 | PoC 验证通过：`pip install deepeval` + 核心 imports 在 3.14 正常 |
| RSK-PRD-001 | **权重校准不足**: dependency(7%) 和 staleness(5%) 权重基于经验估计，未用真实项目数据校验 | 🟡 MEDIUM | 2026-07-22 | 权重可配置化；V2.1 计划基于真实项目数据校准 |
| RSK-PRD-002 | **staleness 误判风险**: 长期稳定模块可能被误判为高风险（stable code ≠ bad code） | 🟢 LOW | 2026-07-22 | staleness 权重仅 5%，影响有限；`staleness > 50` 的建议措辞为"review"而非"强制重构" |
| RSK-SCN-001 | **venv/依赖库被扫描**: `rglob("*.py")` 可能扫到 venv、\__pycache__、site-packages，导致指标失真 | 🟡 MEDIUM | 2026-07-26 | 默认排除 `venv/`、`__pycache__/`、`.git/`、`.eggs/`、`node_modules/` 目录；可通过 `exclude_dirs` 参数自定义 |
| RSK-SCN-002 | **非 UTF-8 编码异常**: `read_text(encoding="utf-8")` 在 GBK/ISO 编码文件上抛异常 | 🟢 LOW | 2026-07-26 | catch `UnicodeDecodeError` 后尝试 `encoding="latin-1"` fallback；单个文件失败不阻塞整体扫描 |
| RSK-SCN-003 | **git 未安装或非 git 仓库**: `subprocess.run` 调用 git 时抛出 `FileNotFoundError` | 🟡 MEDIUM | 2026-07-26 | 捕获 `FileNotFoundError`，git 相关指标优雅降级返回 0；非 git 仓库可运行但 git 指标全为 0 |
| RSK-SCN-004 | **大型仓库性能**: 每个文件运行 3 次 git subprocess，N 个文件共 3N 次调用，大仓库可能耗时过长 | 🟢 LOW | 2026-07-26 | 首次扫描后缓存 `ModuleMetrics`；文档建议扫描特定目录而非整个仓库 |