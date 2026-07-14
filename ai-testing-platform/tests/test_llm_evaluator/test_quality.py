import os

import pytest

from src.llm_evaluator import LLMIO, LLMEvaluatorError


class TestQualityUnit:
    def test_import_quality_evaluator(self):
        from src.llm_evaluator import QualityEvaluator

        evaluator = QualityEvaluator()
        assert evaluator is not None

    def test_evaluate_raises_without_api_key(self, sample_llm_io):
        from src.llm_evaluator import QualityEvaluator

        evaluator = QualityEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            evaluator.evaluate(sample_llm_io)

    def test_evaluate_raises_on_empty_input(self):
        from src.llm_evaluator import QualityEvaluator

        evaluator = QualityEvaluator()
        with pytest.raises(LLMEvaluatorError, match="OPENAI_API_KEY not set"):
            evaluator.evaluate(LLMIO(input="", actual_output=""))


@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key")
class TestQualityLLM:
    def test_import_llm(self):
        from src.llm_evaluator import QualityEvaluator

        assert QualityEvaluator

    def test_correct_output_returns_metrics(self, sample_llm_io):
        from src.llm_evaluator import QualityEvaluator

        e = QualityEvaluator()
        results = e.evaluate(sample_llm_io)
        assert len(results) >= 2
        names = {r.name for r in results}
        assert "g_eval_correctness" in names
        assert "answer_relevancy" in names

    def test_correct_output_high_scores(self, sample_llm_io):
        from src.llm_evaluator import QualityEvaluator

        e = QualityEvaluator()
        results = e.evaluate(sample_llm_io)
        for r in results:
            assert 0.0 <= r.score <= 1.0

    def test_quality_adds_contextual_precision_with_context(self, sample_llm_io):
        from src.llm_evaluator import QualityEvaluator

        e = QualityEvaluator()
        results = e.evaluate(sample_llm_io)
        cp = [r for r in results if r.name == "contextual_precision"]
        assert len(cp) == 1

    def test_quality_results_contain_reason(self, sample_llm_io):
        from src.llm_evaluator import QualityEvaluator

        e = QualityEvaluator()
        results = e.evaluate(sample_llm_io)
        for r in results:
            assert r.reason, f"{r.name} missing reason"
