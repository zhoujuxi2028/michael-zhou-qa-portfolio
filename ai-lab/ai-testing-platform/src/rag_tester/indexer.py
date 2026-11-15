"""Stage 3: vector indexing (mock — deterministic hash vectors)."""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field

from .chunker import Chunk

VECTOR_DIM = 384


class VectorIndexError(Exception):
    pass


@dataclass
class IndexedChunk:
    chunk_id: str
    chunk: Chunk
    vector: list[float]
    indexed_at: float = field(default_factory=time.time)


def embed_text(text: str) -> list[float]:
    """Deterministic pseudo-embedding: token presence hashed into a VECTOR_DIM vector."""
    vec = [0.0] * VECTOR_DIM
    for token in text.split():
        h = hashlib.sha256(token.lower().encode()).hexdigest()
        idx = int(h, 16) % VECTOR_DIM
        vec[idx] += 1.0
    norm = sum(v * v for v in vec) ** 0.5
    if norm == 0:
        return vec
    return [v / norm for v in vec]


class VectorIndexer:
    VECTOR_DIM = VECTOR_DIM

    def __init__(self):
        self._store: dict[str, IndexedChunk] = {}

    def index(self, chunks: list[Chunk]) -> list[IndexedChunk]:
        return [self.index_one(c) for c in chunks]

    def index_one(self, chunk: Chunk) -> IndexedChunk:
        chunk_id = self._make_id(chunk)
        indexed = IndexedChunk(chunk_id=chunk_id, chunk=chunk, vector=embed_text(chunk.text))
        self._store[chunk_id] = indexed
        return indexed

    def get(self, chunk_id: str) -> IndexedChunk | None:
        return self._store.get(chunk_id)

    def all_chunks(self) -> list[IndexedChunk]:
        return list(self._store.values())

    def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)

    @staticmethod
    def _make_id(chunk: Chunk) -> str:
        return hashlib.sha1(f"{chunk.start_char}:{chunk.end_char}".encode()).hexdigest()[:16]
