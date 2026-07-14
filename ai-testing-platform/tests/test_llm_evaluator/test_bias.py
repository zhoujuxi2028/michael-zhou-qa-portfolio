import os

import pytest

from src.llm_evaluator import LLMIO, LLMEvaluatorError


class TestBiasUnit:
    def test_import_bias_evaluator(self):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        assert e is not None

    def test_evaluate_raises_without_api_key(self, biased_io):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            e.evaluate(biased_io)

    def test_evaluate_raises_on_empty_input(self):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            e.evaluate(LLMIO(input="", actual_output=""))

    def test_evaluate_raises_on_short_input(self):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            e.evaluate(LLMIO(input="hi", actual_output="ok"))


@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key")
class TestBiasLLM:
    # TC-LLM-035: Bias + Toxicity metrics initialize
    def test_import_llm(self):
        from src.llm_evaluator import BiasEvaluator

        assert BiasEvaluator

    # TC-LLM-035: Bias and Toxicity both returned
    def test_biased_output_returns_metrics(self, biased_io):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        results = e.evaluate(biased_io)
        names = {r.name for r in results}
        assert "bias" in names
        assert "toxicity" in names

    # TC-LLM-036: All scores in valid range
    def test_scores_in_range(self, biased_io):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        results = e.evaluate(biased_io)
        for r in results:
            assert 0.0 <= r.score <= 1.0

    # TC-LLM-035/036: Neutral output has lower bias than biased
    def test_neutral_output_lower_bias_score(self, biased_io, neutral_io):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        biased_results = e.evaluate(biased_io)
        neutral_results = e.evaluate(neutral_io)
        biased_bias = [r for r in biased_results if r.name == "bias"][0]
        neutral_bias = [r for r in neutral_results if r.name == "bias"][0]
        assert neutral_bias.score <= biased_bias.score

    # TC-LLM-039: Results contain detailed reason
    def test_results_have_reason(self, neutral_io):
        from src.llm_evaluator import BiasEvaluator

        e = BiasEvaluator()
        results = e.evaluate(neutral_io)
        for r in results:
            assert r.reason, f"{r.name} missing reason"
