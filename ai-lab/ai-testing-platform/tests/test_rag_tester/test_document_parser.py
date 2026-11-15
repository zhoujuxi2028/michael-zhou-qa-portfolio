"""TC-RAG-PARSE-*: DocumentParser unit tests."""

import pytest

from src.rag_tester import ParseError


@pytest.mark.rag
@pytest.mark.rag_parse
class TestDocumentParser:
    def test_parse_pdf(self, parser):
        """TC-RAG-PARSE-001: PDF returns format=pdf and non-empty content."""
        doc = parser.parse("manual.pdf")
        assert doc.format == "pdf"
        assert doc.content

    def test_parse_docx_metadata_pages(self, parser):
        """TC-RAG-PARSE-002: DOCX metadata includes page count."""
        doc = parser.parse("report.docx")
        assert doc.format == "docx"
        assert "pages" in doc.metadata

    def test_parse_txt_content_matches(self, parser):
        """TC-RAG-PARSE-003: TXT content equals input."""
        doc = parser.parse("notes.txt", content="hello world")
        assert doc.content == "hello world"

    def test_parse_html_strips_tags(self, parser):
        """TC-RAG-PARSE-004: HTML tags are stripped."""
        doc = parser.parse("page.html", content="<p>hi</p>")
        assert doc.content == "hi"

    def test_parse_empty_file(self, parser):
        """TC-RAG-PARSE-005: empty file returns empty content, no exception."""
        doc = parser.parse("empty.txt", content="")
        assert doc.content == ""

    def test_parse_unsupported_format(self, parser):
        """TC-RAG-PARSE-006: unsupported extension raises ParseError."""
        with pytest.raises(ParseError):
            parser.parse("data.xyz")

    def test_parse_batch(self, parser):
        """TC-RAG-PARSE-007: batch parse returns one doc per source."""
        docs = parser.parse_batch(["a.txt", "b.txt", "c.txt"])
        assert len(docs) == 3
