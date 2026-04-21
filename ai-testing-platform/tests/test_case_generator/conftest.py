"""conftest for test_case_generator tests"""
import pytest

from src.case_generator.generator import TestCaseGenerator


@pytest.fixture
def generator():
    return TestCaseGenerator()
