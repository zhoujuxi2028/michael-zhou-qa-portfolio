"""
缺陷预测引擎
AI-Powered Defect Predictor — 基于代码度量指标预测高风险模块和潜在缺陷
"""

from dataclasses import dataclass
from enum import Enum


class PredictorError(Exception):
    pass


class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    MINIMAL = "MINIMAL"


@dataclass
class ModuleMetrics:
    """代码模块度量数据"""

    name: str
    cyclomatic_complexity: float  # 圈复杂度（≥1）
    lines_of_code: int  # 代码行数
    code_churn: int  # 代码变更频率（近 30 天提交次数）
    test_coverage: float  # 测试覆盖率 0-100
    bug_history: int  # 历史缺陷数
    dependency_count: int = 0  # 依赖数量
    last_modified_days: int = 0  # 最后修改距今天数


@dataclass
class RiskReport:
    """模块风险评估报告"""

    module_name: str
    risk_level: RiskLevel
    risk_score: float  # 0-100
    factors: dict  # 各风险因素得分
    recommendations: list  # 改进建议
    predicted_defects: int  # 预测缺陷数


# 风险因素权重（总和 = 1.0）
RISK_WEIGHTS = {
    "complexity": 0.25,
    "churn": 0.25,
    "coverage_gap": 0.20,
    "bug_history": 0.20,
    "size": 0.10,
}

# 风险等级阈值
RISK_THRESHOLDS = {
    RiskLevel.HIGH: 70,
    RiskLevel.MEDIUM: 45,
    RiskLevel.LOW: 20,
    RiskLevel.MINIMAL: 0,
}


class DefectPredictor:
    """基于代码度量指标的模块缺陷风险预测器（展示 AI 驱动缺陷预测的核心思路）"""

    def __init__(self):
        self._cache: dict = {}
        self._model_version = "rule-based-v1.0"

    @property
    def model_version(self) -> str:
        return self._model_version

    def analyze_module(self, metrics: ModuleMetrics) -> RiskReport:
        """
        分析单个模块的缺陷风险

        Args:
            metrics: 模块度量数据

        Returns:
            RiskReport: 风险评估报告

        Raises:
            PredictorError: 当度量数据非法时
        """
        self._validate_metrics(metrics)

        factors = self._calculate_factors(metrics)
        risk_score = self._calculate_risk_score(factors)
        risk_level = self._classify_risk(risk_score)
        recommendations = self._generate_recommendations(metrics, factors, risk_level)
        predicted_defects = self._estimate_defects(risk_score, metrics)

        report = RiskReport(
            module_name=metrics.name,
            risk_level=risk_level,
            risk_score=round(risk_score, 1),
            factors=factors,
            recommendations=recommendations,
            predicted_defects=predicted_defects,
        )

        self._cache[metrics.name] = report
        return report

    def analyze_portfolio(self, metrics_list: list) -> dict:
        """
        分析整个项目模块组合的风险分布

        Args:
            metrics_list: 多个模块的度量数据列表

        Returns:
            dict: 项目整体风险分析结果
        """
        if not metrics_list:
            raise PredictorError("Metrics list cannot be empty")

        reports = [self.analyze_module(m) for m in metrics_list]

        risk_distribution: dict = {level.value: [] for level in RiskLevel}
        for report in reports:
            risk_distribution[report.risk_level.value].append(report.module_name)

        high_risk = [r for r in reports if r.risk_level == RiskLevel.HIGH]
        total_predicted = sum(r.predicted_defects for r in reports)
        avg_score = sum(r.risk_score for r in reports) / len(reports)

        return {
            "total_modules": len(reports),
            "risk_distribution": risk_distribution,
            "high_risk_modules": [r.module_name for r in high_risk],
            "total_predicted_defects": total_predicted,
            "average_risk_score": round(avg_score, 1),
            "reports": reports,
        }

    def rank_modules_by_risk(self, metrics_list: list) -> list:
        """
        按风险评分对模块排序（降序）

        Returns:
            list[RiskReport]: 按风险从高到低排列的报告列表
        """
        reports = [self.analyze_module(m) for m in metrics_list]
        return sorted(reports, key=lambda r: r.risk_score, reverse=True)

    def get_testing_priority(self, metrics_list: list) -> list:
        """
        基于风险分析生成测试优先级建议

        Returns:
            list[dict]: 每个模块的测试优先级建议
        """
        ranked = self.rank_modules_by_risk(metrics_list)

        priorities = []
        for i, report in enumerate(ranked):
            if report.risk_level == RiskLevel.HIGH:
                priority_class = "P0"
                depth = "comprehensive"
            elif report.risk_level == RiskLevel.MEDIUM:
                priority_class = "P1"
                depth = "standard"
            else:
                priority_class = "P2"
                depth = "smoke"

            priorities.append(
                {
                    "rank": i + 1,
                    "module": report.module_name,
                    "risk_level": report.risk_level.value,
                    "risk_score": report.risk_score,
                    "testing_priority": priority_class,
                    "recommended_test_depth": depth,
                }
            )

        return priorities

    def compare_risk_trend(self, current: ModuleMetrics, previous: ModuleMetrics) -> dict:
        """
        比较模块风险趋势（当前 vs 历史快照）

        Returns:
            dict: 风险趋势分析（increasing / stable / decreasing）
        """
        current_report = self.analyze_module(current)
        previous_report = self.analyze_module(previous)

        delta = current_report.risk_score - previous_report.risk_score

        if delta > 5:
            trend = "increasing"
        elif delta < -5:
            trend = "decreasing"
        else:
            trend = "stable"

        return {
            "module": current.name,
            "current_risk": current_report.risk_score,
            "previous_risk": previous_report.risk_score,
            "delta": round(delta, 1),
            "trend": trend,
            "current_level": current_report.risk_level.value,
            "previous_level": previous_report.risk_level.value,
        }

    def _validate_metrics(self, metrics: ModuleMetrics):
        if metrics.cyclomatic_complexity < 1:
            raise PredictorError("Cyclomatic complexity must be >= 1")
        if not (0 <= metrics.test_coverage <= 100):
            raise PredictorError("Test coverage must be between 0 and 100")
        if metrics.lines_of_code < 0:
            raise PredictorError("Lines of code must be non-negative")
        if metrics.code_churn < 0:
            raise PredictorError("Code churn must be non-negative")
        if metrics.bug_history < 0:
            raise PredictorError("Bug history must be non-negative")

    def _calculate_factors(self, metrics: ModuleMetrics) -> dict:
        """计算各风险因素的归一化得分 (0-100)"""
        # 圈复杂度：CC 1-30 映射到 0-100（行业阈值 CC>10 为高风险，CC=30 得满分）
        complexity_score = min(100.0, max(0.0, (metrics.cyclomatic_complexity - 1) / 29 * 100))
        # 变更频率：每月超过 33 次 = 100 分（3 × churn，上限 100）
        churn_score = min(100.0, metrics.code_churn * 3.0)
        # 覆盖率缺口
        coverage_gap_score = 100.0 - metrics.test_coverage
        # 历史缺陷：10 个 = 100 分（每个缺陷权重 10）
        bug_score = min(100.0, metrics.bug_history * 10.0)
        # 代码规模：100-1000 LOC 映射到 0-100
        size_score = min(100.0, max(0.0, (metrics.lines_of_code - 100) / 900 * 100))

        return {
            "complexity": round(complexity_score, 1),
            "churn": round(churn_score, 1),
            "coverage_gap": round(coverage_gap_score, 1),
            "bug_history": round(bug_score, 1),
            "size": round(size_score, 1),
        }

    def _calculate_risk_score(self, factors: dict) -> float:
        """计算加权风险总分"""
        total = sum(factors[key] * RISK_WEIGHTS[key] for key in RISK_WEIGHTS)
        return min(100.0, total)

    def _classify_risk(self, score: float) -> RiskLevel:
        """将风险分数映射为风险等级"""
        for level, threshold in sorted(RISK_THRESHOLDS.items(), key=lambda x: x[1], reverse=True):
            if score >= threshold:
                return level
        return RiskLevel.MINIMAL

    def _estimate_defects(self, risk_score: float, metrics: ModuleMetrics) -> int:
        """估计预测缺陷数（最多 10 个）"""
        base = risk_score / 100 * 5  # 满分风险对应 5 个基础缺陷
        adjusted = base * (1 + metrics.bug_history * 0.1)  # 每个历史缺陷增加 10%（经验调整因子）
        return max(0, round(adjusted))

    def _generate_recommendations(self, metrics: ModuleMetrics, factors: dict, risk_level: RiskLevel) -> list:
        """生成针对性改进建议"""
        recs = []

        if factors["complexity"] > 60:
            recs.append(
                f"Refactor: Cyclomatic complexity {metrics.cyclomatic_complexity:.0f} exceeds threshold (10). "
                "Split into smaller functions."
            )

        if factors["churn"] > 60:
            recs.append(
                f"Code Freeze: High churn ({metrics.code_churn} changes/month). Stabilize module before next release."
            )

        if factors["coverage_gap"] > 30:
            target_tests = int((80 - metrics.test_coverage) * metrics.lines_of_code / 100)
            recs.append(
                f"Increase Coverage: Current {metrics.test_coverage:.0f}% → target 80%. "
                f"Add ~{max(0, target_tests)} lines of tests."
            )

        if factors["bug_history"] > 40:
            recs.append(
                f"Root Cause Analysis: {metrics.bug_history} historical bugs. Conduct defect clustering session."
            )

        if factors["size"] > 50:
            recs.append(
                f"Module Split: {metrics.lines_of_code} LOC exceeds recommended 500. "
                "Consider decomposing into cohesive sub-modules."
            )

        if risk_level == RiskLevel.HIGH:
            recs.append("Priority Review: Schedule mandatory code review before next release.")

        if not recs:
            recs.append("No critical actions required. Maintain current quality practices.")

        return recs
