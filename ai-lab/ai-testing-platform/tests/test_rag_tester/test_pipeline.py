"""TC-RAG-E2E-*: RAGPipeline end-to-end tests."""

import pytest

from src.rag_tester import RAGPipeline


@pytest.mark.rag
@pytest.mark.rag_pipeline
class TestRAGPipeline:
    def test_full_pipeline(self):
        """TC-RAG-E2E-001: full pipeline succeeds with non-empty answer."""
        p = RAGPipeline.build_default()
        result = p.run("sample.pdf", "retrieval testing")
        assert result.success is True
        assert result.answer.answer

    def test_stage_outputs_complete(self):
        """TC-RAG-E2E-002: stage_outputs contains all 7 stage keys."""
        p = RAGPipeline.build_default()
        result = p.run("sample.pdf", "retrieval")
        assert set(result.stage_outputs) == {
            "document_parser",
            "chunker",
            "indexer",
            "retriever",
            "reranker",
            "context_builder",
            "answer_generator",
        }

    def test_parse_failure_localized(self):
        """TC-RAG-E2E-003: parse failure reports failed_stage=document_parser."""
        p = RAGPipeline.build_default()
        result = p.run("bad.xyz", "query")
        assert result.success is False
        assert result.failed_stage == "document_parser"

    def test_empty_document_degrades(self):
        """TC-RAG-E2E-004: empty document degrades gracefully without crash."""
        p = RAGPipeline.build_default()
        result = p.run("empty.txt", "query")
        assert result.success is True
        assert result.answer.answer == ""
