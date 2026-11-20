"""P1/P2 分流 + 回归候选（DLT-09，architecture §4.1）。规则全部来自 triage_rules.json。"""

from __future__ import annotations

import json
from collections import defaultdict
from functools import lru_cache

from src.models import DATA_DIR, Cluster, Event, Incident


@lru_cache(maxsize=1)
def load_rules() -> dict:
    return json.loads((DATA_DIR / "triage_rules.json").read_text(encoding="utf-8"))


def _max_in_window(ts: list[float], window: float) -> int:
    ts = sorted(ts)
    best, j = 0, 0
    for i, t in enumerate(ts):
        while t - ts[j] >= window:
            j += 1
        best = max(best, i - j + 1)
    return best


def _escalates(rule: dict, bus: str, signature: str, ts: list[float], safety: set[str]) -> bool:
    when = rule["when"]
    if when == "safety_id":
        return bus in safety
    if when == "burst":
        return _max_in_window(ts, rule["window_s"]) >= rule["count"]
    if when == "safety_id_burst":
        return bus in safety and _max_in_window(ts, rule["window_s"]) >= rule["count"]
    if when == "signature_contains":
        return rule["value"] in signature
    raise ValueError(f"unknown escalation: {when}")


def priority_of(kind: str, bus: str, signature: str, ts: list[float], rules: dict | None = None) -> str:
    rules = rules or load_rules()
    safety = set(rules["safety_ids"])
    for rule in rules["escalate"]:
        if rule["kind"] == kind and _escalates(rule, bus, signature, ts, safety):
            return "P1"
    return rules["base_priority"][kind]


def triage(events: list[Event], clusters: list[Cluster], rules: dict | None = None) -> list[Incident]:
    rules = rules or load_rules()
    cand = rules["regression_candidate"]
    groups: dict[tuple, list[Event]] = defaultdict(list)
    for e in events:
        groups[(e.cluster_id, e.kind, e.bus_id, e.signature)].append(e)

    per_cluster: dict[int, int] = defaultdict(int)
    out: list[Incident] = []
    for (cid, kind, bus, sig), evs in sorted(groups.items(), key=lambda kv: (kv[0][0], kv[1][0].ts)):
        ts = [e.ts for e in evs]
        prio = priority_of(kind, bus, sig, ts, rules)
        k = per_cluster[cid]
        per_cluster[cid] += 1
        out.append(
            Incident(
                incident_id=f"C{cid:03d}-{k}",
                cluster_id=cid,
                kind=kind,
                bus_id=bus,
                signature=sig,
                priority=prio,
                count=len(evs),
                first_ts=min(ts),
                last_ts=max(ts),
                regression_candidate=prio == cand["always_if_priority"] or len(evs) >= cand["min_count"],
                evidence=[e.event_id for e in evs],
            )
        )
    return sorted(out, key=lambda i: (i.priority, i.first_ts))
