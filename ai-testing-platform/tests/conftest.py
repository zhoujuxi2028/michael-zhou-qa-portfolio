"""根级 conftest：共享 fixtures 和 markers"""
import pytest

from src.case_generator.generator import TestCaseGenerator
from src.defect_predictor.predictor import DefectPredictor, ModuleMetrics
from src.script_generator.generator import ScriptGenerator, TestSpec


@pytest.fixture
def generator():
    return TestCaseGenerator()


@pytest.fixture
def predictor():
    return DefectPredictor()


@pytest.fixture
def script_gen():
    return ScriptGenerator()


@pytest.fixture
def high_risk_metrics():
    """高风险模块度量数据"""
    return ModuleMetrics(
        name="payment_processor",
        cyclomatic_complexity=25.0,
        lines_of_code=800,
        code_churn=30,
        test_coverage=35.0,
        bug_history=8,
    )


@pytest.fixture
def low_risk_metrics():
    """低风险模块度量数据"""
    return ModuleMetrics(
        name="utils",
        cyclomatic_complexity=2.0,
        lines_of_code=120,
        code_churn=2,
        test_coverage=92.0,
        bug_history=0,
    )


@pytest.fixture
def simple_spec():
    """基础测试用例规范 fixture"""
    return TestSpec(
        tc_id="TC-USER-CREATE-001",
        title="Create user successfully",
        module="user_service",
        test_type="positive",
        inputs={"username": "alice", "email": "alice@example.com"},
        expected_output={"status": "created", "success": True},
        priority="P1",
    )
