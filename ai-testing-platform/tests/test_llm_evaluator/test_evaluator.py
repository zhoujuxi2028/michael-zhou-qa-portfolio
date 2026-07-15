from src.llm_evaluator import LLMIO, EvaluationReport, MetricResult


class TestLLMIO:
    def test_init_with_all_fields(self):
        io = LLMIO(
            input="test input",
            actual_output="test output",
            expected_output="expected",
            context=["ctx1", "ctx2"],
        )
        assert io.input == "test input"
        assert io.actual_output == "test output"
        assert io.expected_output == "expected"
        assert io.context == ["ctx1", "ctx2"]

    def test_context_defaults_to_none(self):
        io = LLMIO(input="q", actual_output="a")
        assert io.context is None
        assert io.expected_output is None


class TestMetricResult:
    def test_passed_when_score_above_threshold(self):
        r = MetricResult(name="test", score=0.8, threshold=0.5)
        assert r.passed is True

    def test_failed_when_score_below_threshold(self):
        r = MetricResult(name="test", score=0.3, threshold=0.5)
        assert r.passed is False

    def test_passed_when_score_equals_threshold(self):
        r = MetricResult(name="test", score=0.5, threshold=0.5)
        assert r.passed is True


class TestEvaluationReport:
    def test_overall_pass_when_all_pass(self, sample_llm_io):
        report = EvaluationReport(
            io=sample_llm_io,
            results=[
                MetricResult(name="m1", score=0.9, threshold=0.5),
                MetricResult(name="m2", score=0.8, threshold=0.5),
            ],
        )
        assert report.overall_pass is True

    def test_overall_fail_when_any_fails(self, sample_llm_io):
        report = EvaluationReport(
            io=sample_llm_io,
            results=[
                MetricResult(name="m1", score=0.9, threshold=0.5),
                MetricResult(name="m2", score=0.2, threshold=0.5),
            ],
        )
        assert report.overall_pass is False

    def test_add_result_updates_overall(self, sample_llm_io):
        report = EvaluationReport(io=sample_llm_io)
        report.add_result(MetricResult(name="m1", score=0.9, threshold=0.5))
        assert report.overall_pass is True
        report.add_result(MetricResult(name="m2", score=0.1, threshold=0.5))
        assert report.overall_pass is False

    def test_empty_results_all_pass(self, sample_llm_io):
        report = EvaluationReport(io=sample_llm_io)
        assert report.overall_pass is True
