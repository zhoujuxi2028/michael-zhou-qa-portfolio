import pytest

from src.quality_gate import QualityGate


@pytest.fixture
def gate():
    return QualityGate()


def test_smoke_100_percent_pass(gate):
    result = gate.check_smoke_pass_rate({"total": 5, "passed": 5})
    assert result.passed is True


def test_smoke_partial_fail(gate):
    result = gate.check_smoke_pass_rate({"total": 5, "passed": 4})
    assert result.passed is False
    assert "100%" in result.reason


def test_flaky_rate_within_threshold(gate):
    result = gate.check_flaky_rate({"total": 10, "flaky": 1})
    assert result.passed is True


def test_flaky_rate_exceeds_threshold(gate):
    result = gate.check_flaky_rate({"total": 10, "flaky": 2})
    assert result.passed is False
    assert "10%" in result.reason


def test_coverage_above_threshold(gate):
    result = gate.check_coverage(85.0)
    assert result.passed is True


def test_coverage_below_threshold(gate):
    result = gate.check_coverage(75.0)
    assert result.passed is False
    assert "80%" in result.reason


def test_coverage_exactly_at_threshold(gate):
    result = gate.check_coverage(80.0)
    assert result.passed is True
