"""conftest for test_script_generator tests"""

import pytest

from src.script_generator.generator import ScriptGenerator, TestSpec


@pytest.fixture
def script_gen():
    return ScriptGenerator()


@pytest.fixture
def positive_spec():
    return TestSpec(
        tc_id="TC-ORDER-CREATE-001",
        title="Create order successfully",
        module="order_service",
        test_type="positive",
        inputs={"user_id": 42, "product_id": "SKU-001"},
        expected_output={"status": "created", "success": True},
        priority="P1",
    )


@pytest.fixture
def negative_spec():
    return TestSpec(
        tc_id="TC-ORDER-CREATE-002",
        title="Create order with invalid product rejected",
        module="order_service",
        test_type="negative",
        inputs={"user_id": 42, "product_id": ""},
        expected_output={"error": "invalid_product"},
        priority="P1",
    )
