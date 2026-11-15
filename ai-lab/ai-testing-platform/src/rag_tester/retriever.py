"""Stage 4: retrieval (mock — cosine similarity over pseudo-vectors)."""

from __future__ import annotations

from dataclasses import dataclass

from .chunker import Chunk
from .indexer import VectorIndexer, embed_text


@dataclass
class RetrievalResult:
    chunk: Chunk
    score: float
    rank: int


class Retriever:
    def __init__(self, indexer: VectorIndexer):
        self.indexer = indexer

    def retrieve(self, query: str, top_k: int = 5) -> list[RetrievalResult]:
        if top_k <= 0 or self.indexer.size == 0:
            return []
        q_vec = embed_text(query)
        scored = [(ic, self._cosine(q_vec, ic.vector)) for ic in self.indexer.all_chunks()]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return [
            RetrievalResult(chunk=ic.chunk, score=round(score, 4), rank=i + 1)
            for i, (ic, score) in enumerate(scored[:top_k])
        ]

    @staticmethod
    def _cosine(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(y * y for y in b) ** 0.5
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)
