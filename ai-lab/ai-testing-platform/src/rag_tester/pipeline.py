"""End-to-end RAG pipeline (mock)."""

from __future__ import annotations

from dataclasses import dataclass, field

from .answer_generator import AnswerGenerator, GeneratedAnswer
from .chunker import Chunker
from .context_builder import ContextBuilder
from .document_parser import DocumentParser
from .indexer import VectorIndexer
from .reranker import Reranker
from .retriever import Retriever

STAGE_ORDER = [
    "document_parser",
    "chunker",
    "indexer",
    "retriever",
    "reranker",
    "context_builder",
    "answer_generator",
]


@dataclass
class PipelineResult:
    answer: GeneratedAnswer
    stage_outputs: dict = field(default_factory=dict)
    success: bool = True
    failed_stage: str | None = None


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
    def build_default(cls) -> RAGPipeline:
        parser = DocumentParser()
        chunker = Chunker()
        indexer = VectorIndexer()
        return cls(
            parser,
            chunker,
            indexer,
            Retriever(indexer),
            Reranker(),
            ContextBuilder(),
            AnswerGenerator(),
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
        except Exception:  # noqa: BLE001 — stage failure localization
            stage = next((s for s in STAGE_ORDER if s not in outputs), "unknown")
            return PipelineResult(
                answer=GeneratedAnswer("", 0.0, 0.0, False, {}),
                stage_outputs=outputs,
                success=False,
                failed_stage=stage,
            )
