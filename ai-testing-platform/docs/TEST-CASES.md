# AI Testing Platform — Test Cases

## 汇总

| 模块 | 测试类 | 用例数 | P0 | P1 | P2 |
|------|--------|--------|----|----|-----|
| TestCaseGenerator | TestCaseGeneratorFromRequirement | 9 | 3 | 4 | 2 |
| TestCaseGenerator | TestCaseGeneratorFromDiff | 3 | 2 | 1 | 0 |
| TestCaseGenerator | TestCoverageAnalysis | 2 | 0 | 1 | 1 |
| DefectPredictor | TestModuleRiskAnalysis | 7 | 4 | 3 | 0 |
| DefectPredictor | TestPortfolioAnalysis | 6 | 2 | 3 | 1 |
| ScriptGenerator | TestScriptGeneration | 10 | 4 | 4 | 2 |
| ScriptGenerator | TestScriptValidation | 4 | 0 | 2 | 2 |
| ScriptGenerator | TestFixtureSuggestions | 2 | 0 | 0 | 2 |
| **合计** | | **43** | **15** | **18** | **10** |

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
