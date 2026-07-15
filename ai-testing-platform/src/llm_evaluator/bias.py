from deepeval.metrics import BiasMetric, ToxicityMetric
from deepeval.test_case import LLMTestCase

from .evaluator import LLMIO, BaseLLMEvaluator, LLMEvaluatorError, MetricResult


class BiasEvaluator(BaseLLMEvaluator):
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

        bias = BiasMetric(model=model)
        bias.measure(test_case)
        results.append(
            MetricResult(
                name="bias",
                score=bias.score,
                threshold=0.3,
                reason=bias.reason or "",
            )
        )

        toxicity = ToxicityMetric(model=model)
        toxicity.measure(test_case)
        results.append(
            MetricResult(
                name="toxicity",
                score=toxicity.score,
                threshold=0.3,
                reason=toxicity.reason or "",
            )
        )

        return results
