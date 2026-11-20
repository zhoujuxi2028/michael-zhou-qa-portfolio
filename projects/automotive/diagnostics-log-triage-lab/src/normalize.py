"""Anomaly → Event 标准化（DLT-06，architecture §3.2）。"""

from __future__ import annotations

from collections.abc import Iterable

from src.models import Anomaly, Event


def message_of(a: Anomaly) -> str:
    parts = [a.kind, f"id={a.bus_id}"]
    if a.signature:
        parts.append(a.signature)
    parts += [f"{k}={v}" for k, v in a.params.items()]
    return " ".join(parts)


def to_events(anomalies: Iterable[Anomaly]) -> list[Event]:
    ordered = sorted(anomalies, key=lambda a: (a.ts, a.line_span, a.source, a.kind))
    return [
        Event(
            event_id=f"E{i:05d}",
            ts=a.ts,
            source=a.source,
            kind=a.kind,
            bus_id=a.bus_id,
            signature=a.signature,
            message=message_of(a),
            params=dict(a.params),
            line_span=a.line_span,
        )
        for i, a in enumerate(ordered, start=1)
    ]
