"""UDS 异常规则（DLT-05）。每个 exchange 至多一条 Anomaly，最具体者优先（architecture §4.3）。"""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache

from src.models import DATA_DIR, Anomaly, UdsExchange
from src.uds import NRC_NAMES, is_pending

SECURITY_NRCS = frozenset({0x35, 0x36})


@dataclass(frozen=True)
class Timing:
    p2_s: float
    p2_star_s: float
    pending_loop_max: int


@lru_cache(maxsize=1)
def load_timing() -> Timing:
    cfg = json.loads((DATA_DIR / "uds_timing.json").read_text())
    return Timing(cfg["p2_ms"] / 1000, cfg["p2_star_ms"] / 1000, cfg["pending_loop_max"])


def _anomaly(ex: UdsExchange, kind: str, signature: str, **params) -> Anomaly:
    return Anomaly(
        ts=ex.req_ts,
        source="UDS",
        kind=kind,
        bus_id=ex.req_id,
        signature=signature,
        params={k: str(v) for k, v in params.items()},
        line_span=ex.line_span,
    )


def _timeout(ex: UdsExchange, trace_end: float, t: Timing) -> tuple[str, float] | None:
    """返回 (timer, 实际等待 ms)；无超时返回 None。"""
    if not ex.responses:
        if ex.suppress_positive:
            return None
        deadline = ex.req_ts + t.p2_s
        return ("P2", (trace_end - ex.req_ts) * 1000) if trace_end > deadline else None

    first_ts = ex.responses[0][0]
    if first_ts - ex.req_ts > t.p2_s:
        return "P2", (first_ts - ex.req_ts) * 1000
    for (ts_a, resp_a), (ts_b, _) in zip(ex.responses, ex.responses[1:]):
        if is_pending(resp_a) and ts_b - ts_a > t.p2_star_s:
            return "P2*", (ts_b - ts_a) * 1000
    last_ts, last = ex.responses[-1]
    if is_pending(last) and trace_end > last_ts + t.p2_star_s:
        return "P2*", (trace_end - last_ts) * 1000
    return None


def detect(exchanges: Iterable[UdsExchange], trace_end: float, timing: Timing | None = None) -> list[Anomaly]:
    t = timing or load_timing()
    out: list[Anomaly] = []
    for ex in exchanges:
        sid = f"sid=0x{ex.sid:02X}"
        final = next((r for _, r in reversed(ex.responses) if not is_pending(r)), None)
        final_nrc = final[2] if final is not None and final[0] == 0x7F and len(final) >= 3 else None
        pending = sum(1 for _, r in ex.responses if is_pending(r))

        if ex.isotp_error:
            out.append(_anomaly(ex, "ISOTP_SEQUENCE_ERROR", sid))
        elif ex.sid == 0x27 and final_nrc in SECURITY_NRCS:
            out.append(
                _anomaly(ex, "UDS_SECURITY_FAIL", f"{sid} nrc=0x{final_nrc:02X}", name=NRC_NAMES.get(final_nrc, "?"))
            )
        elif pending > t.pending_loop_max:
            out.append(_anomaly(ex, "UDS_PENDING_LOOP", sid, count=pending))
        elif (to := _timeout(ex, trace_end, t)) is not None:
            out.append(_anomaly(ex, "UDS_P2_TIMEOUT", f"{sid} timer={to[0]}", dur_ms=round(to[1])))
        elif final_nrc is not None:
            out.append(
                _anomaly(ex, "UDS_NRC", f"{sid} nrc=0x{final_nrc:02X}", name=NRC_NAMES.get(final_nrc, "unknown"))
            )
    return out
