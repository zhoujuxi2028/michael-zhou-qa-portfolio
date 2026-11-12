---
title: 图像识别与知识图谱测试模块设计
issue: "#867"
date: 2026-11-11
status: draft
---

# 图像识别与知识图谱测试模块设计

## 1. 背景与目标

### 背景

AI 应用质量保障需要覆盖图像识别与知识图谱测试：
> 了解图像识别与知识图谱的基本测试方法，能够验证图像识别的准确性与鲁棒性，以及知识图谱的准确性、完整性、一致性与时效性。

当前 `ai-lab/ai-testing-platform/` 不包含图像识别和知识图谱测试能力。

### 目标

在 `ai-lab/ai-testing-platform/` 中新增 `src/vision_kg_tester/` 模块，以 mock 实现验证：
- **图像识别**：准确性（precision/recall/F1）、置信度阈值、鲁棒性（模糊/旋转/低对比度）、批量一致性
- **知识图谱**：准确性、完整性、一致性、时效性

### 约束

- 无需真实模型或图数据库，全部 mock 实现
- 兼容现有项目结构和代码风格
- Python 3.9+，line-length 120

---

## 2. 目录结构

```
ai-lab/ai-testing-platform/
├── src/
│   └── vision_kg_tester/
│       ├── __init__.py
│       ├── image_classifier.py   # 图像识别 mock
│       └── knowledge_graph.py    # 知识图谱 mock
└── tests/
    └── test_vision_kg_tester/
        ├── __init__.py
        ├── conftest.py
        ├── test_image_classifier.py
        └── test_knowledge_graph.py
```

---

## 3. 图像识别模块设计（ImageClassifier）

### 3.1 Mock 策略

用预置标签字典模拟模型推理，支持注入噪声（鲁棒性测试）：

```python
# 预置样本库（降级幅度 ≤ 0.20，保证 TC-VIS-ROB-005 通过）
SAMPLE_IMAGES = {
    "cat.jpg":      {"label": "cat", "confidence": 0.95},
    "dog.jpg":      {"label": "dog", "confidence": 0.88},
    "car.jpg":      {"label": "car", "confidence": 0.91},
    "blur_cat.jpg": {"label": "cat", "confidence": 0.78},  # 模糊降级，delta=0.17
    "dark_dog.jpg": {"label": "dog", "confidence": 0.72},  # 低对比度降级，delta=0.16
    "rot_car.jpg":  {"label": "car", "confidence": 0.75},  # 旋转降级，delta=0.16
}
```

### 3.2 数据模型

```python
@dataclass
class ClassificationResult:
    image_path: str
    label: str
    confidence: float       # 0.0 ~ 1.0
    is_reliable: bool       # confidence >= threshold
    metadata: dict

@dataclass
class BatchClassificationReport:
    results: list[ClassificationResult]
    precision: float
    recall: float
    f1_score: float
    total: int
    reliable_count: int     # confidence >= threshold 的数量
```

### 3.3 核心接口

```python
class ImageClassifier:
    DEFAULT_THRESHOLD = 0.5

    def __init__(self, threshold: float = DEFAULT_THRESHOLD)
    def classify(self, image_path: str) -> ClassificationResult
    def classify_batch(self, image_paths: list[str]) -> list[ClassificationResult]
    def evaluate(
        self,
        image_paths: list[str],
        ground_truth: list[str]
    ) -> BatchClassificationReport
```

### 3.4 测试用例

#### 准确性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-VIS-ACC-001 | 单图分类返回正确标签 | label=="cat" for "cat.jpg" |
| TC-VIS-ACC-002 | confidence 在 [0,1] 范围 | 0 ≤ confidence ≤ 1 |
| TC-VIS-ACC-003 | 评估集 precision ≥ 0.8 | report.precision ≥ 0.8 |
| TC-VIS-ACC-004 | 评估集 recall ≥ 0.8 | report.recall ≥ 0.8 |
| TC-VIS-ACC-005 | F1 = 2×P×R/(P+R) | f1 == 2*p*r/(p+r)（误差<0.001） |

#### 置信度阈值测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-VIS-THR-001 | 高置信度 → is_reliable==True | confidence=0.95 → is_reliable==True |
| TC-VIS-THR-002 | 低置信度 → is_reliable==False | confidence=0.3 → is_reliable==False |
| TC-VIS-THR-003 | 边界值 confidence==threshold | is_reliable==True |
| TC-VIS-THR-004 | 自定义 threshold 生效 | threshold=0.9 → 低置信度图 is_reliable==False |

#### 鲁棒性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-VIS-ROB-001 | 模糊图仍返回正确标签 | blur_cat.jpg → label=="cat" |
| TC-VIS-ROB-002 | 模糊图 confidence 降级但仍可靠 | 0.5 < blur_cat confidence < 0.9（实际 0.78） |
| TC-VIS-ROB-003 | 低对比度图正常处理 | dark_dog.jpg → label=="dog"，不抛异常 |
| TC-VIS-ROB-004 | 旋转图正常处理 | rot_car.jpg → label=="car" |
| TC-VIS-ROB-005 | 鲁棒性降级幅度 ≤ 20% | 对每个降级对(normal, degraded)：normal - degraded ≤ 0.20（mock 数据最大 delta=0.17） |

#### 批量一致性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-VIS-BAT-001 | 同图多次推理结果相同 | 两次 classify("cat.jpg") 结果完全一致 |
| TC-VIS-BAT-002 | 批量与逐一结果一致 | classify_batch 结果 == 逐个 classify 结果 |
| TC-VIS-BAT-003 | 空列表输入 | 返回空列表，不抛异常 |

#### 错误处理测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-VIS-ERR-001 | 未知图片路径 | 抛 `ClassificationError` |
| TC-VIS-ERR-002 | 空字符串路径 | 抛 `ClassificationError` |

---

## 4. 知识图谱模块设计（KnowledgeGraph）

### 4.1 Mock 策略

纯内存三元组存储，支持约束规则注入，每条三元组携带 timestamp 支持时效性测试。

### 4.2 数据模型

```python
@dataclass
class Triple:
    subject: str
    predicate: str
    object: str
    confidence: float = 1.0
    timestamp: float = field(default_factory=time.time)

@dataclass
class ValidationReport:
    is_valid: bool
    accuracy_score: float       # 验证三元组中正确的比例
    completeness_score: float   # 实际实体/期望实体 覆盖率
    consistency_violations: list[str]   # 矛盾三元组描述
    stale_triples: list[Triple]         # 超过 TTL 的三元组
    details: dict

class KGError(Exception): pass
class ConsistencyError(KGError): pass
```

### 4.3 核心接口

```python
from typing import Optional

class KnowledgeGraph:
    def __init__(self, ttl_seconds: float = 86400.0)

    # 数据操作
    def add_triple(self, triple: Triple) -> None
    def add_triples(self, triples: list[Triple]) -> None
    def get_triples(self, subject: Optional[str] = None, predicate: Optional[str] = None) -> list[Triple]
    def remove_triple(self, subject: str, predicate: str, object: str) -> bool

    # 验证
    def validate_accuracy(self, expected: list[Triple]) -> float
    def validate_completeness(self, expected_entities: set[str]) -> float
    def check_consistency(self) -> list[str]        # 返回矛盾描述列表
    def check_timeliness(self) -> list[Triple]      # 返回过期三元组
    def full_validation(self, expected_triples: list[Triple],
                        expected_entities: set[str]) -> ValidationReport
```

### 4.4 一致性约束规则

内置以下约束（可扩展）：

| 规则 | 说明 |
|------|------|
| 单值谓词 | `age`、`birthdate`、`capital` 只允许一个值 |
| 类型互斥 | 同一实体不能同时是 `Person` 和 `Organization` |
| 自反禁止 | subject 和 object 不能相同 |

### 4.5 测试用例

#### 准确性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-KG-ACC-001 | 验证已添加三元组 | accuracy_score==1.0 |
| TC-KG-ACC-002 | 部分正确 | 0 < accuracy_score < 1 |
| TC-KG-ACC-003 | 完全错误 | accuracy_score==0.0 |
| TC-KG-ACC-004 | 实体抽取精度 | 返回三元组 subject/object 均在期望集合中 |

#### 完整性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-KG-CPL-001 | 完整覆盖期望实体 | completeness_score==1.0 |
| TC-KG-CPL-002 | 缺少部分实体 | 0 < completeness_score < 1 |
| TC-KG-CPL-003 | 空图谱 | completeness_score==0.0 |
| TC-KG-CPL-004 | 期望集合为空 | completeness_score==1.0（无要求即完整） |

#### 一致性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-KG-CON-001 | 无矛盾三元组 | consistency_violations==[] |
| TC-KG-CON-002 | 单值谓词冲突 | violations 包含冲突描述 |
| TC-KG-CON-003 | 类型互斥冲突 | violations 包含类型冲突描述 |
| TC-KG-CON-004 | 自反三元组 | violations 包含自反错误 |
| TC-KG-CON-005 | 多条矛盾同时检测 | violations 长度==矛盾数量 |

#### 时效性测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-KG-TTL-001 | 新添加三元组未过期 | stale_triples==[] |
| TC-KG-TTL-002 | 过期三元组被检测 | stale_triples 包含过期条目 |
| TC-KG-TTL-003 | 更新后版本递增 | 重新添加三元组后 timestamp 更新 |
| TC-KG-TTL-004 | 自定义 TTL | 用 `unittest.mock.patch("time.time")` 模拟时间推进，ttl=1s 图谱过期检测（不使用 sleep） |

#### 综合验证测试

| TC | 描述 | 断言 |
|----|------|------|
| TC-KG-VAL-001 | full_validation 返回完整报告 | 包含四个维度得分 |
| TC-KG-VAL-002 | 健康图谱全绿 | is_valid==True |
| TC-KG-VAL-003 | 有矛盾时 is_valid==False | is_valid==False |

---

## 5. 新增 pytest markers

在 `pytest.ini` 中新增：

```ini
vision              # 图像识别测试
vision_accuracy     # 分类准确性
vision_threshold    # 置信度阈值
vision_robustness   # 鲁棒性
vision_batch        # 批量一致性
knowledge_graph     # 知识图谱测试
kg_accuracy         # KG 准确性
kg_completeness     # KG 完整性
kg_consistency      # KG 一致性
kg_timeliness       # KG 时效性
```

---

## 6. CI 更新

`ai-testing-ci.yml` 新增步骤：

```yaml
- name: Run vision & KG tester tests
  working-directory: ai-lab/ai-testing-platform
  run: pytest tests/test_vision_kg_tester/ -v -m "vision or knowledge_graph" --cov=src/vision_kg_tester --cov-fail-under=80
```

> 新增 markers 需在实现前确认与现有 `pytest.ini` 无重名冲突（现有 markers：generation, prediction, script_gen, llm, scanner, integration, P0, P1, P2, smoke）。

---

## 7. 预估测试数量

| 模块 | 用例数 |
|------|--------|
| image_classifier — 准确性 | 5 |
| image_classifier — 阈值 | 4 |
| image_classifier — 鲁棒性 | 5 |
| image_classifier — 批量一致性 | 3 |
| image_classifier — 错误处理 | 2 |
| knowledge_graph — 准确性 | 4 |
| knowledge_graph — 完整性 | 4 |
| knowledge_graph — 一致性 | 5 |
| knowledge_graph — 时效性 | 4 |
| knowledge_graph — 综合验证 | 3 |
| **合计** | **39** |

---

## 8. 验收标准

- [ ] 39 个测试用例全部通过 `pytest tests/test_vision_kg_tester/ -v`
- [ ] `pytest --cov=src/vision_kg_tester` 覆盖率 ≥ 80%
- [ ] `ruff check src/vision_kg_tester/ tests/test_vision_kg_tester/` 无错误
- [ ] `black --check` 格式通过
- [ ] CI workflow 绿灯
