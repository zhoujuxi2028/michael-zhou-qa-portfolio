"""TC-RAG-ANS-*: AnswerGenerator unit tests."""

import pytest

from src.rag_tester import AnswerGenerator, Context


@pytest.mark.rag
@pytest.mark.rag_answer
class TestAnswerGenerator:
    def test_normal_generation(self):
        """TC-RAG-ANS-001: normal generation returns non-empty faithful answer."""
        g = AnswerGenerator()
        ctx = Context(
            text="Paris is the capital of France. It is a large city.", token_count=10, chunk_count=1, truncated=False
        )
        ans = g.generate("capital of France", ctx)
        assert ans.answer
        assert ans.faithfulness_score > 0

    def test_faithfulness_range(self):
        """TC-RAG-ANS-002: faithfulness score within [0, 1]."""
        g = AnswerGenerator()
        ctx = Context(text="The sky is blue.", token_count=4, chunk_count=1, truncated=False)
        ans = g.generate("sky color", ctx)
        assert 0.0 <= ans.faithfulness_score <= 1.0

    def test_relevance_with_keyword(self):
        """TC-RAG-ANS-003: relevance > 0.5 when answer contains query keyword."""
        g = AnswerGenerator()
        ctx = Context(
            text="Machine learning is a subset of artificial intelligence.",
            token_count=8,
            chunk_count=1,
            truncated=False,
        )
        ans = g.generate("machine learning", ctx)
        assert ans.relevance_score > 0.5

    def test_no_hallucination(self):
        """TC-RAG-ANS-004: extractive answer has no hallucination."""
        g = AnswerGenerator()
        ctx = Context(text="The capital of France is Paris.", token_count=6, chunk_count=1, truncated=False)
        ans = g.generate("capital", ctx)
        assert ans.has_hallucination is False

    def test_empty_context(self):
        """TC-RAG-ANS-005: empty context yields empty answer."""
        g = AnswerGenerator()
        ans = g.generate("query", Context(text="", token_count=0, chunk_count=0, truncated=False))
        assert ans.answer == ""

    def test_empty_query(self):
        """TC-RAG-ANS-006: empty query returns normally without exception."""
        g = AnswerGenerator()
        ctx = Context(text="Some content here.", token_count=3, chunk_count=1, truncated=False)
        ans = g.generate("", ctx)
        assert isinstance(ans.answer, str)

    def test_injected_hallucination(self):
        """TC-RAG-ANS-007: out-of-context answer triggers hallucination."""
        g = AnswerGenerator()
        ctx = Context(text="The capital of France is Paris.", token_count=6, chunk_count=1, truncated=False)
        ans = g.generate("capital", ctx, answer="The capital of France is Atlantis.")
        assert ans.has_hallucination is True
