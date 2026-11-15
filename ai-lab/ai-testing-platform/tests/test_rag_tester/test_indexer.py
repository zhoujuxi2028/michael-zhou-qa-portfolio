"""TC-RAG-IDX-*: VectorIndexer unit tests."""

import pytest

from src.rag_tester import Chunk, VectorIndexer


@pytest.mark.rag
@pytest.mark.rag_index
class TestVectorIndexer:
    def test_index_one(self):
        """TC-RAG-IDX-001: single index returns 384-dim vector and non-empty id."""
        idx = VectorIndexer()
        ic = idx.index_one(Chunk(index=0, text="hello world", start_char=0, end_char=11))
        assert len(ic.vector) == 384
        assert ic.chunk_id

    def test_batch_index_increments_size(self):
        """TC-RAG-IDX-002: batch index increases size."""
        idx = VectorIndexer()
        chunks = [
            Chunk(index=0, text="alpha", start_char=0, end_char=5),
            Chunk(index=1, text="beta", start_char=10, end_char=14),
        ]
        idx.index(chunks)
        assert idx.size == 2

    def test_vector_dim_consistent(self):
        """TC-RAG-IDX-003: all vectors have length 384."""
        idx = VectorIndexer()
        idx.index(
            [
                Chunk(index=0, text="alpha", start_char=0, end_char=5),
                Chunk(index=1, text="beta", start_char=10, end_char=14),
                Chunk(index=2, text="gamma", start_char=20, end_char=25),
            ]
        )
        assert all(len(ic.vector) == 384 for ic in idx.all_chunks())

    def test_duplicate_chunk_id_overwrites(self):
        """TC-RAG-IDX-004: same chunk id overwrites (dedupe)."""
        idx = VectorIndexer()
        idx.index_one(Chunk(index=0, text="first", start_char=0, end_char=5))
        idx.index_one(Chunk(index=0, text="second", start_char=0, end_char=5))
        assert idx.size == 1
        assert idx.all_chunks()[0].chunk.text == "second"

    def test_empty_list(self):
        """TC-RAG-IDX-005: empty list returns empty, size unchanged."""
        idx = VectorIndexer()
        assert idx.index([]) == []
        assert idx.size == 0

    def test_clear(self):
        """TC-RAG-IDX-006: clear resets size to 0."""
        idx = VectorIndexer()
        idx.index([Chunk(index=0, text="alpha", start_char=0, end_char=5)])
        idx.clear()
        assert idx.size == 0
