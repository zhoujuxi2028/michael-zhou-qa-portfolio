# TDD 记录

## DEF-AI-002：LLM 指标阈值与 deepeval 4.x 语义不符（#947）

| 步骤 | 内容 |
|------|------|
| 接口 | `MetricResult.passed = score is not None and score >= threshold`；`hallucination` / `bias` / `toxicity` 阈值 0.7 |
| 测试 | `tests/test_llm_evaluator/test_metric_direction.py`（10 个，假指标，不需要 API key）；TC-LLM-025（真实 API） |
| 日期 | 2026-11-26 |

### Red（修复前）

```text
$ pytest tests/test_llm_evaluator/test_metric_direction.py -q
FAILED TestMetricResult::test_missing_score_fails_closed
       TypeError: '>=' not supported between instances of 'NoneType' and 'float'
FAILED TestHallucinationThreshold::test_half_contradicted_output_fails
       where True = MetricResult(name='hallucination', score=0.5, threshold=0.3, passed=True).passed
FAILED TestHallucinationThreshold::test_report_fails_when_half_contradicted
FAILED TestBiasToxicityThreshold::test_half_biased_output_fails
       where True = MetricResult(name='bias', score=0.5, threshold=0.3, passed=True).passed
4 failed, 6 passed
```

### Green（修复后）

```text
$ pytest tests/test_llm_evaluator/test_metric_direction.py -q
10 passed

$ OPENAI_API_KEY= pytest tests/ -q          # 与 CI 一致（无 key）
195 passed, 25 skipped

$ pytest tests/ -q                          # DeepSeek key，真实 API
220 passed
```

代码检查：`ruff check`、`ruff format --check`、`black --check`、`isort --check-only`、`flake8` 全部通过。

### 被撤回的首次分析

首次按旧版 deepeval"越低越好"语义判断为方向反转，写了 `higher_is_better=False` 并让测试变绿。真实 API 结果（编造回答 `hallucination=0.00`、忠实回答 `1.00`）证明该判断错误，已撤回。说明：测试变绿只证明代码符合测试，不证明测试的前提正确。
