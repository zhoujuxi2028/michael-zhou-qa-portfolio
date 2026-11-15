"""TC-RAG-RNK-*: Reranker unit tests."""

import pytest

from src.rag_tester import Chunk, Reranker, RetrievalResult


def _result(text, score=0.5):
    chunk = Chunk(index=0, text=text, start_char=0, end_char=len(text))
    return RetrievalResult(chunk=chunk, score=score, rank=0)


@pytest.mark.rag
@pytest.mark.rag_rerank
class TestReranker:
    def test_keyword_chunk_ranks_higher(self):
        """TC-RAG-RNK-001: chunk containing query keyword ranks before others."""
        r = Reranker()
        results = [_result("unrelated content here", 0.5), _result("this mentions the target word", 0.5)]
        out = r.rerank("target", results)
        assert "target" in out[0].chunk.text

    def test_score_recomputed(self):
        """TC-RAG-RNK-002: rerank recomputes score."""
        r = Reranker()
        results = [_result("the target keyword is here", 0.5)]
        out = r.rerank("target", results)
        assert out[0].score != 0.5

    def test_empty_candidates(self):
        """TC-RAG-RNK-003: empty candidate list returns empty list."""
        r = Reranker()
        assert r.rerank("query", []) == []

    def test_single_result_rank_one(self):
        """TC-RAG-RNK-004: single result keeps rank 1."""
        r = Reranker()
        out = r.rerank("query", [_result("only one", 0.3)])
        assert len(out) == 1
        assert out[0].rank == 1

    def test_stable_sort(self):
        """TC-RAG-RNK-005: equal scores preserve original relative order."""
        r = Reranker()
        a = _result("aaa", 0.5)
        b = _result("bbb", 0.5)
        out = r.rerank("no-match", [a, b])
        assert out[0].chunk.text == "aaa"
        assert out[1].chunk.text == "bbb"
