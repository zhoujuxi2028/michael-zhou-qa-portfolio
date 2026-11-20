"""编排：解析 → 规则 → 标准化 → 模板 / 聚类 → 分流（CLI 与 API 共用）。"""

from __future__ import annotations

import time
from collections.abc import Iterable

from src import can_rules, uds_rules
from src.can_parser import parse_candump
from src.clustering import cluster
from src.llm import get_backend, summarize_incidents
from src.models import TriageResult
from src.normalize import to_events
from src.triage import triage
from src.uds import pair_exchanges


def run(trace: str | Iterable[str], *, backend=None) -> TriageResult:
    t0 = time.perf_counter()
    lines = trace.splitlines() if isinstance(trace, str) else list(trace)
    parsed = parse_candump(lines)
    anomalies = can_rules.detect(parsed.frames)
    anomalies += uds_rules.detect(pair_exchanges(parsed.frames), parsed.trace_end)
    clustered = cluster(to_events(anomalies))
    incidents = triage(clustered.events, clustered.clusters)
    incidents = summarize_incidents(incidents, clustered.events, backend or get_backend())
    return TriageResult(
        parse_stats=parsed.stats,
        events=clustered.events,
        clusters=clustered.clusters,
        incidents=incidents,
        elapsed_s=time.perf_counter() - t0,
        trace_end=parsed.trace_end,
    )
