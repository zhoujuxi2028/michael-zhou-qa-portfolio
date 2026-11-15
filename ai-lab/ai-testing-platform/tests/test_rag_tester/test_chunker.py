"""TC-RAG-CHUNK-*: Chunker unit tests."""

import pytest

from src.rag_tester import Chunker, ChunkError


@pytest.mark.rag
@pytest.mark.rag_chunk
class TestChunker:
    def test_chunk_size_limit(self):
        """TC-RAG-CHUNK-001: every chunk length <= chunk_size."""
        c = Chunker(chunk_size=10, overlap=2)
        chunks = c.chunk_text("abcdefghijklmnopqrstuvwxyz")
        assert all(len(ch.text) <= 10 for ch in chunks)

    def test_overlap_effective(self):
        """TC-RAG-CHUNK-002: adjacent chunks share overlap characters."""
        c = Chunker(chunk_size=10, overlap=2)
        chunks = c.chunk_text("abcdefghijklmnop")
        assert len(chunks) > 1
        assert chunks[0].text[-2:] == chunks[1].text[:2]

    def test_empty_text(self):
        """TC-RAG-CHUNK-003: empty text returns empty list."""
        c = Chunker(chunk_size=10, overlap=2)
        assert c.chunk_text("") == []

    def test_short_text_single_chunk(self):
        """TC-RAG-CHUNK-004: text shorter than chunk_size yields one chunk."""
        c = Chunker(chunk_size=100, overlap=10)
        chunks = c.chunk_text("short")
        assert len(chunks) == 1

    def test_overlap_ge_chunk_size_raises(self):
        """TC-RAG-CHUNK-005: overlap >= chunk_size raises ChunkError."""
        with pytest.raises(ChunkError):
            Chunker(chunk_size=10, overlap=10)

    def test_char_continuity(self):
        """TC-RAG-CHUNK-006: chunks cover the whole original text."""
        c = Chunker(chunk_size=10, overlap=3)
        text = "abcdefghijklmnopqrstuvwxyz"
        chunks = c.chunk_text(text)
        assert chunks[0].start_char == 0
        assert chunks[-1].end_char == len(text)
        for a, b in zip(chunks, chunks[1:]):
            assert b.start_char < a.end_char
