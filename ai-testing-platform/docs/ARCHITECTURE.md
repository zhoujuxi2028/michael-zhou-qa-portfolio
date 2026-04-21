# AI Testing Platform — 架构设计

## 1. 整体架构

```
ai-testing-platform/
├── src/
│   ├── case_generator/         # 智能测试用例生成引擎
│   │   └── generator.py        # TestCaseGenerator
│   ├── defect_predictor/       # 缺陷风险预测引擎
│   │   └── predictor.py        # DefectPredictor
│   └── script_generator/       # 自动化脚本生成引擎
│       └── generator.py        # ScriptGenerator
├── tests/
│   ├── conftest.py             # 根级 fixtures
│   ├── test_case_generator/    # TestCaseGenerator 测试 (14)
│   ├── test_defect_predictor/  # DefectPredictor 测试 (13)
│   └── test_script_generator/  # ScriptGenerator 测试 (16)
└── docs/
    ├── REQUIREMENTS.md
    ├── FEASIBILITY.md
    ├── ARCHITECTURE.md
    └── TEST-CASES.md
```

---

## 2. 核心模块设计

### 2.1 TestCaseGenerator

**职责**：将非结构化需求文本 / git diff 转换为结构化测试用例

**数据流**：
```
需求文本
   ↓ _extract_features()
   ├─ CRUD 关键词 → 功能测试用例 (positive/negative)
   ├─ 安全关键词 → 安全测试用例 (security, P0)
   └─ 边界条件   → 边界测试用例 (boundary, P1)
   ↓ _determine_priority()
   └─ list[TestCase]
```

**关键数据类**：
```python
@dataclass
class TestCase:
    tc_id: str               # e.g. TC-AUTH-LOGIN-001
    title: str               # 测试用例标题
    description: str         # 详细描述
    preconditions: list      # 前置条件
    steps: list              # 测试步骤
    expected_result: str     # 预期结果
    priority: Priority       # P0 / P1 / P2
    test_type: TestType      # positive/negative/boundary/security/performance
    tags: list               # 标签
```

**优先级规则**：
| 条件 | 优先级 |
|------|--------|
| 含 login/authentication/payment/security 关键词 | P0 |
| create/update/delete/upload 操作 | P1 |
| 其余 (display/ui/sort/filter) | P2 |

---

### 2.2 DefectPredictor

**职责**：基于代码度量指标量化模块缺陷风险

**算法**：加权线性风险模型
```
risk_score = Σ(factor_score × weight)

因素评分（均归一化至 0-100）：
- complexity_score = (CC - 1) / 29 × 100
- churn_score      = churn × 3     (上限 100)
- coverage_gap     = 100 - coverage
- bug_score        = bug_history × 10 (上限 100)
- size_score       = (LOC - 100) / 900 × 100

权重：complexity=25%, churn=25%, coverage_gap=20%, bug_history=20%, size=10%
```

**风险等级阈值**：
| 分数 | 等级 |
|------|------|
| ≥ 70 | HIGH |
| ≥ 45 | MEDIUM |
| ≥ 20 | LOW |
| < 20 | MINIMAL |

**关键数据类**：
```python
@dataclass
class ModuleMetrics:
    name: str
    cyclomatic_complexity: float  # 圈复杂度 ≥ 1
    lines_of_code: int            # 代码行数
    code_churn: int               # 近 30 天变更次数
    test_coverage: float          # 0-100
    bug_history: int              # 历史缺陷数

@dataclass
class RiskReport:
    module_name: str
    risk_level: RiskLevel         # HIGH/MEDIUM/LOW/MINIMAL
    risk_score: float             # 0-100
    factors: dict                 # 各因素得分明细
    recommendations: list         # 改进建议列表
    predicted_defects: int        # 预测缺陷数
```

---

### 2.3 ScriptGenerator

**职责**：将结构化测试规范转换为可运行的 Pytest 脚本

**模板系统**：
```
TestSpec
   ↓ _to_class_name()     → PascalCase 类名
   ↓ _to_func_name()      → snake_case 方法名
   ↓ _generate_arrange()  → Arrange 代码块
   ↓ _generate_act()      → Act 代码块（negative 自动包裹 pytest.raises）
   ↓ _generate_assert()   → Assert 代码块
   ↓ _generate_parametrize() → 可选参数化装饰器
   └─ Pytest 脚本字符串
```

**生成脚本结构**：
```python
import pytest

class Test{ModuleName}:
    """{tc_id} - {title}"""

    @pytest.mark.{priority}
    @pytest.mark.{test_type}
    def test_{func_name}(self):
        """{tc_id}: {title}"""
        # Arrange
        {inputs}

        # Act
        result = {module}.execute({params})

        # Assert
        assert result['{key}'] == '{expected}'
```

---

## 3. 测试架构

### Fixture 层级

```
tests/conftest.py                 ← 根级：generator、predictor、script_gen、sample metrics
tests/test_case_generator/        ← 本地：generator
tests/test_defect_predictor/      ← 本地：predictor、high_risk、low_risk
tests/test_script_generator/      ← 本地：script_gen、positive_spec、negative_spec
```

### 测试标记

| 标记 | 用途 |
|------|------|
| `@pytest.mark.generation` | TestCaseGenerator 测试 |
| `@pytest.mark.prediction` | DefectPredictor 测试 |
| `@pytest.mark.script_gen` | ScriptGenerator 测试 |
| `@pytest.mark.P0/P1/P2` | 测试优先级 |

---

## 4. 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| AI 后端 | 规则引擎 | 零依赖、完全可测试、CI 友好 |
| 数据模型 | Python dataclass | 轻量、类型安全、无 ORM 开销 |
| 生成方式 | 字符串模板 | 输出可预测，便于验证 |
| 测试框架 | Pytest | 与 portfolio 其他 Python 项目一致 |
| 优先级模型 | 规则优先 | 安全相关强制 P0，符合 QA 最佳实践 |
