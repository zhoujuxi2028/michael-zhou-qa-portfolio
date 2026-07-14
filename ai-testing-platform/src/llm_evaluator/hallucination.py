from deepeval.metrics import FaithfulnessMetric, HallucinationMetric
from deepeval.test_case import LLMTestCase

from .evaluator import LLMIO, BaseLLMEvaluator, LLMEvaluatorError, MetricResult


class HallucinationEvaluator(BaseLLMEvaluator):
    def evaluate(self, io: LLMIO) -> list[MetricResult]:
        if not self._has_api_key():
            raise LLMEvaluatorError("OPENAI_API_KEY not set; cannot run LLM evaluation")

        model = self._get_model()
        test_case = LLMTestCase(
            input=io.input,
            actual_output=io.actual_output,
            expected_output=io.expected_output,
            context=io.context or [],
        )

        results = []

        faithfulness = FaithfulnessMetric(model=model)
        faithfulness.measure(test_case)
        results.append(
            MetricResult(
                name="faithfulness",
                score=faithfulness.score,
                threshold=0.7,
                reason=faithfulness.reason or "",
            )
        )

        hallucination = HallucinationMetric(model=model)
        hallucination.measure(test_case)
        score = hallucination.score if hallucination.score is not None else 0.0
        results.append(
            MetricResult(
                name="hallucination",
                score=score,
                threshold=0.3,
                reason=hallucination.reason or "",
            )
        )

        return results
