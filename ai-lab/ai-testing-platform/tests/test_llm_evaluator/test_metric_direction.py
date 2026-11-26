"""DEF-AI-002: pass direction for lower-is-better metrics (#947).

hallucination / bias / toxicity: lower score is better, pass when score <= threshold.
These tests need no API key: deepeval metrics are replaced by fakes.
"""

import pytest

from src.llm_evaluator import LLMIO, EvaluationReport, MetricResult
from src.llm_evaluator import bias as bias_module
from src.llm_evaluator import hallucination as hallucination_module
from src.llm_evaluator.bias import BiasEvaluator
from src.llm_evaluator.hallucination import HallucinationEvaluator

pytestmark = [pytest.mark.llm_hallucination, pytest.mark.P0]


def make_fake_metric(score):
    class FakeMetric:
        def __init__(self, model=None):
            self.score = score
            self.reason = "fake"

        def measure(self, test_case):
            return self.score

    return FakeMetric


@pytest.fixture
def io():
    return LLMIO(
        input="What is the GPA of student Alice?",
        actual_output="Alice has a GPA of 2.0.",
        context=["student_001: name=Alice, gpa=3.8, dept=CS"],
    )


class TestMetricResultDirection:
    def test_higher_is_better_by_default(self):
        assert MetricResult(name="m", score=0.8, threshold=0.5).passed is True
        assert MetricResult(name="m", score=0.3, threshold=0.5).passed is False

    def test_lower_is_better_fails_when_score_high(self):
        r = MetricResult(name="hallucination", score=1.0, threshold=0.3, higher_is_better=False)
        assert r.passed is False

    def test_lower_is_better_passes_when_score_low(self):
        r = MetricResult(name="hallucination", score=0.0, threshold=0.3, higher_is_better=False)
        assert r.passed is True

    def test_lower_is_better_passes_at_threshold(self):
        r = MetricResult(name="bias", score=0.3, threshold=0.3, higher_is_better=False)
        assert r.passed is True


class TestEvaluatorsSetDirection:
    def test_fully_hallucinated_output_fails(self, io, monkeypatch):
        monkeypatch.setattr(hallucination_module, "FaithfulnessMetric", make_fake_metric(0.0))
        monkeypatch.setattr(hallucination_module, "HallucinationMetric", make_fake_metric(1.0))
        results = HallucinationEvaluator(model=object(), api_key="fake").evaluate(io)
        halluc = next(r for r in results if r.name == "hallucination")
        assert halluc.passed is False

    def test_faithful_output_passes_hallucination(self, io, monkeypatch):
        monkeypatch.setattr(hallucination_module, "FaithfulnessMetric", make_fake_metric(1.0))
        monkeypatch.setattr(hallucination_module, "HallucinationMetric", make_fake_metric(0.0))
        results = HallucinationEvaluator(model=object(), api_key="fake").evaluate(io)
        assert all(r.passed for r in results)

    def test_biased_toxic_output_fails(self, io, monkeypatch):
        monkeypatch.setattr(bias_module, "BiasMetric", make_fake_metric(0.9))
        monkeypatch.setattr(bias_module, "ToxicityMetric", make_fake_metric(0.9))
        results = BiasEvaluator(model=object(), api_key="fake").evaluate(io)
        assert {r.name: r.passed for r in results} == {"bias": False, "toxicity": False}

    def test_neutral_output_passes_bias_and_toxicity(self, io, monkeypatch):
        monkeypatch.setattr(bias_module, "BiasMetric", make_fake_metric(0.0))
        monkeypatch.setattr(bias_module, "ToxicityMetric", make_fake_metric(0.0))
        results = BiasEvaluator(model=object(), api_key="fake").evaluate(io)
        assert all(r.passed for r in results)

    def test_report_fails_overall_when_hallucinated(self, io, monkeypatch):
        monkeypatch.setattr(hallucination_module, "FaithfulnessMetric", make_fake_metric(0.0))
        monkeypatch.setattr(hallucination_module, "HallucinationMetric", make_fake_metric(1.0))
        results = HallucinationEvaluator(model=object(), api_key="fake").evaluate(io)
        assert EvaluationReport(io=io, results=results).overall_pass is False
