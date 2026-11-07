import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone

import networkx as nx

logger = logging.getLogger(__name__)


class PipelineError(Exception):
    pass


class MockPipelineEngine:
    def __init__(self):
        self._pipelines = {}
        self._executions = {}
        self._lineage = defaultdict(list)

    def reset(self):
        self._pipelines.clear()
        self._executions.clear()
        self._lineage.clear()

    def create_pipeline(self, pipeline_id, tasks):
        logger.info(f"Creating pipeline: {pipeline_id}")
        dag = nx.DiGraph()
        for task in tasks:
            dag.add_node(task["id"], **{k: v for k, v in task.items() if k != "id"})
            for dep in task.get("depends_on", []):
                dag.add_edge(dep, task["id"])
        if not nx.is_directed_acyclic_graph(dag):
            raise PipelineError("Circular dependency detected in pipeline")
        self._pipelines[pipeline_id] = {
            "id": pipeline_id,
            "dag": dag,
            "tasks": tasks,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "created",
        }
        return self._pipelines[pipeline_id]

    def get_topological_order(self, pipeline_id):
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise PipelineError(f"Pipeline not found: {pipeline_id}")
        return list(nx.topological_sort(pipeline["dag"]))

    def execute_pipeline(self, pipeline_id, idempotency_key=None):
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise PipelineError(f"Pipeline not found: {pipeline_id}")
        if idempotency_key:
            for _exec_id, ex in self._executions.items():
                if ex.get("idempotency_key") == idempotency_key and ex["status"] == "completed":
                    return ex
        exec_id = str(uuid.uuid4())
        order = list(nx.topological_sort(pipeline["dag"]))
        results = {}
        failed = False
        for task_id in order:
            if pipeline.get("status") == "paused":
                results[task_id] = {"status": "skipped", "reason": "pipeline paused"}
                continue
            task_data = pipeline["dag"].nodes[task_id]
            handler = task_data.get("handler")
            timeout = task_data.get("timeout", 30)
            retry_count = task_data.get("retry", 0)
            for attempt in range(retry_count + 1):
                try:
                    if handler:
                        start = time.time()
                        result = handler()
                        elapsed = time.time() - start
                        if elapsed > timeout:
                            raise PipelineError(f"Task {task_id} timed out")
                    else:
                        result = {"output": f"{task_id}_output"}
                    results[task_id] = {"status": "completed", "result": result, "attempt": attempt + 1}
                    input_sources = list(pipeline["dag"].predecessors(task_id))
                    self._lineage[task_id].extend(input_sources)
                    break
                except Exception as e:
                    if attempt == retry_count:
                        results[task_id] = {"status": "failed", "error": str(e), "attempt": attempt + 1}
                        failed = True
        execution = {
            "execution_id": exec_id,
            "pipeline_id": pipeline_id,
            "status": "failed" if failed else "completed",
            "results": results,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "idempotency_key": idempotency_key,
        }
        self._executions[exec_id] = execution
        return execution

    def get_lineage(self, task_id):
        return self._lineage.get(task_id, [])

    def get_full_lineage(self, pipeline_id):
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise PipelineError(f"Pipeline not found: {pipeline_id}")
        lineage = {}
        for node in pipeline["dag"].nodes():
            lineage[node] = list(pipeline["dag"].predecessors(node))
        return lineage

    def execute_parallel_tasks(self, pipeline_id):
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise PipelineError(f"Pipeline not found: {pipeline_id}")
        dag = pipeline["dag"]
        levels = []
        remaining = set(dag.nodes())
        completed = set()
        while remaining:
            ready = [n for n in remaining if all(p in completed for p in dag.predecessors(n))]
            if not ready:
                raise PipelineError("Deadlock detected")
            levels.append(ready)
            completed.update(ready)
            remaining -= set(ready)
        return levels

    def pause_pipeline(self, pipeline_id):
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise PipelineError(f"Pipeline not found: {pipeline_id}")
        pipeline["status"] = "paused"
        return True

    def resume_pipeline(self, pipeline_id):
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise PipelineError(f"Pipeline not found: {pipeline_id}")
        pipeline["status"] = "running"
        return True

    def check_circular_dependency(self, tasks):
        dag = nx.DiGraph()
        for task in tasks:
            dag.add_node(task["id"])
            for dep in task.get("depends_on", []):
                dag.add_edge(dep, task["id"])
        return not nx.is_directed_acyclic_graph(dag)

    def add_cross_pipeline_dependency(self, from_pipeline, from_task, to_pipeline, to_task):
        key = f"{to_pipeline}:{to_task}"
        self._lineage[key].append(f"{from_pipeline}:{from_task}")
        return True
