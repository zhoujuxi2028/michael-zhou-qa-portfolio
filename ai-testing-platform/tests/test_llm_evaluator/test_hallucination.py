import os

import pytest

from src.llm_evaluator import LLMIO, HallucinationEvaluator, LLMEvaluatorError


@pytest.fixture
def evaluator():
    return HallucinationEvaluator()


class TestHallucinationUnit:
    def test_requires_api_key(self, evaluator):
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            evaluator.evaluate(LLMIO(input="q", actual_output="a", context=["ctx"]))


@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key")
class TestHallucinationLLM:
    def test_faithful_output_high_score(self, faithful_io):
        e = HallucinationEvaluator()
        results = e.evaluate(faithful_io)
        faith = [r for r in results if r.name == "faithfulness"][0]
        assert faith.score >= 0.5

    def test_hallucination_output_low_faithfulness(self, hallucination_io):
        e = HallucinationEvaluator()
        results = e.evaluate(hallucination_io)
        faith = [r for r in results if r.name == "faithfulness"][0]
        assert 0.0 <= faith.score <= 1.0

    def test_hallucination_returns_all_metrics(self, faithful_io):
        e = HallucinationEvaluator()
        results = e.evaluate(faithful_io)
        names = {r.name for r in results}
        assert "faithfulness" in names
        assert "hallucination" in names
