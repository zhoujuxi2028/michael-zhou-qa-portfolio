"""Stage 2: chunking strategy (mock)."""

from __future__ import annotations

from dataclasses import dataclass, field

from .document_parser import ParsedDocument


class ChunkError(Exception):
    pass


@dataclass
class Chunk:
    index: int
    text: str
    start_char: int
    end_char: int
    metadata: dict = field(default_factory=dict)


class Chunker:
    def __init__(self, chunk_size: int = 512, overlap: int = 64):
        if overlap >= chunk_size:
            raise ChunkError("overlap must be < chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, document: ParsedDocument) -> list[Chunk]:
        return self.chunk_text(document.content)

    def chunk_text(self, text: str) -> list[Chunk]:
        if not text:
            return []
        chunks: list[Chunk] = []
        start = 0
        step = self.chunk_size - self.overlap
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunks.append(Chunk(index=len(chunks), text=text[start:end], start_char=start, end_char=end))
            if end == len(text):
                break
            start += step
        return chunks
