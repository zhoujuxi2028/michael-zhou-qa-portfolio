"""MetricsCollector 单元测试"""

from unittest.mock import MagicMock

import pytest

from tools.metrics_collector import MetricsCollector


@pytest.mark.unit
def test_wait_for_pod_count_returns_true_when_operator_condition_matches(monkeypatch):
    """当 pod 数满足比较条件时应返回 True"""
    collector = MetricsCollector()
    query = MagicMock(side_effect=[3])
    monkeypatch.setattr(collector, "query", query)
    monkeypatch.setattr("tools.metrics_collector.time.sleep", lambda _: None)

    result = collector.wait_for_pod_count(expected_count=2, comparison=">=", timeout=1, interval=0)

    assert result is True
    query.assert_called_once_with("count(app_pod_info)")


@pytest.mark.unit
def test_wait_for_pod_count_retries_until_condition_matches(monkeypatch):
    """条件未满足时应继续重试直到成功"""
    collector = MetricsCollector()
    query = MagicMock(side_effect=[1, 2])
    time_values = iter([0, 0, 0.1])
    monkeypatch.setattr(collector, "query", query)
    monkeypatch.setattr("tools.metrics_collector.logger.info", lambda *args, **kwargs: None)
    monkeypatch.setattr("tools.metrics_collector.time.sleep", lambda _: None)
    monkeypatch.setattr("tools.metrics_collector.time.time", lambda: next(time_values))

    result = collector.wait_for_pod_count(expected_count=2, comparison=">=", timeout=1, interval=0)

    assert result is True
    assert query.call_count == 2


@pytest.mark.unit
def test_wait_for_pod_count_returns_false_after_timeout(monkeypatch):
    """超时后仍未满足条件应返回 False"""
    collector = MetricsCollector()
    query = MagicMock(side_effect=[1])
    time_values = iter([0, 0, 1.1])
    monkeypatch.setattr(collector, "query", query)
    monkeypatch.setattr("tools.metrics_collector.logger.info", lambda *args, **kwargs: None)
    monkeypatch.setattr("tools.metrics_collector.logger.warning", lambda *args, **kwargs: None)
    monkeypatch.setattr("tools.metrics_collector.time.sleep", lambda _: None)
    monkeypatch.setattr("tools.metrics_collector.time.time", lambda: next(time_values))

    result = collector.wait_for_pod_count(expected_count=2, comparison=">=", timeout=1, interval=0)

    assert result is False
    query.assert_called_once_with("count(app_pod_info)")


@pytest.mark.unit
def test_wait_for_pod_count_raises_for_invalid_operator():
    """非法比较符应抛出 ValueError"""
    collector = MetricsCollector()

    with pytest.raises(ValueError, match="Invalid comparison operator"):
        collector.wait_for_pod_count(expected_count=2, comparison="!=", timeout=1, interval=0)
