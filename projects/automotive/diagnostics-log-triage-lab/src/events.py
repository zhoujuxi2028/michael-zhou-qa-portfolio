"""统一事件 schema（DLT-06）。"""

from __future__ import annotations

from dataclasses import asdict

from src.models import KINDS, Event

SCHEMA: dict[str, type | tuple[type, ...]] = {
    "event_id": str,
    "ts": (int, float),
    "source": str,
    "kind": str,
    "bus_id": str,
    "signature": str,
    "message": str,
    "params": dict,
    "line_span": (list, tuple),
}
SOURCES = frozenset({"CAN", "UDS"})


class SchemaError(ValueError):
    pass


def event_to_dict(ev: Event) -> dict:
    d = asdict(ev)
    d["line_span"] = list(ev.line_span)
    return d


def validate(d: dict) -> None:
    for key, typ in SCHEMA.items():
        if key not in d:
            raise SchemaError(f"missing field: {key}")
        if not isinstance(d[key], typ) or isinstance(d[key], bool):
            raise SchemaError(f"bad type for {key}: {type(d[key]).__name__}")
    if d["source"] not in SOURCES:
        raise SchemaError(f"unknown source: {d['source']}")
    if d["kind"] not in KINDS:
        raise SchemaError(f"unknown kind: {d['kind']}")
    if not all(isinstance(v, str) for v in d["params"].values()):
        raise SchemaError("params values must be str")
