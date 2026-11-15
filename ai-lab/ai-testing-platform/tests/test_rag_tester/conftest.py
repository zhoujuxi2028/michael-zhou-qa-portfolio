"""Shared fixtures for test_rag_tester tests."""

import pytest

from src.rag_tester import Chunker, DocumentParser, VectorIndexer


@pytest.fixture
def parser() -> DocumentParser:
    return DocumentParser()


@pytest.fixture
def chunker() -> Chunker:
    return Chunker(chunk_size=64, overlap=16)


@pytest.fixture
def indexer() -> VectorIndexer:
    return VectorIndexer()
