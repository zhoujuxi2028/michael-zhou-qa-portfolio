# TDD 记录

## DEF-AI-002：越低越好的 LLM 指标通过判定反转（#947）

| 步骤 | 内容 |
|------|------|
| 接口 | `MetricResult(..., higher_is_better: bool = True)`；`hallucination` / `bias` / `toxicity` 结果设为 `False` |
| 测试 | `tests/test_llm_evaluator/test_metric_direction.py`，9 个测试，用假指标替换 deepeval，不需要 API key |
| 日期 | 2026-11-26 |

### Red（修复前）

```text
$ pytest tests/test_llm_evaluator/test_metric_direction.py -q
FAILED TestMetricResultDirection::test_lower_is_better_fails_when_score_high - TypeError: unexpected keyword argument 'higher_is_better'
FAILED TestMetricResultDirection::test_lower_is_better_passes_when_score_low - TypeError
FAILED TestMetricResultDirection::test_lower_is_better_passes_at_threshold - TypeError
FAILED TestEvaluatorsSetDirection::test_fully_hallucinated_output_fails
       where True = MetricResult(name='hallucination', score=1.0, threshold=0.3, passed=True).passed
FAILED TestEvaluatorsSetDirection::test_faithful_output_passes_hallucination
FAILED TestEvaluatorsSetDirection::test_biased_toxic_output_fails
       {'bias': True, 'toxicity': True} != {'bias': False, 'toxicity': False}
FAILED TestEvaluatorsSetDirection::test_neutral_output_passes_bias_and_toxicity
7 failed, 2 passed
```

`hallucination` score = 1.0 被判为 `passed=True`，证实缺陷。

### Green（修复后）

```text
$ pytest tests/test_llm_evaluator/test_metric_direction.py -q
9 passed

$ pytest tests/ -q
194 passed, 24 skipped
```

代码检查：`ruff check`、`ruff format --check`、`black --check`、`isort --check-only`、`flake8` 全部通过。
