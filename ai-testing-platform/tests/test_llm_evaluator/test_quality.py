import os

import pytest

from src.llm_evaluator import LLMIO, LLMEvaluatorError, QualityEvaluator


@pytest.fixture
def evaluator():
    return QualityEvaluator()


class TestQualityUnit:
    def test_requires_api_key(self, evaluator):
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            evaluator.evaluate(LLMIO(input="q", actual_output="a"))


@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key")
class TestQualityLLM:
    def test_correct_output_passes(self, sample_llm_io):
        e = QualityEvaluator()
        results = e.evaluate(sample_llm_io)
        assert results
        assert all(0.0 <= r.score <= 1.0 for r in results)
        g_eval = [r for r in results if r.name == "g_eval_correctness"][0]
        assert g_eval.passed is True

    def test_wrong_output_still_runs(self, wrong_llm_io):
        e = QualityEvaluator()
        results = e.evaluate(wrong_llm_io)
        assert results
        g_eval = [r for r in results if r.name == "g_eval_correctness"][0]
        assert g_eval.reason

    def test_quality_returns_all_expected_metrics(self, sample_llm_io):
        e = QualityEvaluator()
        results = e.evaluate(sample_llm_io)
        names = {r.name for r in results}
        assert "g_eval_correctness" in names
        assert "answer_relevancy" in names
