# AI Testing Platform (智能测试平台)

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Pytest](https://img.shields.io/badge/Pytest-7.4+-green.svg)](https://pytest.org/)
[![Coverage](https://img.shields.io/badge/Coverage-91%25-brightgreen.svg)]()

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [文档](#文档)

---

## 项目简介

**AI-Powered Testing Platform** 探索 AI 技术在自动化测试三个核心环节的应用，无需外部 AI API 即可完整运行。

| 指标 | 数值 |
|------|------|
| 测试用例 | 43 |
| 核心引擎 | 3（TestCaseGenerator / DefectPredictor / ScriptGenerator）|
| 测试覆盖率 | 91.47% |
| 外部依赖 | 零（纯 Python 标准库）|
| 全部通过 | 43/43 PASSED |

---

## 核心功能

### 1. 智能测试用例生成 (TestCaseGenerator)

从**需求文本**或 **git diff** 自动生成结构化测试用例。

```python
from src.case_generator import TestCaseGenerator

gen = TestCaseGenerator()

# 从需求文本生成
cases = gen.generate_from_requirement(
    "Users must login with valid credentials. Invalid credentials must be rejected. "
    "API input validation required to prevent injection.",
    module="auth"
)
# → 生成登录、安全测试用例，安全类自动设为 P0

# 从代码变更生成
diff = "+    def validate_email(self, email):\n+        return '@' in email"
cases = gen.generate_from_diff(diff, module="user")
# → 生成 validate_email 正向 + 负向回归测试用例

# 分析覆盖率
coverage = gen.analyze_coverage(cases)
# → {"total": 8, "by_type": {...}, "coverage_score": 62.5}
```

### 2. 缺陷风险预测 (DefectPredictor)

基于**代码度量指标**预测高风险模块，生成测试优先级建议。

```python
from src.defect_predictor import DefectPredictor, ModuleMetrics

predictor = DefectPredictor()

metrics = ModuleMetrics(
    name="payment_service",
    cyclomatic_complexity=25,
    lines_of_code=800,
    code_churn=28,
    test_coverage=35.0,
    bug_history=7,
)

report = predictor.analyze_module(metrics)
# → risk_level=HIGH, risk_score=75.2
# → recommendations=["Refactor: CC 25 exceeds 10...", "Increase Coverage: 35% → 80%..."]

# 项目组合分析
result = predictor.analyze_portfolio([metrics, ...])
# → {"high_risk_modules": ["payment_service"], "total_predicted_defects": 9}
```

### 3. 自动化脚本生成 (ScriptGenerator)

从**测试规范**自动生成符合 AAA 模式的 Pytest 测试脚本。

```python
from src.script_generator import ScriptGenerator, TestSpec

gen = ScriptGenerator()

spec = TestSpec(
    tc_id="TC-AUTH-001",
    title="Valid login returns token",
    module="auth_service",
    test_type="positive",
    inputs={"username": "alice", "password": "secret"},
    expected_output={"success": True, "token": "jwt_token"},
    priority="P0",
)

script = gen.generate_script(spec)
# → 生成完整 Pytest 测试类，包含 AAA 注释、pytest.mark 标记、docstring

validation = gen.validate_generated_script(script)
# → {"valid": True, "quality_score": 95, "test_count": 1}
```

---

## 快速开始

```bash
# 克隆并进入项目
cd ai-testing-platform

# 创建虚拟环境
python3 -m venv venv && source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 运行所有测试
pytest tests/ -v

# 按模块运行
pytest tests/test_case_generator/ -v    # 测试用例生成 (14)
pytest tests/test_defect_predictor/ -v  # 缺陷预测 (13)
pytest tests/test_script_generator/ -v  # 脚本生成 (16)

# 覆盖率报告
pytest tests/ --cov=src --cov-report=html
```

---

## 项目结构

```
ai-testing-platform/
├── src/
│   ├── case_generator/
│   │   └── generator.py           # TestCaseGenerator — 需求文本 → 测试用例
│   ├── defect_predictor/
│   │   └── predictor.py           # DefectPredictor — 代码度量 → 风险报告
│   └── script_generator/
│       └── generator.py           # ScriptGenerator — 测试规范 → Pytest 脚本
├── tests/
│   ├── conftest.py                 # 根级 fixtures
│   ├── test_case_generator/        # 14 个测试
│   │   └── test_case_generator.py
│   ├── test_defect_predictor/      # 13 个测试
│   │   └── test_defect_predictor.py
│   └── test_script_generator/      # 16 个测试
│       └── test_script_generator.py
├── docs/
│   ├── REQUIREMENTS.md             # 功能需求
│   ├── FEASIBILITY.md              # 可行性分析
│   ├── ARCHITECTURE.md             # 架构设计
│   └── TEST-CASES.md               # 测试用例目录
├── pytest.ini
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | Python 3.9+ |
| 测试框架 | Pytest, pytest-cov, pytest-html |
| AI 方法 | 规则引擎、关键词提取、加权评分模型 |
| 代码质量 | black, flake8, isort |
| CI/CD | GitHub Actions |

---

## 文档

- [需求文档](docs/REQUIREMENTS.md) — 功能需求与测试覆盖矩阵
- [可行性分析](docs/FEASIBILITY.md) — 技术方案对比与风险评估
- [架构设计](docs/ARCHITECTURE.md) — 引擎设计、数据模型、测试架构
- [测试用例目录](docs/TEST-CASES.md) — 43 个测试用例详细定义

---

## Author

**Michael Zhou** | [GitHub](https://github.com/zhoujuxi2028) | zhou_juxi@hotmail.com

---

*阶段: Phase 3 完成（实现+测试）| License: MIT*
