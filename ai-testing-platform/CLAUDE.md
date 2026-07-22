# AI Testing Platform — CLAUDE.md

AI-Powered Testing Platform：规则引擎驱动的智能测试用例生成 + 缺陷预测 + 脚本生成。

## Quick Commands

```bash
# 环境
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 单元测试（排除需要 API Key 的 LLM 集成测试）
pytest tests/ -v -m "not llm and not integration"

# 完整测试（含 LLM 集成，需要 OPENAI_API_KEY）
pytest tests/ -v

# 覆盖率
pytest tests/ -m "not llm and not integration" --cov=src --cov-report=html

# Lint / Format
ruff check src/ tests/
ruff format src/ tests/
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203

# 从需求文档生成测试用例（示例）
python scripts/generate_test_cases.py
```

## 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| TestCaseGenerator | `src/case_generator/generator.py` | 从需求文本/git diff 生成测试用例，支持 CRUD、安全、边界、DBCS |
| DefectPredictor | `src/defect_predictor/predictor.py` | 基于代码度量预测高风险模块 |
| ScriptGenerator | `src/script_generator/generator.py` | 从测试规范生成 pytest 脚本 |
| LLMEvaluator | `src/llm_evaluator/` | LLM 输出质量评测（需 API Key） |

## 测试说明

| Marker | 含义 |
|--------|------|
| `generation` | TestCaseGenerator 单元测试 |
| `prediction` | DefectPredictor 单元测试 |
| `llm` | LLM 集成测试（需 OPENAI_API_KEY） |
| `integration` | 端到端集成测试 |
| `P0/P1/P2` | 测试优先级 |

## CI

Workflow: `.github/workflows/ai-testing-ci.yml`
- code-quality（black/isort/flake8/ruff）
- unit-tests（72 tests，排除 llm + integration）
- verify-by-module（按模块分组验证）
