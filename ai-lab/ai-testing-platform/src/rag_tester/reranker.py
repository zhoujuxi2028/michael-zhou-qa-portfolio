"""Stage 5: reranking (mock — keyword density)."""

from __future__ import annotations

import re

from .retriever import RetrievalResult


class Reranker:
    def rerank(self, query: str, results: list[RetrievalResult]) -> list[RetrievalResult]:
        if not results:
            return []
        keywords = {w.lower() for w in re.findall(r"\w+", query)}
        scored: list[tuple[RetrievalResult, float]] = []
        for r in results:
            tokens = re.findall(r"\w+", r.chunk.text.lower())
            density = sum(1 for t in tokens if t in keywords) / max(1, len(tokens))
            scored.append((r, r.score + density))
        ordered = sorted(scored, key=lambda pair: pair[1], reverse=True)
        return [
            RetrievalResult(chunk=r.chunk, score=round(new_score, 4), rank=rank)
            for rank, (r, new_score) in enumerate(ordered, start=1)
        ]
