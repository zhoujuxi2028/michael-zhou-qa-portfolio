"""TC-RAG-CTX-*: ContextBuilder unit tests."""

import pytest

from src.rag_tester import Chunk, ContextBuilder, RetrievalResult


def _result(text):
    chunk = Chunk(index=0, text=text, start_char=0, end_char=len(text))
    return RetrievalResult(chunk=chunk, score=0.5, rank=0)


@pytest.mark.rag
@pytest.mark.rag_context
class TestContextBuilder:
    def test_normal_join(self):
        """TC-RAG-CTX-001: context text contains all chunk content."""
        b = ContextBuilder(max_tokens=1000)
        ctx = b.build([_result("hello"), _result("world")])
        assert "hello" in ctx.text
        assert "world" in ctx.text

    def test_truncation(self):
        """TC-RAG-CTX-002: exceeding max_tokens truncates and marks truncated."""
        b = ContextBuilder(max_tokens=5)
        ctx = b.build([_result("this is a very long sentence")])
        assert ctx.truncated is True
        assert ctx.token_count <= 5

    def test_no_truncation_flag(self):
        """TC-RAG-CTX-003: within limit, truncated is False."""
        b = ContextBuilder(max_tokens=1000)
        ctx = b.build([_result("short text")])
        assert ctx.truncated is False

    def test_separator_count(self):
        """TC-RAG-CTX-004: separator appears chunk_count - 1 times."""
        b = ContextBuilder(max_tokens=1000, separator="\n\n")
        ctx = b.build([_result("one"), _result("two"), _result("three")])
        assert ctx.text.count("\n\n") == ctx.chunk_count - 1

    def test_empty_results(self):
        """TC-RAG-CTX-005: empty results produce empty context."""
        b = ContextBuilder()
        ctx = b.build([])
        assert ctx.text == ""
        assert ctx.chunk_count == 0
