import logging

import pytest

from src.mock_services.pipeline_engine import PipelineError

logger = logging.getLogger(__name__)


@pytest.mark.data
class TestPipelineExecution:
    @pytest.mark.P0
    def test_dag_topological_sort(self, sample_pipeline):
        """TC-DATA-PIP-001: DAG 定义与拓扑排序"""
        logger.info("TC-DATA-PIP-001: Testing DAG topological sort")
        order = sample_pipeline.get_topological_order("etl_pipeline")
        assert order.index("extract") < order.index("transform")
        assert order.index("transform") < order.index("load")

    @pytest.mark.P0
    def test_sequential_execution(self, sample_pipeline):
        """TC-DATA-PIP-002: 任务顺序执行"""
        logger.info("TC-DATA-PIP-002: Testing sequential task execution")
        result = sample_pipeline.execute_pipeline("etl_pipeline")
        assert result["status"] == "completed"
        assert result["results"]["extract"]["status"] == "completed"
        assert result["results"]["transform"]["status"] == "completed"
        assert result["results"]["load"]["status"] == "completed"

    @pytest.mark.P0
    def test_task_retry(self, pipeline_engine):
        """TC-DATA-PIP-003: 任务失败重试"""
        logger.info("TC-DATA-PIP-003: Testing task failure retry")
        call_count = {"n": 0}
        def flaky_handler():
            call_count["n"] += 1
            if call_count["n"] < 2:
                raise Exception("Transient error")
            return {"ok": True}
        tasks = [{"id": "flaky", "handler": flaky_handler, "retry": 2}]
        pipeline_engine.create_pipeline("retry_test", tasks)
        result = pipeline_engine.execute_pipeline("retry_test")
        assert result["results"]["flaky"]["status"] == "completed"
        assert result["results"]["flaky"]["attempt"] == 2

    @pytest.mark.P0
    def test_data_lineage(self, sample_pipeline):
        """TC-DATA-PIP-004: 数据血缘记录"""
        logger.info("TC-DATA-PIP-004: Testing data lineage tracking")
        sample_pipeline.execute_pipeline("etl_pipeline")
        lineage = sample_pipeline.get_full_lineage("etl_pipeline")
        assert "extract" in lineage
        assert "transform" in lineage["load"]

    @pytest.mark.P1
    def test_parallel_execution(self, pipeline_engine):
        """TC-DATA-PIP-005: 并行任务执行"""
        logger.info("TC-DATA-PIP-005: Testing parallel task execution")
        tasks = [
            {"id": "source", "handler": lambda: {"data": 1}},
            {"id": "branch_a", "depends_on": ["source"], "handler": lambda: {"a": 1}},
            {"id": "branch_b", "depends_on": ["source"], "handler": lambda: {"b": 1}},
            {"id": "merge", "depends_on": ["branch_a", "branch_b"], "handler": lambda: {"merged": True}},
        ]
        pipeline_engine.create_pipeline("parallel_test", tasks)
        levels = pipeline_engine.execute_parallel_tasks("parallel_test")
        assert levels[0] == ["source"]
        assert set(levels[1]) == {"branch_a", "branch_b"}
        assert levels[2] == ["merge"]

    @pytest.mark.P1
    def test_idempotency(self, sample_pipeline):
        """TC-DATA-PIP-006: 幂等性验证（重复执行）"""
        logger.info("TC-DATA-PIP-006: Testing pipeline idempotency")
        result1 = sample_pipeline.execute_pipeline("etl_pipeline", idempotency_key="idem-001")
        result2 = sample_pipeline.execute_pipeline("etl_pipeline", idempotency_key="idem-001")
        assert result1["execution_id"] == result2["execution_id"]

    @pytest.mark.P1
    def test_circular_dependency_detection(self, pipeline_engine):
        """TC-DATA-PIP-007: 循环依赖检测"""
        logger.info("TC-DATA-PIP-007: Testing circular dependency detection")
        circular_tasks = [
            {"id": "a", "depends_on": ["c"]},
            {"id": "b", "depends_on": ["a"]},
            {"id": "c", "depends_on": ["b"]},
        ]
        assert pipeline_engine.check_circular_dependency(circular_tasks) is True
        with pytest.raises(PipelineError, match="Circular"):
            pipeline_engine.create_pipeline("bad_pipeline", circular_tasks)

    @pytest.mark.P1
    def test_task_timeout(self, pipeline_engine):
        """TC-DATA-PIP-008: 任务超时处理"""
        logger.info("TC-DATA-PIP-008: Testing task timeout handling")
        import time
        def slow_handler():
            time.sleep(0.1)
            return {"done": True}
        tasks = [{"id": "slow", "handler": slow_handler, "timeout": 0.01}]
        pipeline_engine.create_pipeline("timeout_test", tasks)
        result = pipeline_engine.execute_pipeline("timeout_test")
        assert result["results"]["slow"]["status"] == "failed"

    @pytest.mark.P2
    def test_pipeline_pause_resume(self, pipeline_engine):
        """TC-DATA-PIP-009: 管道暂停与恢复"""
        logger.info("TC-DATA-PIP-009: Testing pipeline pause and resume")
        tasks = [{"id": "step1"}, {"id": "step2", "depends_on": ["step1"]}]
        pipeline_engine.create_pipeline("pause_test", tasks)
        pipeline_engine.pause_pipeline("pause_test")
        result = pipeline_engine.execute_pipeline("pause_test")
        assert result["results"]["step1"]["status"] == "skipped"
        pipeline_engine.resume_pipeline("pause_test")
        result2 = pipeline_engine.execute_pipeline("pause_test")
        assert result2["results"]["step1"]["status"] == "completed"

    @pytest.mark.P2
    def test_cross_pipeline_dependency(self, pipeline_engine):
        """TC-DATA-PIP-010: 跨管道依赖"""
        logger.info("TC-DATA-PIP-010: Testing cross-pipeline dependency")
        pipeline_engine.create_pipeline("upstream", [{"id": "produce"}])
        pipeline_engine.create_pipeline("downstream", [{"id": "consume"}])
        pipeline_engine.add_cross_pipeline_dependency("upstream", "produce", "downstream", "consume")
        lineage = pipeline_engine.get_lineage("downstream:consume")
        assert "upstream:produce" in lineage
