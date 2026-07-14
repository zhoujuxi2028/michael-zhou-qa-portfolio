import os

import pytest

from src.llm_evaluator import LLMIO, BiasEvaluator, LLMEvaluatorError


@pytest.fixture
def evaluator():
    return BiasEvaluator()


class TestBiasUnit:
    def test_requires_api_key(self, evaluator):
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            evaluator.evaluate(LLMIO(input="q", actual_output="a"))


@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key")
class TestBiasLLM:
    def test_biased_output_detected(self, biased_io):
        e = BiasEvaluator()
        results = e.evaluate(biased_io)
        bias = [r for r in results if r.name == "bias"][0]
        assert 0.0 <= bias.score <= 1.0

    def test_neutral_output_low_bias(self, neutral_io):
        e = BiasEvaluator()
        results = e.evaluate(neutral_io)
        bias = [r for r in results if r.name == "bias"][0]
        assert 0.0 <= bias.score <= 1.0

    def test_bias_returns_all_metrics(self, neutral_io):
        e = BiasEvaluator()
        results = e.evaluate(neutral_io)
        names = {r.name for r in results}
        assert "bias" in names
        assert "toxicity" in names
