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
        cyclomatic_complexity=22.0,
        lines_of_code=750,
        code_churn=28,
        test_coverage=40.0,
        bug_history=7,
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
