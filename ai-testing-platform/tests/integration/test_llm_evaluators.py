"""LLM Evaluator integration tests — run with: pytest -m integration

Requires OPENAI_API_KEY. These tests call actual LLM APIs (DeepSeek/OpenAI).
Mapping: TC-LLM-009 ~ TC-LLM-040 from docs/TEST-CASES.md

Run locally:
    export OPENAI_API_KEY=sk-...
    pytest tests/integration/ -v -m integration

Or via script:
    bash scripts/integration-test.sh
"""

import os

import pytest

from src.llm_evaluator import BiasEvaluator, HallucinationEvaluator, QualityEvaluator

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="requires API key"),
]


# -- Quality Evaluator (TC-LLM-009 ~ TC-LLM-018) --


# TC-LLM-009: GEval correctness
# TC-LLM-011: AnswerRelevancy
def test_quality_correct_output(sample_llm_io):
    e = QualityEvaluator()
    results = e.evaluate(sample_llm_io)
    names = {r.name for r in results}
    assert "g_eval_correctness" in names
    assert "answer_relevancy" in names


# TC-LLM-013: ContextualPrecision
def test_quality_contextual_precision(sample_llm_io):
    e = QualityEvaluator()
    results = e.evaluate(sample_llm_io)
    assert any(r.name == "contextual_precision" for r in results)


# TC-LLM-014: MetricResult contains reason
def test_quality_reason(sample_llm_io):
    e = QualityEvaluator()
    results = e.evaluate(sample_llm_io)
    for r in results:
        assert r.reason


# -- Hallucination Evaluator (TC-LLM-019 ~ TC-LLM-026) --


# TC-LLM-019: Faithful output faithfulness >= 0.5
# TC-LLM-024: Both faithfulness + hallucination returned
def test_hallucination_faithful_output(faithful_io):
    e = HallucinationEvaluator()
    results = e.evaluate(faithful_io)
    names = {r.name for r in results}
    assert "faithfulness" in names
    assert "hallucination" in names
    faith = [r for r in results if r.name == "faithfulness"][0]
    assert faith.score >= 0.5


# TC-LLM-020: Hallucinated output lower faithfulness
def test_hallucination_detection(hallucination_io, faithful_io):
    e = HallucinationEvaluator()
    bad = e.evaluate(hallucination_io)
    good = e.evaluate(faithful_io)
    bad_score = [r for r in bad if r.name == "faithfulness"][0].score
    good_score = [r for r in good if r.name == "faithfulness"][0].score
    assert bad_score < good_score


# TC-LLM-024: Results have reason
def test_hallucination_reason(faithful_io):
    e = HallucinationEvaluator()
    results = e.evaluate(faithful_io)
    for r in results:
        assert r.reason


# -- Bias Evaluator (TC-LLM-035 ~ TC-LLM-040) --


# TC-LLM-035: Bias detection
# TC-LLM-037: Toxicity detection
def test_bias_biased_output(biased_io):
    e = BiasEvaluator()
    results = e.evaluate(biased_io)
    names = {r.name for r in results}
    assert "bias" in names
    assert "toxicity" in names


# TC-LLM-036: Neutral output lower bias
def test_bias_neutral_vs_biased(biased_io, neutral_io):
    e = BiasEvaluator()
    biased_results = e.evaluate(biased_io)
    neutral_results = e.evaluate(neutral_io)
    biased_bias = [r for r in biased_results if r.name == "bias"][0]
    neutral_bias = [r for r in neutral_results if r.name == "bias"][0]
    assert neutral_bias.score <= biased_bias.score


# TC-LLM-039: Results contain reason
def test_bias_reason(neutral_io):
    e = BiasEvaluator()
    results = e.evaluate(neutral_io)
    for r in results:
        assert r.reason
