"""TC-RAG-RET-*: Retriever unit tests."""

import pytest

from src.rag_tester import Chunk, Retriever, VectorIndexer


def _build_indexer(texts):
    idx = VectorIndexer()
    chunks = [Chunk(index=i, text=t, start_char=i * 50, end_char=i * 50 + len(t)) for i, t in enumerate(texts)]
    idx.index(chunks)
    return idx


@pytest.mark.rag
@pytest.mark.rag_retrieve
class TestRetriever:
    def test_top_k_count(self):
        """TC-RAG-RET-001: retrieve returns top_k results."""
        idx = _build_indexer(["alpha beta", "gamma delta", "epsilon zeta", "eta theta"])
        r = Retriever(idx)
        assert len(r.retrieve("alpha", top_k=3)) == 3

    def test_descending_score(self):
        """TC-RAG-RET-002: results sorted by score descending."""
        idx = _build_indexer(["alpha beta", "gamma delta", "epsilon zeta"])
        r = Retriever(idx)
        results = r.retrieve("alpha", top_k=3)
        assert results[0].score >= results[-1].score

    def test_score_in_range(self):
        """TC-RAG-RET-003: scores are within [0, 1]."""
        idx = _build_indexer(["alpha beta", "gamma delta"])
        r = Retriever(idx)
        for res in r.retrieve("alpha", top_k=2):
            assert 0.0 <= res.score <= 1.0

    def test_rank_continuous(self):
        """TC-RAG-RET-004: ranks start at 1 and are continuous."""
        idx = _build_indexer(["alpha", "beta", "gamma", "delta"])
        r = Retriever(idx)
        ranks = [res.rank for res in r.retrieve("alpha", top_k=3)]
        assert ranks == [1, 2, 3]

    def test_k_exceeds_index_size(self):
        """TC-RAG-RET-005: top_k larger than index returns all chunks."""
        idx = _build_indexer(["alpha", "beta"])
        r = Retriever(idx)
        assert len(r.retrieve("alpha", top_k=10)) == 2

    def test_k_zero(self):
        """TC-RAG-RET-006: top_k == 0 returns empty list."""
        idx = _build_indexer(["alpha"])
        r = Retriever(idx)
        assert r.retrieve("alpha", top_k=0) == []

    def test_empty_index(self):
        """TC-RAG-RET-007: empty index returns empty list."""
        r = Retriever(VectorIndexer())
        assert r.retrieve("alpha") == []
