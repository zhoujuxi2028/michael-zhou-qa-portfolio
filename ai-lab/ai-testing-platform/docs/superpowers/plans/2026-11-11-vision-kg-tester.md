# 图像识别与知识图谱测试模块 (REQ-AI-005) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `src/vision_kg_tester/` 中新增纯 mock 的图像识别 + 知识图谱测试模块，共 39 个测试用例，覆盖率 ≥ 80%。

**Architecture:** `ImageClassifier`（预置标签字典模拟推理，支持置信度阈值/鲁棒性/批量一致性/评估）+ `KnowledgeGraph`（纯内存三元组存储，支持准确性/完整性/一致性/时效性四维验证）。全部 mock 实现，无真实模型、无图数据库、无外部依赖。

**Tech Stack:** 纯 Python stdlib（`dataclasses`、`time`、`math`），`pytest`（测试）。**无新增第三方依赖**。

**Design spec:** `docs/superpowers/specs/2026-11-11-vision-kg-tester-design.md`

---

## File Structure

```
Create: src/vision_kg_tester/__init__.py
Create: src/vision_kg_tester/image_classifier.py
Create: src/vision_kg_tester/knowledge_graph.py
Create: tests/test_vision_kg_tester/__init__.py
Create: tests/test_vision_kg_tester/conftest.py
Create: tests/test_vision_kg_tester/test_image_classifier.py
Create: tests/test_vision_kg_tester/test_knowledge_graph.py
Modify: pytest.ini                  ← add vision/knowledge_graph markers
Modify: .github/workflows/ai-testing-ci.yml  ← add vision & KG test step (Task 4)
Modify: docs/ARCHITECTURE.md        ← add vision_kg section (done in Stage 2 closing)
Modify: docs/qa/test-plan.md        ← add vision_kg section (done in Stage 2 closing)
```

---

## Task 1: Setup — test scaffold + pytest markers

**Files:**
- Modify: `pytest.ini`
- Create: `src/vision_kg_tester/__init__.py`
- Create: `tests/test_vision_kg_tester/__init__.py`
- Create: `tests/test_vision_kg_tester/conftest.py`

- [ ] **Step 1: Add vision/KG markers to pytest.ini**

```ini
    vision: Vision image classification tests
    vision_accuracy: Classification accuracy tests
    vision_threshold: Confidence threshold tests
    vision_robustness: Robustness tests
    vision_batch: Batch consistency tests
    knowledge_graph: Knowledge graph tests
    kg_accuracy: KG accuracy tests
    kg_completeness: KG completeness tests
    kg_consistency: KG consistency tests
    kg_timeliness: KG timeliness tests
```

- [ ] **Step 2: Create module init**

`src/vision_kg_tester/__init__.py`:
```python
from .image_classifier import (
    BatchClassificationReport,
    ClassificationError,
    ClassificationResult,
    ImageClassifier,
)
from .knowledge_graph import (
    KGError,
    ConsistencyError,
    KnowledgeGraph,
    Triple,
    ValidationReport,
)

__all__ = [
    "BatchClassificationReport", "ClassificationError", "ClassificationResult", "ImageClassifier",
    "KGError", "ConsistencyError", "KnowledgeGraph", "Triple", "ValidationReport",
]
```

- [ ] **Step 3: Create test package + conftest**

`tests/test_vision_kg_tester/__init__.py`: empty file.

`tests/test_vision_kg_tester/conftest.py`:
```python
"""Shared fixtures for test_vision_kg_tester tests."""
import pytest

from src.vision_kg_tester import ImageClassifier, KnowledgeGraph, Triple


@pytest.fixture
def classifier() -> ImageClassifier:
    return ImageClassifier()


@pytest.fixture
def graph() -> KnowledgeGraph:
    return KnowledgeGraph()


@pytest.fixture
def sample_triple() -> Triple:
    return Triple(subject="Alice", predicate="age", object="30")
```

- [ ] **Step 4: Verify discovery**

```bash
cd ai-lab/ai-testing-platform
venv/bin/pytest tests/test_vision_kg_tester/ --collect-only -q 2>&1 | tail -3
```

Expected: `no tests ran`.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(ai-testing): setup vision/KG tester scaffold (REQ-AI-005)"
```

---

## Task 2: ImageClassifier

**Files:**
- Create: `src/vision_kg_tester/image_classifier.py`
- Create: `tests/test_vision_kg_tester/test_image_classifier.py`

- [ ] **Step 1: Write failing tests** — 实现 TC-VIS-ACC-001~005、TC-VIS-THR-001~004、TC-VIS-ROB-001~005、TC-VIS-BAT-001~003、TC-VIS-ERR-001~002（共 19 例，见 spec 测试用例表）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `image_classifier.py`**

```python
"""Image recognition mock classifier + evaluation (no real model)."""
from __future__ import annotations

from dataclasses import dataclass, field


class ClassificationError(Exception):
    pass


@dataclass
class ClassificationResult:
    image_path: str
    label: str
    confidence: float
    is_reliable: bool
    metadata: dict = field(default_factory=dict)


@dataclass
class BatchClassificationReport:
    results: list[ClassificationResult]
    precision: float
    recall: float
    f1_score: float
    total: int
    reliable_count: int


SAMPLE_IMAGES = {
    "cat.jpg": {"label": "cat", "confidence": 0.95},
    "dog.jpg": {"label": "dog", "confidence": 0.88},
    "car.jpg": {"label": "car", "confidence": 0.91},
    "blur_cat.jpg": {"label": "cat", "confidence": 0.78},
    "dark_dog.jpg": {"label": "dog", "confidence": 0.72},
    "rot_car.jpg": {"label": "car", "confidence": 0.75},
}


class ImageClassifier:
    DEFAULT_THRESHOLD = 0.5

    def __init__(self, threshold: float = DEFAULT_THRESHOLD):
        self.threshold = threshold

    def classify(self, image_path: str) -> ClassificationResult:
        if not image_path:
            raise ClassificationError("image_path must not be empty")
        entry = SAMPLE_IMAGES.get(image_path)
        if entry is None:
            raise ClassificationError(f"Unknown image: {image_path}")
        confidence = entry["confidence"]
        return ClassificationResult(
            image_path=image_path,
            label=entry["label"],
            confidence=confidence,
            is_reliable=confidence >= self.threshold,
        )

    def classify_batch(self, image_paths: list[str]) -> list[ClassificationResult]:
        return [self.classify(p) for p in image_paths]

    def evaluate(self, image_paths: list[str], ground_truth: list[str]) -> BatchClassificationReport:
        results = self.classify_batch(image_paths)
        total = len(results)
        tp = sum(1 for r, gt in zip(results, ground_truth) if r.label == gt)
        precision = tp / total if total else 0.0
        recall = tp / total if total else 0.0
        f1 = 0.0
        if precision + recall > 0:
            f1 = 2 * precision * recall / (precision + recall)
        reliable_count = sum(1 for r in results if r.is_reliable)
        return BatchClassificationReport(
            results=results,
            precision=round(precision, 4),
            recall=round(recall, 4),
            f1_score=round(f1, 4),
            total=total,
            reliable_count=reliable_count,
        )
```

- [ ] **Step 4: Run to verify PASS** → 19 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add ImageClassifier mock (REQ-AI-005)"
```

---

## Task 3: KnowledgeGraph

**Files:**
- Create: `src/vision_kg_tester/knowledge_graph.py`
- Create: `tests/test_vision_kg_tester/test_knowledge_graph.py`

- [ ] **Step 1: Write failing tests** — 实现 TC-KG-ACC-001~004、TC-KG-CPL-001~004、TC-KG-CON-001~005、TC-KG-TTL-001~004、TC-KG-VAL-001~003（共 20 例，见 spec 测试用例表）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `knowledge_graph.py`**

```python
"""Knowledge graph mock with accuracy/completeness/consistency/timeliness validation."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional


class KGError(Exception):
    pass


class ConsistencyError(KGError):
    pass


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
    accuracy_score: float
    completeness_score: float
    consistency_violations: list[str]
    stale_triples: list[Triple]
    details: dict


SINGLE_VALUE_PREDICATES = {"age", "birthdate", "capital"}
MUTUALLY_EXCLUSIVE_TYPES = [{"Person", "Organization"}]


class KnowledgeGraph:
    def __init__(self, ttl_seconds: float = 86400.0):
        self.ttl_seconds = ttl_seconds
        self._triples: list[Triple] = []

    def add_triple(self, triple: Triple) -> None:
        self._triples.append(triple)

    def add_triples(self, triples: list[Triple]) -> None:
        for t in triples:
            self.add_triple(t)

    def get_triples(self, subject: Optional[str] = None, predicate: Optional[str] = None) -> list[Triple]:
        result = self._triples
        if subject is not None:
            result = [t for t in result if t.subject == subject]
        if predicate is not None:
            result = [t for t in result if t.predicate == predicate]
        return result

    def remove_triple(self, subject: str, predicate: str, object: str) -> bool:
        for i, t in enumerate(self._triples):
            if t.subject == subject and t.predicate == predicate and t.object == object:
                del self._triples[i]
                return True
        return False

    def validate_accuracy(self, expected: list[Triple]) -> float:
        if not expected:
            return 1.0
        expected_set = {(t.subject, t.predicate, t.object) for t in expected}
        actual_set = {(t.subject, t.predicate, t.object) for t in self._triples}
        return len(actual_set & expected_set) / len(expected_set)

    def validate_completeness(self, expected_entities: set[str]) -> float:
        if not expected_entities:
            return 1.0
        actual_entities = {t.subject for t in self._triples} | {t.object for t in self._triples}
        return len(actual_entities & expected_entities) / len(expected_entities)

    def check_consistency(self) -> list[str]:
        violations: list[str] = []
        seen_single: dict[tuple[str, str], str] = {}
        entity_types: dict[str, set[str]] = {}
        for t in self._triples:
            if t.predicate in SINGLE_VALUE_PREDICATES:
                key = (t.subject, t.predicate)
                if key in seen_single and seen_single[key] != t.object:
                    violations.append(
                        f"single-value conflict: {t.subject}.{t.predicate} = {seen_single[key]} vs {t.object}"
                    )
                else:
                    seen_single[key] = t.object
            if t.predicate == "type":
                entity_types.setdefault(t.subject, set()).add(t.object)
            if t.subject == t.object:
                violations.append(f"reflexive error: {t.subject} -{t.predicate}-> {t.object}")
        for subject, types in entity_types.items():
            for pair in MUTUALLY_EXCLUSIVE_TYPES:
                if pair.issubset(types):
                    violations.append(f"type conflict: {subject} cannot be both {sorted(pair)}")
        return violations

    def check_timeliness(self) -> list[Triple]:
        now = time.time()
        return [t for t in self._triples if now - t.timestamp > self.ttl_seconds]

    def full_validation(
        self,
        expected_triples: list[Triple],
        expected_entities: set[str],
    ) -> ValidationReport:
        accuracy = self.validate_accuracy(expected_triples)
        completeness = self.validate_completeness(expected_entities)
        violations = self.check_consistency()
        stale = self.check_timeliness()
        return ValidationReport(
            is_valid=(not violations and accuracy == 1.0),
            accuracy_score=accuracy,
            completeness_score=completeness,
            consistency_violations=violations,
            stale_triples=stale,
            details={"total_triples": len(self._triples)},
        )
```

- [ ] **Step 4: Run to verify PASS** → 20 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add KnowledgeGraph mock (REQ-AI-005)"
```

---

## Task 4: CI update

**Files:**
- Modify: `.github/workflows/ai-testing-ci.yml`

- [ ] **Step 1: Add vision & KG test step** — 在 `unit-tests` job 中新增：

```yaml
- name: Run vision & KG tester tests
  working-directory: ai-lab/ai-testing-platform
  run: pytest tests/test_vision_kg_tester/ -v -m "vision or knowledge_graph" --cov=src/vision_kg_tester --cov-fail-under=80
```

- [ ] **Step 2: Sync workflow docs** — 若 workflow 文件名/内容有变，按 `scripts/check-workflow-doc-sync.sh` 同步。

- [ ] **Step 3: Commit**

```bash
git commit -m "ci(ai-testing): run vision/KG tester tests in unit-tests job (REQ-AI-005)"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run complete vision/KG suite**

```bash
cd ai-lab/ai-testing-platform
venv/bin/pytest tests/test_vision_kg_tester/ -v -m "vision or knowledge_graph" --tb=short 2>&1 | tail -20
```

Expected: 39 PASSED.

- [ ] **Step 2: Coverage**

```bash
venv/bin/pytest tests/test_vision_kg_tester/ -m "vision or knowledge_graph" --cov=src/vision_kg_tester --cov-report=term-missing
```

Expected: 覆盖率 ≥ 80%。

- [ ] **Step 3: Lint / format**

```bash
venv/bin/ruff check src/vision_kg_tester/ tests/test_vision_kg_tester/
venv/bin/black --check src/vision_kg_tester/ tests/test_vision_kg_tester/
venv/bin/isort --check-only src/vision_kg_tester/ tests/test_vision_kg_tester/
venv/bin/flake8 src/vision_kg_tester/ tests/test_vision_kg_tester/ --max-line-length=120 --extend-ignore=E203
```

Expected: 无错误。

- [ ] **Step 4: Final commit（若有 lint 修复）**

```bash
git commit -m "style(ai-testing): lint fixes for vision_kg_tester"
```
