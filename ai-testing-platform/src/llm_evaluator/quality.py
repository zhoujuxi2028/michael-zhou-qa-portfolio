from deepeval.metrics import AnswerRelevancyMetric, ContextualPrecisionMetric, GEval
from deepeval.test_case import LLMTestCase

from .evaluator import LLMIO, BaseLLMEvaluator, LLMEvaluatorError, MetricResult


class QualityEvaluator(BaseLLMEvaluator):
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

        g_eval = GEval(
            name="Correctness",
            criteria="Determine if the actual output is correct based on the expected output",
            evaluation_steps=["Check if output matches the expected answer"],
            model=model,
        )
        g_eval.measure(test_case)
        results.append(
            MetricResult(
                name="g_eval_correctness",
                score=g_eval.score,
                threshold=0.5,
                reason=g_eval.reason or "",
            )
        )

        ar = AnswerRelevancyMetric(model=model)
        ar.measure(test_case)
        results.append(
            MetricResult(
                name="answer_relevancy",
                score=ar.score,
                threshold=0.7,
                reason=ar.reason or "",
            )
        )

        if io.context:
            cp = ContextualPrecisionMetric(model=model)
            cp.measure(test_case)
            results.append(
                MetricResult(
                    name="contextual_precision",
                    score=cp.score,
                    threshold=0.5,
                    reason=cp.reason or "",
                )
            )

        return results
