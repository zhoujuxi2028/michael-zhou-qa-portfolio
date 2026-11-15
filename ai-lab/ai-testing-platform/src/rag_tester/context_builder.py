"""Stage 6: context building (mock — token estimate)."""

from __future__ import annotations

from dataclasses import dataclass

from .retriever import RetrievalResult


@dataclass
class Context:
    text: str
    token_count: int
    chunk_count: int
    truncated: bool


class ContextBuilder:
    TOKENS_PER_WORD = 1.3

    def __init__(self, max_tokens: int = 2048, separator: str = "\n\n"):
        self.max_tokens = max_tokens
        self.separator = separator

    def build(self, results: list[RetrievalResult]) -> Context:
        parts: list[str] = []
        total = 0.0
        truncated = False
        for r in results:
            est = len(r.chunk.text.split()) * self.TOKENS_PER_WORD
            if total + est > self.max_tokens:
                truncated = True
                break
            parts.append(r.chunk.text)
            total += est
        text = self.separator.join(parts)
        return Context(text=text, token_count=int(total), chunk_count=len(parts), truncated=truncated)
