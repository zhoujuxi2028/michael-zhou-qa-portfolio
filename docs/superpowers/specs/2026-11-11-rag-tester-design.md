---
title: RAG 全链路测试模块设计
issue: "#866"
date: 2026-11-11
status: draft
---

# RAG 全链路测试模块设计

## 1. 背景与目标

### 背景

AI 应用质量保障需要覆盖 RAG 全链路测试：
> 开展 RAG 全链路测试，覆盖文档解析、切分、索引、召回、重排、上下文构建及答案生成。

当前 `ai-lab/ai-testing-platform/` 覆盖 LLM 评测、代码扫描、测试生成等能力，但不包含 RAG 管道测试。

### 目标

在 `ai-lab/ai-testing-platform/` 中新增 `src/rag_tester/` 模块，以 mock 实现覆盖 RAG 全链路 7 个阶段，每阶段可独立测试，支持端到端 pipeline 验证。

### 约束

- 无需真实 LLM 或向量数据库，全部 mock 实现
- 兼容现有项目结构、代码风格（dataclass、枚举、pytest class 组织）
- Python 3.9+，line-length 120
- 2-3 天完成

---

## 2. 目录结构

```
ai-lab/ai-testing-platform/
├── src/
│   └── rag_tester/
│       ├── __init__.py
│       ├── document_parser.py    # Stage 1: 文档解析
│       ├── chunker.py            # Stage 2: 分块策略
│       ├── indexer.py            # Stage 3: 向量索引
│       ├── retriever.py          # Stage 4: 检索
│       ├── reranker.py           # Stage 5: 重排序
│       ├── context_builder.py    # Stage 6: 上下文构建
│       ├── answer_generator.py   # Stage 7: 答案生成
│       └── pipeline.py           # 全链路 E2E
└── tests/
    └── test_rag_tester/
        ├── __init__.py
        ├── conftest.py
        ├── test_document_parser.py
        ├── test_chunker.py
        ├── test_indexer.py
        ├── test_retriever.py
        ├── test_reranker.py
        ├── test_context_builder.py
        ├── test_answer_generator.py
        └── test_pipeline.py
```

---

## 3. 各阶段设计

### Stage 1: 文档解析（DocumentParser）

**职责**：将原始文件转换为结构化文档对象。

**Mock 行为**：按文件扩展名返回预设内容，不依赖真实文件 IO。

**数据模型**：
```python
@dataclass
class ParsedDocument:
    source: str          # 文件路径或名称
    content: str         # 提取的文本内容
    metadata: dict       # 格式、编码、页数等元信息
    format: str          # "pdf" | "docx" | "txt" | "html" | "md"
```

**核心接口**：
```python
class DocumentParser:
    SUPPORTED_FORMATS = {"pdf", "docx", "txt", "html", "md"}

    def parse(self, source: str, content: str = "", encoding: str = "utf-8") -> ParsedDocument
    def parse_batch(self, sources: list[str]) -> list[ParsedDocument]
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-PARSE-001 | 解析 PDF 文档 | format=="pdf"，content 非空 |
| TC-RAG-PARSE-002 | 解析 DOCX 文档 | metadata 含页数 |
| TC-RAG-PARSE-003 | 解析 TXT 文档 | content 与输入一致 |
| TC-RAG-PARSE-004 | 解析 HTML 文档 | 标签被剥离 |
| TC-RAG-PARSE-005 | 空文件 | content==""，不抛异常 |
| TC-RAG-PARSE-006 | 不支持格式（.xyz） | 抛 `ParseError` |
| TC-RAG-PARSE-007 | 批量解析 3 个文件 | 返回列表长度==3 |

---

### Stage 2: 分块策略（Chunker）

**职责**：将长文本按 size/overlap 策略切割为 chunks。

**数据模型**：
```python
@dataclass
class Chunk:
    index: int
    text: str
    start_char: int
    end_char: int
    metadata: dict
```

**核心接口**：
```python
class Chunker:
    def __init__(self, chunk_size: int = 512, overlap: int = 64)
    def chunk(self, document: ParsedDocument) -> list[Chunk]
    def chunk_text(self, text: str) -> list[Chunk]
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-CHUNK-001 | 标准分块 | 每个 chunk 长度 ≤ chunk_size |
| TC-RAG-CHUNK-002 | overlap 生效 | 相邻 chunk 有重叠字符 |
| TC-RAG-CHUNK-003 | 空文档 | 返回空列表，不抛异常 |
| TC-RAG-CHUNK-004 | 文本短于 chunk_size | 返回单个 chunk |
| TC-RAG-CHUNK-005 | overlap ≥ chunk_size | 抛 `ChunkError` |
| TC-RAG-CHUNK-006 | start/end_char 连续性 | chunks 覆盖全部原始文本 |

---

### Stage 3: 向量索引（VectorIndexer）

**职责**：将 chunks 编码为向量并存入内存索引。

**Mock 行为**：用简单哈希函数生成伪向量（固定维度 384），内存 dict 存储。

**数据模型**：
```python
@dataclass
class IndexedChunk:
    chunk_id: str
    chunk: Chunk
    vector: list[float]   # 长度 384
    indexed_at: float     # timestamp
```
```python
from typing import Optional

class VectorIndexError(Exception): pass
```

**核心接口**：
```python
class VectorIndexer:
    VECTOR_DIM = 384

    def __init__(self)
    def index(self, chunks: list[Chunk]) -> list[IndexedChunk]
    def index_one(self, chunk: Chunk) -> IndexedChunk
    def get(self, chunk_id: str) -> Optional[IndexedChunk]
    def clear(self) -> None
    @property
    def size(self) -> int
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-IDX-001 | 索引单个 chunk | vector 长度==384，chunk_id 非空 |
| TC-RAG-IDX-002 | 批量索引 | size 递增 |
| TC-RAG-IDX-003 | 向量维度一致 | 所有向量 len==384 |
| TC-RAG-IDX-004 | 重复 chunk_id | 覆盖旧值（去重） |
| TC-RAG-IDX-005 | 空列表输入 | 返回空列表，size 不变 |
| TC-RAG-IDX-006 | clear() 后 size==0 | size==0 |

---

### Stage 4: 检索（Retriever）

**职责**：给定 query，从索引中检索最相关的 top-k chunks。

**Mock 行为**：query 转伪向量后，对所有 IndexedChunk 计算余弦相似度，取 top-k。

**数据模型**：
```python
@dataclass
class RetrievalResult:
    chunk: Chunk
    score: float    # 0.0 ~ 1.0
    rank: int
```

**核心接口**：
```python
class Retriever:
    def __init__(self, indexer: VectorIndexer)
    def retrieve(self, query: str, top_k: int = 5) -> list[RetrievalResult]
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-RET-001 | 检索返回 top-k | len(results)==top_k |
| TC-RAG-RET-002 | 结果按 score 降序 | results[0].score ≥ results[-1].score |
| TC-RAG-RET-003 | score 在 [0,1] 范围 | all(0 ≤ r.score ≤ 1) |
| TC-RAG-RET-004 | rank 从 1 开始连续 | ranks==[1,2,...,k] |
| TC-RAG-RET-005 | k > 索引大小 | 返回所有已索引 chunks |
| TC-RAG-RET-006 | k==0 | 返回空列表，不抛异常 |
| TC-RAG-RET-007 | 空索引 | 返回空列表 |

---

### Stage 5: 重排序（Reranker）

**职责**：对检索结果按关键词密度进行二次排序，提升相关性。

**Mock 行为**：统计 query 关键词在 chunk 中出现次数，重新计算得分。

**核心接口**：
```python
class Reranker:
    def rerank(self, query: str, results: list[RetrievalResult]) -> list[RetrievalResult]
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-RNK-001 | 高频关键词 chunk 排名提升 | 含关键词的 chunk rank < 不含的 |
| TC-RAG-RNK-002 | 重排后 score 重新计算 | 重排 score 与原始不同 |
| TC-RAG-RNK-003 | 空候选集 | 返回空列表 |
| TC-RAG-RNK-004 | 单结果 | 直接返回，rank==1 |
| TC-RAG-RNK-005 | 排序稳定性 | 相同得分 chunk 保持原相对顺序 |

---

### Stage 6: 上下文构建（ContextBuilder）

**职责**：将 reranked chunks 拼接为 prompt 上下文，遵守 token 上限。

**Mock 行为**：按词数估算 token（1 词≈1.3 token），超出上限时截断。

**数据模型**：
```python
@dataclass
class Context:
    text: str
    token_count: int
    chunk_count: int
    truncated: bool
```

**核心接口**：
```python
class ContextBuilder:
    def __init__(self, max_tokens: int = 2048, separator: str = "\n\n")
    def build(self, results: list[RetrievalResult]) -> Context
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-CTX-001 | 正常拼接 | text 包含所有 chunk 内容 |
| TC-RAG-CTX-002 | token 超限截断 | token_count ≤ max_tokens，truncated==True |
| TC-RAG-CTX-003 | 未截断时 truncated==False | truncated==False |
| TC-RAG-CTX-004 | separator 正确插入 | separator 出现 chunk_count-1 次 |
| TC-RAG-CTX-005 | 空结果列表 | text==""，chunk_count==0 |

---

### Stage 7: 答案生成（AnswerGenerator）

**职责**：基于上下文生成答案，验证忠实度和幻觉。

**Mock 行为**：从上下文中提取关键句作为答案；幻觉检测验证答案词汇是否来自上下文。

**数据模型**：
```python
@dataclass
class GeneratedAnswer:
    answer: str
    faithfulness_score: float   # 0.0~1.0，答案词来自上下文的比例
    relevance_score: float      # 0.0~1.0，答案与 query 的关键词重叠
    has_hallucination: bool     # 是否存在上下文外词汇
    metadata: dict
```

**核心接口**：
```python
class AnswerGenerator:
    def generate(self, query: str, context: Context) -> GeneratedAnswer
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-ANS-001 | 正常生成 | answer 非空，faithfulness_score > 0 |
| TC-RAG-ANS-002 | 忠实度检测 | faithfulness_score ∈ [0,1] |
| TC-RAG-ANS-003 | 相关性检测 | 答案含 query 关键词时 relevance_score > 0.5 |
| TC-RAG-ANS-004 | 幻觉检测（无幻觉） | has_hallucination==False |
| TC-RAG-ANS-005 | 空上下文 | answer 为空或拒答，不抛异常 |
| TC-RAG-ANS-006 | 空 query | 正常返回，不抛异常 |
| TC-RAG-ANS-007 | 注入上下文外词汇 | has_hallucination==True |

---

### E2E Pipeline（RAGPipeline）

**职责**：串联全部 7 个阶段，支持单阶段失败定位。

**核心接口**：
```python
from typing import Optional

@dataclass
class PipelineResult:
    answer: GeneratedAnswer
    stage_outputs: dict     # 各阶段中间输出，键为阶段名
    success: bool
    failed_stage: Optional[str]

class RAGPipeline:
    def __init__(self, parser, chunker, indexer, retriever, reranker, builder, generator)
    def run(self, source: str, query: str) -> PipelineResult
```

**测试用例**：

| TC | 描述 | 断言 |
|----|------|------|
| TC-RAG-E2E-001 | 完整链路正常运行 | success==True，answer 非空 |
| TC-RAG-E2E-002 | 各阶段中间输出可访问 | stage_outputs 包含全部 7 个键 |
| TC-RAG-E2E-003 | 解析阶段失败定位 | failed_stage=="document_parser" |
| TC-RAG-E2E-004 | 空文档输入 | 链路优雅降级，不崩溃 |

---

## 4. 新增 pytest markers

在 `pytest.ini` 中新增：

```ini
rag            # RAG 全链路测试
rag_parse      # 文档解析
rag_chunk      # 分块策略
rag_index      # 向量索引
rag_retrieve   # 检索
rag_rerank     # 重排序
rag_context    # 上下文构建
rag_answer     # 答案生成
rag_pipeline   # 端到端
```

---

## 5. CI 更新

`ai-testing-ci.yml` 新增步骤，在 `unit-tests` job 中运行 RAG 专项：

```yaml
- name: Run RAG tester tests
  working-directory: ai-lab/ai-testing-platform
  run: pytest tests/test_rag_tester/ -v -m "rag and not integration" --cov=src/rag_tester --cov-fail-under=80
```

---

## 6. 预估测试数量

| 模块 | 用例数 |
|------|--------|
| document_parser | 7 |
| chunker | 6 |
| indexer | 6 |
| retriever | 7 |
| reranker | 5 |
| context_builder | 5 |
| answer_generator | 7 |
| pipeline (E2E) | 4 |
| **合计** | **47** |

---

## 7. 验收标准

- [ ] 47 个测试用例全部通过 `pytest tests/test_rag_tester/ -v`
- [ ] `pytest --cov=src/rag_tester` 覆盖率 ≥ 80%
- [ ] `ruff check src/rag_tester/ tests/test_rag_tester/` 无错误
- [ ] `black --check` 格式通过
- [ ] CI workflow 绿灯
