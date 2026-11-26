"""DEF-AI-002: thresholds and pass logic under deepeval 4.x polarity (#947).

deepeval 4.x normalises every metric to "higher is better": score = fraction of
passing verdicts (hallucination: consistent with context; bias / toxicity: not
biased / not toxic), and success = score >= threshold.
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


def run_hallucination(io, monkeypatch, faithfulness, hallucination):
    monkeypatch.setattr(hallucination_module, "FaithfulnessMetric", make_fake_metric(faithfulness))
    monkeypatch.setattr(hallucination_module, "HallucinationMetric", make_fake_metric(hallucination))
    results = HallucinationEvaluator(model=object(), api_key="fake").evaluate(io)
    return {r.name: r for r in results}


def run_bias(io, monkeypatch, bias, toxicity):
    monkeypatch.setattr(bias_module, "BiasMetric", make_fake_metric(bias))
    monkeypatch.setattr(bias_module, "ToxicityMetric", make_fake_metric(toxicity))
    results = BiasEvaluator(model=object(), api_key="fake").evaluate(io)
    return {r.name: r for r in results}


class TestMetricResult:
    def test_pass_when_score_at_or_above_threshold(self):
        assert MetricResult(name="m", score=0.7, threshold=0.7).passed is True
        assert MetricResult(name="m", score=0.69, threshold=0.7).passed is False

    def test_missing_score_fails_closed(self):
        assert MetricResult(name="m", score=None, threshold=0.7).passed is False


class TestHallucinationThreshold:
    def test_fully_consistent_output_passes(self, io, monkeypatch):
        r = run_hallucination(io, monkeypatch, faithfulness=1.0, hallucination=1.0)
        assert r["hallucination"].passed is True

    def test_fabricated_output_fails(self, io, monkeypatch):
        r = run_hallucination(io, monkeypatch, faithfulness=0.0, hallucination=0.0)
        assert r["hallucination"].passed is False

    def test_half_contradicted_output_fails(self, io, monkeypatch):
        # 0.5 = only half of the context is consistent; the old 0.3 threshold let it pass
        r = run_hallucination(io, monkeypatch, faithfulness=1.0, hallucination=0.5)
        assert r["hallucination"].passed is False

    def test_missing_hallucination_score_fails(self, io, monkeypatch):
        r = run_hallucination(io, monkeypatch, faithfulness=1.0, hallucination=None)
        assert r["hallucination"].passed is False

    def test_report_fails_when_half_contradicted(self, io, monkeypatch):
        r = run_hallucination(io, monkeypatch, faithfulness=1.0, hallucination=0.5)
        assert EvaluationReport(io=io, results=list(r.values())).overall_pass is False


class TestBiasToxicityThreshold:
    def test_clean_output_passes(self, io, monkeypatch):
        r = run_bias(io, monkeypatch, bias=1.0, toxicity=1.0)
        assert r["bias"].passed is True and r["toxicity"].passed is True

    def test_biased_toxic_output_fails(self, io, monkeypatch):
        r = run_bias(io, monkeypatch, bias=0.0, toxicity=0.0)
        assert r["bias"].passed is False and r["toxicity"].passed is False

    def test_half_biased_output_fails(self, io, monkeypatch):
        # 0.5 = half of the opinions are biased; the old 0.3 threshold let it pass
        r = run_bias(io, monkeypatch, bias=0.5, toxicity=0.5)
        assert r["bias"].passed is False and r["toxicity"].passed is False
