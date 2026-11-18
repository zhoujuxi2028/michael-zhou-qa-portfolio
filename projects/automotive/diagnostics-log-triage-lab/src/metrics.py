"""与 ground truth 匹配并计算指标（DLT-12，architecture §7）。"""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass

from sklearn.metrics import homogeneity_completeness_v_measure

from src.can_parser import load_dbc
from src.models import Event, TriageResult
from src.regression import RegressionReport
from src.uds_rules import load_timing

CAN_TOL_PERIODS = 3
ERR_TOL_S = 0.1
MANUAL_MIN_PER_INCIDENT = 5  # 人工定位每条 Incident 的估算分钟数（假设）
P2_STAR_KINDS = frozenset({"UDS_P2_TIMEOUT", "UDS_PENDING_LOOP"})


@dataclass
class Metrics:
    faults: int
    incidents: int
    recall: float
    false_positive_rate: float
    triage_accuracy: float
    homogeneity: float
    completeness: float
    v_measure: float
    purity: float
    parse_success_rate: float
    invalid_lines_exact: bool
    regression_coverage: float | None
    elapsed_s: float
    manual_estimate_min: int

    def to_dict(self) -> dict:
        return asdict(self)


def tolerance(kind: str, bus_id: str) -> float:
    if kind.startswith("CAN_"):
        if bus_id == "ERR":
            return ERR_TOL_S
        return CAN_TOL_PERIODS * load_dbc().get_message_by_frame_id(int(bus_id, 16)).cycle_time / 1000
    t = load_timing()
    return t.p2_star_s if kind in P2_STAR_KINDS else t.p2_s


def _match(e: Event, faults: list[dict]) -> dict | None:
    tol = tolerance(e.kind, e.bus_id)
    cands = [
        f
        for f in faults
        if f["kind"] == e.kind
        and f["bus_id"] == e.bus_id
        and f["signature"] == e.signature
        and f["t_start"] - tol <= e.ts <= f["t_end"] + tol
    ]
    return min(cands, key=lambda f: abs(f["t_start"] - e.ts)) if cands else None


def _ratio(a: int, b: int, empty: float) -> float:
    return a / b if b else empty


def evaluate(result: TriageResult, labels: dict, regression: RegressionReport | None = None) -> Metrics:
    faults = labels["faults"]
    meta = labels["meta"]
    matched = {e.event_id: _match(e, faults) for e in result.events}
    hit_faults = {m["fault_id"] for m in matched.values() if m}

    correct = judged = unmatched = 0
    for inc in result.incidents:
        fs = [matched[x] for x in inc.evidence if matched.get(x)]
        if not fs:
            unmatched += 1
            continue
        votes = Counter(f["expected_priority"] for f in fs)
        expected = "P1" if votes["P1"] >= votes["P2"] else "P2"
        judged += 1
        correct += expected == inc.priority

    pairs = [(e.cluster_id, matched[e.event_id]) for e in result.events if matched[e.event_id]]
    truth = [f"{f['kind']}|{f['bus_id']}|{f['signature']}" for _, f in pairs]
    pred = [cid for cid, _ in pairs]
    if pairs:
        h, c, v = homogeneity_completeness_v_measure(truth, pred)
        by_cluster: dict[int, Counter] = {}
        for p, t in zip(pred, truth, strict=True):
            by_cluster.setdefault(p, Counter())[t] += 1
        purity = sum(cnt.most_common(1)[0][1] for cnt in by_cluster.values()) / len(pairs)
    else:
        h = c = v = purity = 0.0

    legal = meta["total_lines"] - len(meta["invalid_line_nos"])
    candidates = sum(i.regression_candidate for i in result.incidents)
    coverage = None if regression is None else _ratio(regression.passed, candidates, 1.0)
    return Metrics(
        faults=len(faults),
        incidents=len(result.incidents),
        recall=_ratio(len(hit_faults), len(faults), 1.0),
        false_positive_rate=_ratio(unmatched, len(result.incidents), 0.0),
        triage_accuracy=_ratio(correct, judged, 1.0),
        homogeneity=float(h),
        completeness=float(c),
        v_measure=float(v),
        purity=float(purity),
        parse_success_rate=_ratio(result.parse_stats.ok, legal, 1.0),
        invalid_lines_exact=result.parse_stats.invalid_line_nos == meta["invalid_line_nos"],
        regression_coverage=coverage,
        elapsed_s=result.elapsed_s,
        manual_estimate_min=len(result.incidents) * MANUAL_MIN_PER_INCIDENT,
    )
