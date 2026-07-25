"""conftest for test_defect_predictor tests"""

import pytest

from src.defect_predictor.predictor import DefectPredictor, ModuleMetrics


@pytest.fixture
def predictor():
    return DefectPredictor()


@pytest.fixture
def high_risk():
    return ModuleMetrics(
        name="checkout",
        cyclomatic_complexity=28.0,
        lines_of_code=800,
        code_churn=30,
        test_coverage=30.0,
        bug_history=9,
    )


@pytest.fixture
def low_risk():
    return ModuleMetrics(
        name="logger",
        cyclomatic_complexity=2.0,
        lines_of_code=80,
        code_churn=1,
        test_coverage=95.0,
        bug_history=0,
    )
