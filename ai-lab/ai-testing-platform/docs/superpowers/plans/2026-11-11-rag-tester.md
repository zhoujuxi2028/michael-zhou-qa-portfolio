# RAG 全链路测试模块 (REQ-AI-004) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `src/rag_tester/` 中新增一个纯 mock 的 RAG 全链路测试模块，覆盖文档解析 → 切分 → 索引 → 检索 → 重排 → 上下文构建 → 答案生成 7 个阶段 + 端到端 Pipeline，共 47 个测试用例，覆盖率 ≥ 80%。

**Architecture:** 7 个独立 Stage 类各自可单独测试，`RAGPipeline` 串联全部阶段并支持失败定位（`failed_stage`）。全部 mock 实现——无真实 LLM、无向量数据库、无外部依赖；伪向量用确定性哈希生成（固定 384 维），检索用余弦相似度，重排用关键词密度，token 按「1 词≈1.3 token」估算。

**Tech Stack:** 纯 Python stdlib（`dataclasses`、`enum`、`hashlib`、`math`、`re`、`time`），`pytest`（测试）。**无新增第三方依赖**。

**Design spec:** `docs/superpowers/specs/2026-11-11-rag-tester-design.md`

---

## File Structure

```
Create: src/rag_tester/__init__.py
Create: src/rag_tester/document_parser.py
Create: src/rag_tester/chunker.py
Create: src/rag_tester/indexer.py
Create: src/rag_tester/retriever.py
Create: src/rag_tester/reranker.py
Create: src/rag_tester/context_builder.py
Create: src/rag_tester/answer_generator.py
Create: src/rag_tester/pipeline.py
Create: tests/test_rag_tester/__init__.py
Create: tests/test_rag_tester/conftest.py
Create: tests/test_rag_tester/test_document_parser.py
Create: tests/test_rag_tester/test_chunker.py
Create: tests/test_rag_tester/test_indexer.py
Create: tests/test_rag_tester/test_retriever.py
Create: tests/test_rag_tester/test_reranker.py
Create: tests/test_rag_tester/test_context_builder.py
Create: tests/test_rag_tester/test_answer_generator.py
Create: tests/test_rag_tester/test_pipeline.py
Modify: pytest.ini                  ← add rag markers
Modify: .github/workflows/ai-testing-ci.yml  ← add RAG test step (Task 10)
Modify: docs/ARCHITECTURE.md        ← add RAG section (done in Stage 2 closing)
Modify: docs/qa/test-plan.md        ← add RAG section (done in Stage 2 closing)
```

---

## Task 1: Setup — test scaffold + pytest markers

**Files:**
- Modify: `pytest.ini`
- Create: `src/rag_tester/__init__.py`
- Create: `tests/test_rag_tester/__init__.py`
- Create: `tests/test_rag_tester/conftest.py`

- [ ] **Step 1: Add rag markers to pytest.ini**

In the `markers =` block, append:

```ini
    rag: RAG full-pipeline tests
    rag_parse: Document parsing stage tests
    rag_chunk: Chunking stage tests
    rag_index: Vector indexing stage tests
    rag_retrieve: Retrieval stage tests
    rag_rerank: Reranking stage tests
    rag_context: Context building stage tests
    rag_answer: Answer generation stage tests
    rag_pipeline: End-to-end pipeline tests
```

- [ ] **Step 2: Create module init**

`src/rag_tester/__init__.py`:
```python
from .document_parser import DocumentParser, ParseError, ParsedDocument
from .chunker import Chunk, ChunkError, Chunker
from .indexer import IndexedChunk, VectorIndexError, VectorIndexer
from .retriever import RetrievalResult, Retriever
from .reranker import Reranker
from .context_builder import Context, ContextBuilder
from .answer_generator import AnswerGenerator, GeneratedAnswer
from .pipeline import PipelineResult, RAGPipeline

__all__ = [
    "DocumentParser", "ParseError", "ParsedDocument",
    "Chunk", "ChunkError", "Chunker",
    "IndexedChunk", "VectorIndexError", "VectorIndexer",
    "RetrievalResult", "Retriever",
    "Reranker",
    "Context", "ContextBuilder",
    "AnswerGenerator", "GeneratedAnswer",
    "PipelineResult", "RAGPipeline",
]
```

- [ ] **Step 3: Create test package + conftest**

`tests/test_rag_tester/__init__.py`: empty file.

`tests/test_rag_tester/conftest.py`:
```python
"""Shared fixtures for test_rag_tester tests."""
import pytest

from src.rag_tester import Chunker, DocumentParser, VectorIndexer


@pytest.fixture
def parser() -> DocumentParser:
    return DocumentParser()


@pytest.fixture
def chunker() -> Chunker:
    return Chunker(chunk_size=64, overlap=16)


@pytest.fixture
def indexer() -> VectorIndexer:
    return VectorIndexer()


@pytest.fixture
def sample_text() -> str:
    return (
        "Retrieval-Augmented Generation combines document retrieval "
        "with language model generation to ground answers in evidence."
    )
```

- [ ] **Step 4: Verify discovery**

```bash
cd ai-lab/ai-testing-platform
pytest tests/test_rag_tester/ --collect-only -q 2>&1 | tail -5
```

Expected: `no tests ran` (no test files yet — verifying discovery only).

- [ ] **Step 5: Commit**

```bash
git add ai-lab/ai-testing-platform/pytest.ini \
        ai-lab/ai-testing-platform/src/rag_tester/__init__.py \
        ai-lab/ai-testing-platform/tests/test_rag_tester/__init__.py \
        ai-lab/ai-testing-platform/tests/test_rag_tester/conftest.py
git commit -m "chore(ai-testing): setup RAG tester scaffold (REQ-AI-004)"
```

---

## Task 2: DocumentParser (Stage 1)

**Files:**
- Create: `src/rag_tester/document_parser.py`
- Create: `tests/test_rag_tester/test_document_parser.py`

**Mock 策略**：按文件扩展名返回预设内容；HTML 剥标签；不依赖真实文件 IO。

- [ ] **Step 1: Write failing tests** — 实现 TC-RAG-PARSE-001~007（见 spec 测试用例表），标记 `@pytest.mark.rag_parse`。

- [ ] **Step 2: Run to verify FAIL**

```bash
pytest tests/test_rag_tester/test_document_parser.py -v 2>&1 | tail -8
```

Expected: `ModuleNotFoundError` (module not created yet).

- [ ] **Step 3: Implement `document_parser.py`**

```python
"""Stage 1: document parsing (mock)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field


class ParseError(Exception):
    pass


@dataclass
class ParsedDocument:
    source: str
    content: str
    metadata: dict = field(default_factory=dict)
    format: str = "txt"


class DocumentParser:
    SUPPORTED_FORMATS = {"pdf", "docx", "txt", "html", "md"}

    def parse(self, source: str, content: str = "", encoding: str = "utf-8") -> ParsedDocument:
        fmt = self._detect_format(source)
        if fmt not in self.SUPPORTED_FORMATS:
            raise ParseError(f"Unsupported format: {fmt}")
        if fmt == "html":
            content = re.sub(r"<[^>]+>", "", content or source)
        elif content == "" and fmt == "txt":
            content = source
        return ParsedDocument(
            source=source,
            content=content,
            metadata={"encoding": encoding, "format": fmt},
            format=fmt,
        )

    def parse_batch(self, sources: list[str]) -> list[ParsedDocument]:
        return [self.parse(s) for s in sources]

    @staticmethod
    def _detect_format(source: str) -> str:
        if "." in source:
            return source.rsplit(".", 1)[-1].lower()
        return "txt"
```

- [ ] **Step 4: Run to verify PASS**

```bash
pytest tests/test_rag_tester/test_document_parser.py -v
```

Expected: 7 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add DocumentParser stage (REQ-AI-004)"
```

---

## Task 3: Chunker (Stage 2)

**Files:**
- Create: `src/rag_tester/chunker.py`
- Create: `tests/test_rag_tester/test_chunker.py`

- [ ] **Step 1: Write failing tests** — TC-RAG-CHUNK-001~006（`@pytest.mark.rag_chunk`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `chunker.py`**

```python
"""Stage 2: chunking strategy (mock)."""
from __future__ import annotations

from dataclasses import dataclass, field

from .document_parser import ParsedDocument


class ChunkError(Exception):
    pass


@dataclass
class Chunk:
    index: int
    text: str
    start_char: int
    end_char: int
    metadata: dict = field(default_factory=dict)


class Chunker:
    def __init__(self, chunk_size: int = 512, overlap: int = 64):
        if overlap >= chunk_size:
            raise ChunkError("overlap must be < chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, document: ParsedDocument) -> list[Chunk]:
        return self.chunk_text(document.content)

    def chunk_text(self, text: str) -> list[Chunk]:
        if not text:
            return []
        chunks: list[Chunk] = []
        start = 0
        step = self.chunk_size - self.overlap
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunks.append(Chunk(
                index=len(chunks),
                text=text[start:end],
                start_char=start,
                end_char=end,
            ))
            if end == len(text):
                break
            start += step
        return chunks
```

- [ ] **Step 4: Run to verify PASS** → 6 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add Chunker stage (REQ-AI-004)"
```

---

## Task 4: VectorIndexer (Stage 3)

**Files:**
- Create: `src/rag_tester/indexer.py`
- Create: `tests/test_rag_tester/test_indexer.py`

**Mock 策略**：确定性哈希生成 384 维伪向量（基于 chunk 文本 token 集合的加权哈希，保证相似文本产生相近向量），内存 dict 存储。

- [ ] **Step 1: Write failing tests** — TC-RAG-IDX-001~006（`@pytest.mark.rag_index`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `indexer.py`**

```python
"""Stage 3: vector indexing (mock — deterministic hash vectors)."""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from typing import Optional

from .chunker import Chunk


class VectorIndexError(Exception):
    pass


@dataclass
class IndexedChunk:
    chunk_id: str
    chunk: Chunk
    vector: list[float]
    indexed_at: float = field(default_factory=time.time)


class VectorIndexer:
    VECTOR_DIM = 384

    def __init__(self):
        self._store: dict[str, IndexedChunk] = {}

    def index(self, chunks: list[Chunk]) -> list[IndexedChunk]:
        return [self.index_one(c) for c in chunks]

    def index_one(self, chunk: Chunk) -> IndexedChunk:
        chunk_id = self._make_id(chunk)
        indexed = IndexedChunk(chunk_id=chunk_id, chunk=chunk, vector=self._embed(chunk.text))
        self._store[chunk_id] = indexed
        return indexed

    def get(self, chunk_id: str) -> Optional[IndexedChunk]:
        return self._store.get(chunk_id)

    def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)

    @staticmethod
    def _make_id(chunk: Chunk) -> str:
        return hashlib.sha1(f"{chunk.start_char}:{chunk.end_char}".encode()).hexdigest()[:16]

    @classmethod
    def _embed(cls, text: str) -> list[float]:
        """Deterministic pseudo-embedding: token presence hashed into a 384-dim vector."""
        vec = [0.0] * cls.VECTOR_DIM
        for token in text.split():
            h = hashlib.sha256(token.lower().encode()).hexdigest()
            idx = int(h, 16) % cls.VECTOR_DIM
            vec[idx] += 1.0
        norm = sum(v * v for v in vec) ** 0.5
        if norm == 0:
            return vec
        return [v / norm for v in vec]
```

- [ ] **Step 4: Run to verify PASS** → 6 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add VectorIndexer stage (REQ-AI-004)"
```

---

## Task 5: Retriever (Stage 4)

**Files:**
- Create: `src/rag_tester/retriever.py`
- Create: `tests/test_rag_tester/test_retriever.py`

**Mock 策略**：query 用 `VectorIndexer._embed` 生成同维伪向量，对所有 `IndexedChunk` 计算余弦相似度，取 top-k。

- [ ] **Step 1: Write failing tests** — TC-RAG-RET-001~007（`@pytest.mark.rag_retrieve`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `retriever.py`**

```python
"""Stage 4: retrieval (mock — cosine similarity over pseudo-vectors)."""
from __future__ import annotations

from dataclasses import dataclass

from .indexer import IndexedChunk, VectorIndexer


@dataclass
class RetrievalResult:
    chunk: object
    score: float
    rank: int


class Retriever:
    def __init__(self, indexer: VectorIndexer):
        self.indexer = indexer

    def retrieve(self, query: str, top_k: int = 5) -> list[RetrievalResult]:
        if top_k <= 0:
            return []
        q_vec = VectorIndexer._embed(query)
        scored: list[tuple[IndexedChunk, float]] = [
            (ic, self._cosine(q_vec, ic.vector)) for ic in self.indexer._store.values()
        ]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        results = [
            RetrievalResult(chunk=ic.chunk, score=round(score, 4), rank=i + 1)
            for i, (ic, score) in enumerate(scored[:top_k])
        ]
        return results

    @staticmethod
    def _cosine(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(y * y for y in b) ** 0.5
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)
```

- [ ] **Step 4: Run to verify PASS** → 7 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add Retriever stage (REQ-AI-004)"
```

---

## Task 6: Reranker (Stage 5)

**Files:**
- Create: `src/rag_tester/reranker.py`
- Create: `tests/test_rag_tester/test_reranker.py`

**Mock 策略**：统计 query 关键词在 chunk 中的出现次数，与原始 score 加权后重新排序（稳定排序）。

- [ ] **Step 1: Write failing tests** — TC-RAG-RNK-001~005（`@pytest.mark.rag_rerank`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `reranker.py`**

```python
"""Stage 5: reranking (mock — keyword density)."""
from __future__ import annotations

import re

from .retriever import RetrievalResult


class Reranker:
    def rerank(self, query: str, results: list[RetrievalResult]) -> list[RetrievalResult]:
        if not results:
            return []
        keywords = {w.lower() for w in re.findall(r"\w+", query)}
        reranked: list[RetrievalResult] = []
        for i, r in enumerate(results):
            text = getattr(r.chunk, "text", "")
            tokens = re.findall(r"\w+", text.lower())
            density = sum(1 for t in tokens if t in keywords) / max(1, len(tokens))
            new_score = round(r.score + density, 4)
            reranked.append(RetrievalResult(chunk=r.chunk, score=new_score, rank=0))
        # stable sort: keep original relative order for equal scores
        ordered = sorted(enumerate(reranked), key=lambda pair: pair[1].score, reverse=True)
        for new_rank, (_, r) in enumerate(ordered, start=1):
            r.rank = new_rank
        return [r for _, r in ordered]
```

- [ ] **Step 4: Run to verify PASS** → 5 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add Reranker stage (REQ-AI-004)"
```

---

## Task 7: ContextBuilder (Stage 6)

**Files:**
- Create: `src/rag_tester/context_builder.py`
- Create: `tests/test_rag_tester/test_context_builder.py`

**Mock 策略**：按「1 词≈1.3 token」估算，超出 `max_tokens` 时截断并标记 `truncated`。

- [ ] **Step 1: Write failing tests** — TC-RAG-CTX-001~005（`@pytest.mark.rag_context`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `context_builder.py`**

```python
"""Stage 6: context building (mock — token estimate)."""
from __future__ import annotations

from dataclasses import dataclass

from .retriever import RetrievalResult


@dataclass
class Context:
    text: str
    token_count: int
    chunk_count: int
    truncated: bool


class ContextBuilder:
    TOKENS_PER_WORD = 1.3

    def __init__(self, max_tokens: int = 2048, separator: str = "\n\n"):
        self.max_tokens = max_tokens
        self.separator = separator

    def build(self, results: list[RetrievalResult]) -> Context:
        texts = [getattr(r.chunk, "text", "") for r in results]
        parts: list[str] = []
        total = 0.0
        truncated = False
        for t in texts:
            est = len(t.split()) * self.TOKENS_PER_WORD
            if total + est > self.max_tokens:
                truncated = True
                break
            parts.append(t)
            total += est
        text = self.separator.join(parts)
        return Context(
            text=text,
            token_count=int(total),
            chunk_count=len(parts),
            truncated=truncated,
        )
```

- [ ] **Step 4: Run to verify PASS** → 5 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add ContextBuilder stage (REQ-AI-004)"
```

---

## Task 8: AnswerGenerator (Stage 7)

**Files:**
- Create: `src/rag_tester/answer_generator.py`
- Create: `tests/test_rag_tester/test_answer_generator.py`

**Mock 策略**：从上下文中提取关键句作为答案；`faithfulness_score` = 答案词来自上下文的比例；`relevance_score` = 答案与 query 关键词重叠；`has_hallucination` = 是否存在上下文外词汇。

- [ ] **Step 1: Write failing tests** — TC-RAG-ANS-001~007（`@pytest.mark.rag_answer`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `answer_generator.py`**

```python
"""Stage 7: answer generation (mock — extractive, faithfulness/hallucination check)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .context_builder import Context


@dataclass
class GeneratedAnswer:
    answer: str
    faithfulness_score: float
    relevance_score: float
    has_hallucination: bool
    metadata: dict = field(default_factory=dict)


class AnswerGenerator:
    def generate(self, query: str, context: Context) -> GeneratedAnswer:
        sentences = [s for s in re.split(r"[.!?]\s+", context.text) if s.strip()]
        if not sentences:
            return GeneratedAnswer("", 0.0, 0.0, False, {})

        answer = sentences[0].strip()
        context_words = {w.lower() for w in re.findall(r"\w+", context.text)}
        answer_words = re.findall(r"\w+", answer.lower())
        query_words = {w.lower() for w in re.findall(r"\w+", query)}

        in_context = sum(1 for w in answer_words if w in context_words)
        faithfulness = in_context / max(1, len(answer_words))
        overlap = sum(1 for w in answer_words if w in query_words)
        relevance = overlap / max(1, len(query_words))
        has_hallucination = any(w not in context_words for w in answer_words)

        return GeneratedAnswer(
            answer=answer,
            faithfulness_score=round(faithfulness, 4),
            relevance_score=round(relevance, 4),
            has_hallucination=has_hallucination,
            metadata={"sentence_count": len(sentences)},
        )
```

- [ ] **Step 4: Run to verify PASS** → 7 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add AnswerGenerator stage (REQ-AI-004)"
```

---

## Task 9: RAGPipeline (E2E)

**Files:**
- Create: `src/rag_tester/pipeline.py`
- Create: `tests/test_rag_tester/test_pipeline.py`

- [ ] **Step 1: Write failing tests** — TC-RAG-E2E-001~004（`@pytest.mark.rag_pipeline`）。

- [ ] **Step 2: Run to verify FAIL** → `ModuleNotFoundError`.

- [ ] **Step 3: Implement `pipeline.py`**

```python
"""End-to-end RAG pipeline (mock)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .answer_generator import AnswerGenerator, GeneratedAnswer
from .chunker import Chunker
from .context_builder import ContextBuilder
from .document_parser import DocumentParser
from .indexer import VectorIndexer
from .reranker import Reranker
from .retriever import Retriever

STAGE_ORDER = [
    "document_parser", "chunker", "indexer",
    "retriever", "reranker", "context_builder", "answer_generator",
]


@dataclass
class PipelineResult:
    answer: GeneratedAnswer
    stage_outputs: dict = field(default_factory=dict)
    success: bool = True
    failed_stage: Optional[str] = None


class RAGPipeline:
    def __init__(self, parser, chunker, indexer, retriever, reranker, builder, generator):
        self.parser = parser
        self.chunker = chunker
        self.indexer = indexer
        self.retriever = retriever
        self.reranker = reranker
        self.builder = builder
        self.generator = generator

    @classmethod
    def build_default(cls) -> "RAGPipeline":
        parser = DocumentParser()
        chunker = Chunker()
        indexer = VectorIndexer()
        return cls(
            parser, chunker, indexer,
            Retriever(indexer), Reranker(),
            ContextBuilder(), AnswerGenerator(),
        )

    def run(self, source: str, query: str) -> PipelineResult:
        outputs: dict = {}
        try:
            doc = self.parser.parse(source)
            outputs["document_parser"] = doc
            chunks = self.chunker.chunk(doc)
            outputs["chunker"] = chunks
            indexed = self.indexer.index(chunks)
            outputs["indexer"] = indexed
            results = self.retriever.retrieve(query)
            outputs["retriever"] = results
            reranked = self.reranker.rerank(query, results)
            outputs["reranker"] = reranked
            context = self.builder.build(reranked)
            outputs["context_builder"] = context
            answer = self.generator.generate(query, context)
            outputs["answer_generator"] = answer
            return PipelineResult(answer=answer, stage_outputs=outputs, success=True)
        except Exception as exc:  # noqa: BLE001 — stage failure localization
            stage = next((s for s in STAGE_ORDER if s not in outputs), "unknown")
            return PipelineResult(
                answer=GeneratedAnswer("", 0.0, 0.0, False, {}),
                stage_outputs=outputs,
                success=False,
                failed_stage=stage,
            )
```

- [ ] **Step 4: Run to verify PASS** → 4 PASSED.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ai-testing): add RAGPipeline E2E (REQ-AI-004)"
```

---

## Task 10: CI update

**Files:**
- Modify: `.github/workflows/ai-testing-ci.yml`

- [ ] **Step 1: Add RAG test step** — 在 `unit-tests` job 中新增：

```yaml
- name: Run RAG tester tests
  working-directory: ai-lab/ai-testing-platform
  run: pytest tests/test_rag_tester/ -v -m "rag and not integration" --cov=src/rag_tester --cov-fail-under=80
```

- [ ] **Step 2: Sync workflow docs** — 若 workflow 文件名/内容有变，按 `scripts/check-workflow-doc-sync.sh` 同步 `README.md` + `CLAUDE.md`。

- [ ] **Step 3: Commit**

```bash
git commit -m "ci(ai-testing): run RAG tester tests in unit-tests job (REQ-AI-004)"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run complete RAG suite**

```bash
cd ai-lab/ai-testing-platform
pytest tests/test_rag_tester/ -v -m "rag" --tb=short 2>&1 | tail -20
```

Expected: 47 PASSED.

- [ ] **Step 2: Coverage**

```bash
pytest tests/test_rag_tester/ -m "rag" --cov=src/rag_tester --cov-report=term-missing
```

Expected: 覆盖率 ≥ 80%。

- [ ] **Step 3: Full suite (no regression)**

```bash
pytest tests/ -v -m "not llm and not integration" --tb=short 2>&1 | tail -20
```

Expected: 全部 PASS（新增 47 个 rag 测试）。

- [ ] **Step 4: Lint / format**

```bash
ruff check src/rag_tester/ tests/test_rag_tester/
black --check src/rag_tester/ tests/test_rag_tester/
isort --check-only src/rag_tester/ tests/test_rag_tester/
flake8 src/rag_tester/ tests/test_rag_tester/ --max-line-length=120 --extend-ignore=E203
```

Expected: 无错误。

- [ ] **Step 5: Final commit（若有 lint 修复）**

```bash
git commit -m "style(ai-testing): lint fixes for rag_tester"
```
