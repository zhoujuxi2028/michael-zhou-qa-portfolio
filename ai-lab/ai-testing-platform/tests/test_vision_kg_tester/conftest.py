"""Shared fixtures for test_vision_kg_tester tests."""

import pytest

from src.vision_kg_tester import ImageClassifier, KnowledgeGraph


@pytest.fixture
def classifier() -> ImageClassifier:
    return ImageClassifier()


@pytest.fixture
def graph() -> KnowledgeGraph:
    return KnowledgeGraph()
