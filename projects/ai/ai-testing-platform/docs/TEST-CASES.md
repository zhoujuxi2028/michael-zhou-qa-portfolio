# AI Testing Platform — Test Cases

## 汇总

| 模块 | 测试类 | 用例数 | P0 | P1 | P2 |
|------|--------|--------|----|----|-----|
| TestCaseGenerator | TestCaseGeneratorFromRequirement | 9 | 3 | 4 | 2 |
| TestCaseGenerator | TestCaseGeneratorFromDiff | 3 | 2 | 1 | 0 |
| TestCaseGenerator | TestBoundaryFromMarkdownTable | 2 | 0 | 2 | 0 |
| TestCaseGenerator | TestDBCSKeywordGeneration | 6 | 0 | 6 | 0 |
| TestCaseGenerator | TestDBCSBoundaryExtraction | 1 | 0 | 1 | 0 |
| TestCaseGenerator | TestCoverageAnalysis | 2 | 0 | 1 | 1 |
| DefectPredictor | TestModuleRiskAnalysis | 7 | 4 | 3 | 0 |
| DefectPredictor | TestPortfolioAnalysis | 8 | 2 | 5 | 1 |
| ScriptGenerator | TestScriptGeneration | 10 | 4 | 4 | 2 |
| ScriptGenerator | TestScriptValidation | 4 | 0 | 2 | 2 |
| ScriptGenerator | TestFixtureSuggestions | 2 | 0 | 0 | 2 |
| LLMEvaluator | TestQuality | 10 | 3 | 4 | 3 |
| LLMEvaluator | TestHallucination | 8 | 2 | 4 | 2 |
| LLMEvaluator | TestSecurity | 8 | 3 | 3 | 2 |
| LLMEvaluator | TestBias | 6 | 2 | 2 | 2 |
| LLMEvaluator | TestUnitLogic | 8 | 2 | 3 | 3 |
| **合计** | | **~94** | **~27** | **~45** | **~22** |

---

## TestCaseGenerator 测试用例

### TestCaseGeneratorFromRequirement

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-GEN-001 | 从登录需求文本生成测试用例 | P0 | 功能 |
| TC-GEN-002 | 从 CRUD 需求生成正向和负向测试用例 | P0 | 功能 |
| TC-GEN-003 | 安全关键词触发安全测试用例生成 | P0 | 安全 |
| TC-GEN-004 | 数值限制触发边界测试用例生成 | P1 | 边界 |
| TC-GEN-005 | 空需求文本抛出 GeneratorError | P0 | 负向 |
| TC-GEN-006 | 纯空白需求文本抛出 GeneratorError | P0 | 负向 |
| TC-GEN-007 | 生成的测试用例包含所有必要字段 | P1 | 结构验证 |
| TC-GEN-008 | 登录需求分配 P0 优先级 | P1 | 优先级规则 |
| TC-GEN-009 | 生成历史被记录 | P1 | 记录 |

### TestCaseGeneratorFromDiff

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-GEN-010 | 从含新函数的 diff 生成回归测试（正向+负向） | P0 | 功能 |
| TC-GEN-011 | 无新增函数的 diff 生成通用回归用例 | P1 | 功能 |
| TC-GEN-012 | 空 diff 文本抛出 GeneratorError | P0 | 负向 |

### TestBoundaryFromMarkdownTable

> 对应缺陷：DEF-AI-001

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-GEN-015 | Markdown 表格格式边界条件应被正确提取 | P1 | 边界 |
| TC-GEN-016 | 混合格式（纯文本+表格）均能提取边界条件 | P1 | 边界 |

### TestDBCSKeywordGeneration

> 对应需求：REQ-AI-001 DBCS-01 / DBCS-03 / DBCS-04

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-DBCS-001 | unicode 关键词生成 unicode 标签用例 | P1 | 边界 |
| TC-DBCS-002 | 中文关键词生成 dbcs 标签用例 | P1 | 边界 |
| TC-DBCS-003 | emoji 关键词生成 unicode 标签用例 | P1 | 边界 |
| TC-DBCS-005 | 无 DBCS 关键词时不生成 DBCS 用例 | P1 | 负向 |
| TC-DBCS-006 | 混合关键词各自生成对应标签 | P1 | 边界 |
| TC-DBCS-007 | 全角关键词生成 unicode 标签用例 | P1 | 边界 |

### TestDBCSBoundaryExtraction

> 对应需求：REQ-AI-001 DBCS-02

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-DBCS-004 | 字节/字符对比描述生成 dbcs-byte-char 边界用例 | P1 | 边界 |

### TestCoverageAnalysis

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-GEN-013 | 覆盖率分析返回类型和优先级统计 | P1 | 功能 |
| TC-GEN-014 | 空测试用例集覆盖率分析 | P2 | 边界 |

---

## DefectPredictor 测试用例

### TestModuleRiskAnalysis

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-PRD-001 | 高复杂度+低覆盖率模块标记为 HIGH | P0 | 功能 |
| TC-PRD-002 | 低复杂度+高覆盖率模块标记为低风险 | P0 | 功能 |
| TC-PRD-003 | 风险报告包含所有必要字段 | P0 | 结构验证 |
| TC-PRD-004 | 高风险模块生成具体改进建议 | P1 | 功能 |
| TC-PRD-005 | 低风险模块建议显示无关键问题 | P1 | 功能 |
| TC-PRD-006 | 非法覆盖率值抛出 PredictorError | P0 | 负向 |
| TC-PRD-007 | 圈复杂度 < 1 抛出 PredictorError | P0 | 负向 |

### TestPortfolioAnalysis

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-PRD-008 | 项目组合分析返回正确风险分布 | P0 | 功能 |
| TC-PRD-009 | 模块按风险评分降序排列 | P0 | 功能 |
| TC-PRD-010 | 高风险模块映射为 P0 测试优先级 | P1 | 优先级映射 |
| TC-PRD-011 | 空模块列表抛出 PredictorError | P1 | 负向 |
| TC-PRD-012 | 风险增加趋势正确检测 | P1 | 趋势分析 |
| TC-PRD-013 | 模型版本信息可访问 | P2 | 元数据 |
| TC-PRD-014 | 高依赖数应提升风险评分 | P1 | 功能 |
| TC-PRD-015 | 长期未修改模块应提升风险评分 | P1 | 功能 |

---

## ScriptGenerator 测试用例

### TestScriptGeneration

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-SCR-001 | 正向测试规范生成包含断言的 Pytest 脚本 | P0 | 功能 |
| TC-SCR-002 | 负向测试规范生成包含 pytest.raises 的脚本 | P0 | 功能 |
| TC-SCR-003 | 生成脚本遵循 AAA 模式（顺序验证） | P0 | 模式验证 |
| TC-SCR-004 | 生成类名为 PascalCase | P0 | 命名规范 |
| TC-SCR-005 | 生成脚本包含 pytest 标记 | P1 | 规范性 |
| TC-SCR-006 | 生成脚本包含文档字符串 | P1 | 规范性 |
| TC-SCR-007 | 多规范合并为完整测试套件文件 | P1 | 功能 |
| TC-SCR-008 | 空规范列表抛出 ScriptGeneratorError | P0 | 负向 |
| TC-SCR-009 | 非法 test_type 抛出 ScriptGeneratorError | P0 | 负向 |
| TC-SCR-010 | 非法 priority 抛出 ScriptGeneratorError | P0 | 负向 |

### TestScriptValidation

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-SCR-011 | 符合规范的脚本通过验证 | P1 | 验证 |
| TC-SCR-012 | 缺少 AAA 注释的脚本报告 issues | P1 | 验证 |
| TC-SCR-013 | 每次生成计数器递增 | P2 | 统计 |
| TC-SCR-014 | 生成日志记录 tc_id、module、test_type | P2 | 审计 |

### TestFixtureSuggestions

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-SCR-015 | token 输入规范推荐 auth_token fixture | P2 | 推荐 |
| TC-SCR-016 | security 类型测试推荐 injection_payloads fixture | P2 | 推荐 |

---

## LLMEvaluator 测试用例

### TestUnitLogic（无 LLM 依赖，CI 可运行）

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-LLM-001 | LLMIO 数据类正确初始化 | P0 | 单元 |
| TC-LLM-002 | LLMIO 缺少 context 时默认 None | P1 | 单元 |
| TC-LLM-003 | MetricResult 阈值判定逻辑正确 | P0 | 单元 |
| TC-LLM-004 | EvaluationReport 聚合所有子结果 | P1 | 单元 |
| TC-LLM-005 | 空 results 列表抛出异常 | P1 | 负向 |
| TC-LLM-006 | 无效模型名抛出 ValueError | P1 | 负向 |
| TC-LLM-007 | 同名 metrics 去重 | P2 | 单元 |
| TC-LLM-008 | SecurityEvaluator 正则 injection 扫描工作 | P2 | 单元 |

### TestQuality（LLM 依赖，标记 `@pytest.mark.llm`）

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-LLM-009 | GEval correctness 正确输出评分 ≥ 0.5 | P0 | LLM |
| TC-LLM-010 | GEval 错误输出评分 < 0.5 | P0 | LLM |
| TC-LLM-011 | AnswerRelevancy 相关输出评分 ≥ 0.7 | P0 | LLM |
| TC-LLM-012 | AnswerRelevancy 不相关输出评分 < 0.7 | P0 | LLM |
| TC-LLM-013 | ContextualPrecision 上下文精确性评分 | P1 | LLM |
| TC-LLM-014 | 各指标返回完整 MetricResult（含 reason） | P1 | LLM |
| TC-LLM-015 | 多指标聚合生成 EvaluationReport | P1 | LLM |
| TC-LLM-016 | QualityEvaluator 配置阈值可调 | P2 | LLM |
| TC-LLM-017 | 混合输入（中英文）处理正常 | P2 | LLM |
| TC-LLM-018 | 空输入返回 FAIL（score=0） | P2 | 负向 |

### TestHallucination（LLM 依赖，标记 `@pytest.mark.llm`）

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-LLM-019 | Faithfulness 忠实输出评分 ≥ 0.7 | P0 | LLM |
| TC-LLM-020 | Faithfulness 矛盾输出评分 < 0.7 | P0 | LLM |
| TC-LLM-021 | Hallucination 指标阈值判定（≤ 0.3） | P1 | LLM |
| TC-LLM-022 | 无 context 时 Faithfulness 默认低分 | P1 | LLM |
| TC-LLM-023 | 部分正确输出的 Faithfulness 评分在 0.3-0.7 之间 | P1 | LLM |
| TC-LLM-024 | HallucinationEvaluator 报告包含原因分析 | P1 | LLM |
| TC-LLM-025 | 多轮对话幻觉检测（每个 turn 独立评分） | P2 | LLM |
| TC-LLM-026 | 长文本（>2000 token）幻觉检测不超时 | P2 | LLM |

### TestSecurity（LLM 依赖 + 单元混合）

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-LLM-027 | GEval 检测直接 prompt injection | P0 | LLM |
| TC-LLM-028 | GEval 检测间接 prompt injection（上下文注入） | P0 | LLM |
| TC-LLM-029 | 正则模式扫描捕获已知 injection 模式 | P0 | 单元 |
| TC-LLM-030 | 正则模式正常输入零误报 | P0 | 单元 |
| TC-LLM-031 | GEval 与正则双重验证结果一致 | P1 | LLM |
| TC-LLM-032 | 对抗性测试输入生成有效 | P1 | LLM |
| TC-LLM-033 | jailbreak 尝试（角色扮演）被检测 | P1 | LLM |
| TC-LLM-034 | 速率限制防护检测 | P2 | LLM |

### TestBias（LLM 依赖）

| TC ID | 标题 | 优先级 | 类型 |
|-------|------|--------|------|
| TC-LLM-035 | BiasMetric 检测性别偏差输出（score ≤ 0.3） | P0 | LLM |
| TC-LLM-036 | BiasMetric 中性输出正常（score > 0.3） | P0 | LLM |
| TC-LLM-037 | ToxicityMetric 检测有害输出（score ≤ 0.3） | P1 | LLM |
| TC-LLM-038 | ToxicityMetric 正常输出通过 | P1 | LLM |
| TC-LLM-039 | BiasEvaluator 报告包含偏差类型分类 | P1 | LLM |
| TC-LLM-040 | 无偏输出不产生误报（≥ 0.7 pass） | P2 | LLM |
