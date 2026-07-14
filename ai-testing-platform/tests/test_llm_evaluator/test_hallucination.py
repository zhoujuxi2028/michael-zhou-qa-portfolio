import os

import pytest

from src.llm_evaluator import LLMIO, LLMEvaluatorError


class TestHallucinationUnit:
    def test_import_hallucination_evaluator(self):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        assert e is not None

    def test_evaluate_raises_without_api_key(self, faithful_io):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            e.evaluate(faithful_io)

    def test_evaluate_raises_without_context(self):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            e.evaluate(LLMIO(input="q", actual_output="a"))

    def test_evaluate_raises_on_empty_output(self):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            e.evaluate(LLMIO(input="q", actual_output="", context=["ctx"]))


@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key")
class TestHallucinationLLM:
    def test_import_llm(self):
        from src.llm_evaluator import HallucinationEvaluator

        assert HallucinationEvaluator

    def test_faithful_output_returns_metrics(self, faithful_io):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        results = e.evaluate(faithful_io)
        names = {r.name for r in results}
        assert "faithfulness" in names
        assert "hallucination" in names

    def test_faithful_output_high_faithfulness(self, faithful_io):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        results = e.evaluate(faithful_io)
        faith = [r for r in results if r.name == "faithfulness"][0]
        assert faith.score >= 0.5

    def test_hallucinated_output_lower_faithfulness(
        self, hallucination_io, faithful_io
    ):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        bad_results = e.evaluate(hallucination_io)
        good_results = e.evaluate(faithful_io)
        bad_faith = [r for r in bad_results if r.name == "faithfulness"][0]
        good_faith = [r for r in good_results if r.name == "faithfulness"][0]
        assert bad_faith.score <= good_faith.score

    def test_hallucination_results_have_reason(self, faithful_io):
        from src.llm_evaluator import HallucinationEvaluator

        e = HallucinationEvaluator()
        results = e.evaluate(faithful_io)
        for r in results:
            assert r.reason, f"{r.name} missing reason"
