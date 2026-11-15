"""Stage 1: document parsing (mock)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field


class ParseError(Exception):
    pass


@dataclass
class ParsedDocument:
    source: str
    content: str
    metadata: dict = field(default_factory=dict)
    format: str = "txt"


PRESET_CONTENT = {
    "txt": "",
    "md": "# Sample Document\n\nThis is markdown content for RAG testing.",
    "pdf": "This is a sample PDF document for RAG testing with retrieval relevant content.",
    "docx": "This is a sample Word document with page information.",
    "html": "<p>This is HTML content with tags for parsing.</p>",
}

PRESET_PAGES = {"pdf": 3, "docx": 2, "txt": 1, "md": 1, "html": 1}


class DocumentParser:
    SUPPORTED_FORMATS = frozenset({"pdf", "docx", "txt", "html", "md"})

    def parse(self, source: str, content: str = "", encoding: str = "utf-8") -> ParsedDocument:
        fmt = self._detect_format(source)
        if fmt not in self.SUPPORTED_FORMATS:
            raise ParseError(f"Unsupported format: {fmt}")
        if content == "":
            content = PRESET_CONTENT[fmt]
        if fmt == "html":
            content = re.sub(r"<[^>]+>", "", content)
        return ParsedDocument(
            source=source,
            content=content,
            metadata={"encoding": encoding, "format": fmt, "pages": PRESET_PAGES[fmt]},
            format=fmt,
        )

    def parse_batch(self, sources: list[str]) -> list[ParsedDocument]:
        return [self.parse(s) for s in sources]

    @staticmethod
    def _detect_format(source: str) -> str:
        if "." not in source:
            return "txt"
        ext = source.rsplit(".", 1)[-1].lower()
        return ext or "txt"
