# AI Testing Platform — Requirements

## 1. 项目背景

**Portfolio 新项目**：填补 Michael Zhou QA Portfolio 中「AI 测试」类别空白。

**核心目标**：利用 AI/ML 技术优化测试流程，展示 AI 在自动化测试中的实际应用场景。

---

## 2. 功能需求

### 2.1 智能测试用例生成 (TestCaseGenerator)

| 需求 ID | 描述 | 优先级 |
|--------|------|--------|
| FR-GEN-001 | 从需求文本自动提取 CRUD 操作并生成对应测试场景 | P0 |
| FR-GEN-002 | 识别安全关键词（authentication、input、query 等）并生成安全测试用例 | P0 |
| FR-GEN-003 | 识别边界条件（数值限制、max/min 约束）并生成边界测试用例 | P1 |
| FR-GEN-004 | 从 git diff 自动分析新增/修改函数并生成回归测试用例 | P1 |
| FR-GEN-005 | 基于需求上下文自动分配优先级（P0/P1/P2） | P1 |
| FR-GEN-006 | 对生成的测试用例集进行覆盖率分析，输出类型和优先级分布 | P2 |
| FR-GEN-007 | 记录历史生成记录（模块、数量、时间戳） | P2 |
| FR-GEN-008 | 识别 DBCS/Unicode 关键词生成多语言边界测试用例（REQ-AI-001） | P1 |

**输入**：需求文本（自然语言）或 git diff 文本  
**输出**：`TestCase` 数据类列表（含 tc_id、title、steps、expected_result、priority、test_type）

### 2.2 缺陷预测 (DefectPredictor)

| 需求 ID | 描述 | 优先级 |
|--------|------|--------|
| FR-PRD-001 | 基于代码度量指标（圈复杂度、变更频率、覆盖率、历史缺陷）计算模块风险分 | P0 |
| FR-PRD-002 | 将风险分分类为四个等级：HIGH / MEDIUM / LOW / MINIMAL | P0 |
| FR-PRD-003 | 输出针对性改进建议（重构、增加覆盖、冻结代码等） | P0 |
| FR-PRD-004 | 支持多模块组合分析，输出整体风险分布图 | P1 |
| FR-PRD-005 | 按风险评分对模块排序，生成测试优先级建议（P0/P1/P2） | P1 |
| FR-PRD-006 | 比较模块风险趋势（当前 vs 历史快照），输出 increasing/stable/decreasing | P1 |
| FR-PRD-007 | 预测模块预期缺陷数 | P2 |
| FR-PRD-008 | 激活依赖数（dependency_count）作为风险因子（REQ-AI-002） | P1 |
| FR-PRD-009 | 激活代码陈旧度（last_modified_days）作为风险因子（REQ-AI-002） | P1 |

**输入**：`ModuleMetrics` 数据类（模块名、圈复杂度、代码行数、变更频率、覆盖率、历史缺陷数、依赖数、陈旧天数）  
**输出**：`RiskReport` 数据类（风险等级、风险分、因素分解、建议、预测缺陷数）

### 2.3 自动化脚本生成 (ScriptGenerator)

| 需求 ID | 描述 | 优先级 |
|--------|------|--------|
| FR-SCR-001 | 从 `TestSpec` 规范生成符合 AAA 模式的 Pytest 测试脚本 | P0 |
| FR-SCR-002 | 支持正向、负向、边界、安全、性能五种测试类型 | P0 |
| FR-SCR-003 | 生成包含 pytest.mark 标记和文档字符串的规范代码 | P1 |
| FR-SCR-004 | 支持 `@pytest.mark.parametrize` 参数化测试生成 | P1 |
| FR-SCR-005 | 从多个 TestSpec 生成完整测试套件文件 | P1 |
| FR-SCR-006 | 验证生成脚本的质量（AAA 完整性、断言存在、标记规范） | P1 |
| FR-SCR-007 | 根据测试规范推荐合适的 Pytest fixtures | P2 |

**输入**：`TestSpec` 数据类（tc_id、module、test_type、inputs、expected_output、setup/teardown）  
**输出**：可直接运行的 Pytest 测试脚本（字符串）

### 2.4 代码度量扫描 (CodeScanner)

| 需求 ID | 描述 | 优先级 |
|--------|------|--------|
| FR-SCN-001 | 递归扫描目录下所有 .py 文件自动采集代码度量 | P0 |
| FR-SCN-002 | 通过 AST 统计代码行数和依赖数 | P0 |
| FR-SCN-003 | 通过 radon 计算函数平均圈复杂度 | P0 |
| FR-SCN-004 | 通过 git log 采集代码陈旧度、变更频率和 bug 历史 | P0 |
| FR-SCN-005 | 非 git 仓库或 git 命令失败时优雅降级 | P1 |
| FR-SCN-006 | 排除虚拟环境/缓存目录防止指标失真 | P1 |
| FR-SCN-007 | 非 UTF-8 编码文件使用 latin-1 fallback | P1 |
| FR-SCN-008 | CLI 脚本一键扫描+预测输出风险排名（REQ-AI-003） | P0 |

**输入**：Python 项目目录路径  
**输出**：`list[ModuleMetrics]` → `DefectPredictor` → 风险排名表

---

## 3. 非功能需求

| 类别 | 要求 |
|------|------|
| 依赖 | 无外部 AI API 依赖，纯 Python 标准库实现（离线可用） |
| 可测试性 | 所有引擎均通过 Pytest 单元测试验证，覆盖率 ≥ 80% |
| 代码质量 | black 格式化、flake8 检查（max-line-length=120）、isort 排序 |
| Python 版本 | Python 3.9+ |
| CI/CD | GitHub Actions 自动化代码质量检查 + 测试执行 |

---

## 4. 约束与假设

- **无真实 LLM 调用**：本项目使用规则引擎 + 模式匹配，展示 AI 测试思路，不依赖 OpenAI/Anthropic 等外部 API（降低成本和复杂度）
- **Portfolio 定位**：重在展示 AI 驱动测试的思维模型，而非工业级产品
- **扩展路径**：引擎接口设计支持未来替换为真实 LLM 后端（通过 `.env` 配置）

---

## 5. 测试覆盖矩阵

| 模块 | 测试文件 | 测试数 | 主要场景 |
|------|---------|--------|---------|
| TestCaseGenerator | test_case_generator.py | 23 | CRUD/安全/边界生成、DBCS 多语言、diff 解析、覆盖率分析 |
| DefectPredictor | test_defect_predictor.py | 15 | 高/低风险检测、7 因子验证、组合分析、趋势对比、输入验证 |
| ScriptGenerator | test_script_generator.py | 16 | 脚本生成、AAA 验证、suite 合并、fixture 推荐 |
| CodeScanner | test_scanner.py | 18 | AST/radon/git 指标采集、编排测试、异常降级 |
| LLMEvaluator | test_*.py | 33 | 数据类、质量评测、幻觉检测、安全扫描、偏差分析 |
| **合计** | | **105** | |
