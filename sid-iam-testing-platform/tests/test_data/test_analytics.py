import json
import logging

import pytest

from src.mock_services.analytics_engine import AnalyticsError

logger = logging.getLogger(__name__)


@pytest.mark.data
class TestAnalyticsDashboard:
    @pytest.mark.P0
    def test_dashboard_api(self, analytics_engine, sample_schema):
        """TC-DATA-ANA-001: 仪表板 API 调用"""
        logger.info("TC-DATA-ANA-001: Testing dashboard API call")
        analytics_engine.create_dashboard(
            "dash-001",
            "Student Dashboard",
            {
                "total_students": "SELECT COUNT(*) as cnt FROM students",
            },
        )
        result = analytics_engine.get_dashboard("dash-001")
        assert result["dashboard"]["title"] == "Student Dashboard"
        assert "total_students" in result["results"]

    @pytest.mark.P0
    def test_aggregation_correctness(self, analytics_engine, sample_data):
        """TC-DATA-ANA-002: 聚合计算正确性"""
        logger.info("TC-DATA-ANA-002: Testing aggregation correctness")
        result = analytics_engine.aggregate(sample_data, "department", "score", "sum")
        cs = [r for r in result if r["department"] == "CS"]
        assert cs[0]["sum_score"] == 263
        avg_result = analytics_engine.aggregate(sample_data, "department", "score", "avg")
        math = [r for r in avg_result if r["department"] == "Math"]
        assert math[0]["avg_score"] == 85.0

    @pytest.mark.P0
    def test_data_export(self, analytics_engine, sample_data):
        """TC-DATA-ANA-003: 数据导出（CSV/JSON）"""
        logger.info("TC-DATA-ANA-003: Testing data export")
        csv_output = analytics_engine.export_csv(sample_data)
        assert "department" in csv_output
        assert "CS" in csv_output
        lines = csv_output.strip().split("\n")
        assert len(lines) == 6
        json_output = analytics_engine.export_json(sample_data)
        parsed = json.loads(json_output)
        assert len(parsed) == 5


@pytest.mark.data
class TestAnalyticsAdvanced:
    @pytest.mark.P1
    def test_time_series_aggregation(self, analytics_engine, sample_data):
        """TC-DATA-ANA-004: 时间序列聚合"""
        logger.info("TC-DATA-ANA-004: Testing time series aggregation")
        result = analytics_engine.time_series_aggregate(sample_data, "date", "score", "month")
        assert len(result) >= 2
        jan = [r for r in result if r["period"] == "2024-01"]
        assert jan[0]["count"] == 2

    @pytest.mark.P1
    def test_cross_dimension_analysis(self, analytics_engine, sample_data):
        """TC-DATA-ANA-005: 多维度交叉分析"""
        logger.info("TC-DATA-ANA-005: Testing cross-dimension analysis")
        result = analytics_engine.cross_dimension_analysis(sample_data, ["department", "date"], "score")
        assert len(result) >= 3
        for entry in result:
            assert "department" in entry
            assert "date" in entry
            assert "sum" in entry

    @pytest.mark.P1
    def test_permission_filtering(self, analytics_engine, sample_schema):
        """TC-DATA-ANA-006: 权限过滤（用户只看授权数据）"""
        logger.info("TC-DATA-ANA-006: Testing permission-based data filtering")
        analytics_engine.create_dashboard("dash-restricted", "Restricted", {"q": "SELECT * FROM students"})
        analytics_engine.set_permission("blocked_user", "dash-restricted", False)
        with pytest.raises(AnalyticsError, match="Access denied"):
            analytics_engine.get_dashboard("dash-restricted", user_id="blocked_user")
        result = analytics_engine.get_dashboard("dash-restricted", user_id="allowed_user")
        assert result is not None

    @pytest.mark.P2
    def test_large_data_pagination(self, analytics_engine):
        """TC-DATA-ANA-007: 大数据量分页"""
        logger.info("TC-DATA-ANA-007: Testing large data pagination")
        big_data = [{"id": i, "value": i * 10} for i in range(100)]
        page1 = analytics_engine.paginate(big_data, page=1, page_size=10)
        assert len(page1["data"]) == 10
        assert page1["total"] == 100
        assert page1["total_pages"] == 10
        page10 = analytics_engine.paginate(big_data, page=10, page_size=10)
        assert len(page10["data"]) == 10

    @pytest.mark.P2
    def test_empty_dataset_handling(self, analytics_engine):
        """TC-DATA-ANA-008: 空数据集边界处理"""
        logger.info("TC-DATA-ANA-008: Testing empty dataset handling")
        result = analytics_engine.aggregate([], "key", "value", "sum")
        assert result == []
        csv = analytics_engine.export_csv([])
        assert csv == ""
        page = analytics_engine.paginate([], page=1, page_size=10)
        assert page["data"] == []
        assert page["total"] == 0
