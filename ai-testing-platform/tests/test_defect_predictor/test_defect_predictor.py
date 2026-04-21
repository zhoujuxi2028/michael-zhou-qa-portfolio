"""
TC-PRD-*: DefectPredictor 单元测试
验证基于代码度量指标的缺陷风险预测引擎
"""
import logging

import pytest

from src.defect_predictor.predictor import ModuleMetrics, PredictorError, RiskLevel

logger = logging.getLogger(__name__)


@pytest.mark.prediction
class TestModuleRiskAnalysis:
    @pytest.mark.P0
    def test_high_complexity_module_is_high_risk(self, predictor):
        """TC-PRD-001: 高圈复杂度 + 低覆盖率模块应被标记为 HIGH 风险"""
        logger.info("TC-PRD-001: Testing high complexity module detection")
        metrics = ModuleMetrics(
            name="billing_engine",
            cyclomatic_complexity=28.0,
            lines_of_code=900,
            code_churn=25,
            test_coverage=30.0,
            bug_history=9,
        )

        report = predictor.analyze_module(metrics)

        assert report.risk_level == RiskLevel.HIGH
        assert report.risk_score >= 70.0
        assert report.module_name == "billing_engine"

    @pytest.mark.P0
    def test_well_tested_module_is_low_risk(self, predictor):
        """TC-PRD-002: 低复杂度 + 高覆盖率模块应被标记为低风险"""
        logger.info("TC-PRD-002: Testing low risk module detection")
        metrics = ModuleMetrics(
            name="string_utils",
            cyclomatic_complexity=2.0,
            lines_of_code=80,
            code_churn=1,
            test_coverage=96.0,
            bug_history=0,
        )

        report = predictor.analyze_module(metrics)

        assert report.risk_level in (RiskLevel.LOW, RiskLevel.MINIMAL)
        assert report.risk_score < 45.0

    @pytest.mark.P0
    def test_report_contains_all_required_fields(self, predictor, high_risk):
        """TC-PRD-003: 风险报告应包含所有必要字段"""
        logger.info("TC-PRD-003: Verifying risk report structure")
        report = predictor.analyze_module(high_risk)

        assert report.module_name
        assert report.risk_level in RiskLevel
        assert 0 <= report.risk_score <= 100
        assert isinstance(report.factors, dict)
        assert all(k in report.factors for k in ("complexity", "churn", "coverage_gap", "bug_history", "size"))
        assert isinstance(report.recommendations, list) and len(report.recommendations) > 0
        assert report.predicted_defects >= 0

    @pytest.mark.P1
    def test_recommendations_for_high_risk_module(self, predictor, high_risk):
        """TC-PRD-004: 高风险模块应生成具体改进建议"""
        logger.info("TC-PRD-004: Testing recommendations for high risk module")
        report = predictor.analyze_module(high_risk)

        assert len(report.recommendations) > 1
        # 应至少包含覆盖率或复杂度改进建议
        all_recs = " ".join(report.recommendations).lower()
        assert any(kw in all_recs for kw in ("refactor", "coverage", "review", "root cause", "freeze"))

    @pytest.mark.P1
    def test_low_risk_module_no_critical_recommendations(self, predictor, low_risk):
        """TC-PRD-005: 低风险模块建议应显示无关键问题"""
        logger.info("TC-PRD-005: Testing recommendations for low risk module")
        report = predictor.analyze_module(low_risk)

        assert len(report.recommendations) >= 1
        assert "No critical actions" in report.recommendations[0]

    @pytest.mark.P0
    def test_invalid_coverage_raises_error(self, predictor):
        """TC-PRD-006: 非法覆盖率值应抛出 PredictorError"""
        logger.info("TC-PRD-006: Testing input validation for coverage")
        invalid = ModuleMetrics(
            name="bad_module",
            cyclomatic_complexity=5.0,
            lines_of_code=200,
            code_churn=3,
            test_coverage=150.0,  # 非法：>100
            bug_history=0,
        )
        with pytest.raises(PredictorError, match="coverage"):
            predictor.analyze_module(invalid)

    @pytest.mark.P0
    def test_invalid_complexity_raises_error(self, predictor):
        """TC-PRD-007: 圈复杂度 < 1 应抛出 PredictorError"""
        invalid = ModuleMetrics(
            name="bad_module",
            cyclomatic_complexity=0.5,  # 非法：<1
            lines_of_code=100,
            code_churn=0,
            test_coverage=80.0,
            bug_history=0,
        )
        with pytest.raises(PredictorError, match="complexity"):
            predictor.analyze_module(invalid)


@pytest.mark.prediction
class TestPortfolioAnalysis:
    @pytest.mark.P0
    def test_portfolio_analysis_risk_distribution(self, predictor, high_risk, low_risk):
        """TC-PRD-008: 项目组合分析应返回正确的风险分布"""
        logger.info("TC-PRD-008: Testing portfolio risk distribution")
        medium_risk = ModuleMetrics(
            name="api_gateway",
            cyclomatic_complexity=10.0,
            lines_of_code=350,
            code_churn=10,
            test_coverage=65.0,
            bug_history=3,
        )

        result = predictor.analyze_portfolio([high_risk, medium_risk, low_risk])

        assert result["total_modules"] == 3
        assert "HIGH" in result["risk_distribution"]
        assert high_risk.name in result["high_risk_modules"]
        assert result["total_predicted_defects"] >= 0
        assert 0 <= result["average_risk_score"] <= 100

    @pytest.mark.P0
    def test_rank_modules_by_risk_descending(self, predictor, high_risk, low_risk):
        """TC-PRD-009: 模块风险排序应从高到低"""
        logger.info("TC-PRD-009: Testing module ranking by risk score")
        ranked = predictor.rank_modules_by_risk([low_risk, high_risk])

        assert len(ranked) == 2
        assert ranked[0].risk_score >= ranked[1].risk_score, "Should be sorted descending"
        assert ranked[0].module_name == high_risk.name

    @pytest.mark.P1
    def test_testing_priority_maps_high_risk_to_p0(self, predictor, high_risk, low_risk):
        """TC-PRD-010: 高风险模块应映射为 P0 测试优先级"""
        logger.info("TC-PRD-010: Testing priority mapping")
        priorities = predictor.get_testing_priority([high_risk, low_risk])

        assert len(priorities) == 2
        high_entry = next(p for p in priorities if p["module"] == high_risk.name)
        low_entry = next(p for p in priorities if p["module"] == low_risk.name)
        assert high_entry["testing_priority"] == "P0"
        assert high_entry["recommended_test_depth"] == "comprehensive"
        assert low_entry["testing_priority"] in ("P1", "P2")

    @pytest.mark.P1
    def test_empty_portfolio_raises_error(self, predictor):
        """TC-PRD-011: 空模块列表应抛出 PredictorError"""
        with pytest.raises(PredictorError, match="cannot be empty"):
            predictor.analyze_portfolio([])

    @pytest.mark.P1
    def test_risk_trend_increasing_detection(self, predictor):
        """TC-PRD-012: 风险增加趋势应被正确检测"""
        logger.info("TC-PRD-012: Testing risk trend detection")
        previous = ModuleMetrics(
            name="auth_module",
            cyclomatic_complexity=5.0,
            lines_of_code=200,
            code_churn=5,
            test_coverage=75.0,
            bug_history=1,
        )
        current = ModuleMetrics(
            name="auth_module",
            cyclomatic_complexity=20.0,  # 复杂度急增
            lines_of_code=600,
            code_churn=20,  # 变更频率翻倍
            test_coverage=45.0,  # 覆盖率下降
            bug_history=5,
        )

        trend = predictor.compare_risk_trend(current, previous)

        assert trend["trend"] == "increasing"
        assert trend["current_risk"] > trend["previous_risk"]
        assert trend["delta"] > 5

    @pytest.mark.P2
    def test_model_version_exposed(self, predictor):
        """TC-PRD-013: 模型版本信息应可访问"""
        assert predictor.model_version == "rule-based-v1.0"
