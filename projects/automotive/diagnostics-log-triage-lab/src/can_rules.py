"""CAN 异常规则（DLT-03）。规则顺序见 architecture §4.2，避免一个故障产出多条告警。"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from src.can_parser import load_dbc
from src.models import Anomaly, CanFrame, bus_id

CYCLE_LOSS_FACTOR = 2.5
COUNTER_SKIP_FACTOR = 1.5
LONG_DROPOUT_FACTOR = 10
COUNTER_SIGNAL = "AliveCounter"
ERROR_BUS = "ERR"


@dataclass
class _State:
    last_ts: float | None = None
    last_line: int = 0
    counter: int | None = None


def _num(value: float) -> str:
    return f"{value:g}"


def _anomaly(frame: CanFrame, kind: str, signature: str = "", start_line: int | None = None, **params) -> Anomaly:
    return Anomaly(
        ts=frame.ts,
        source="CAN",
        kind=kind,
        bus_id=ERROR_BUS if frame.is_error else bus_id(frame.can_id),
        signature=signature,
        params={k: str(v) for k, v in params.items()},
        line_span=(start_line or frame.line_no, frame.line_no),
    )


def detect(frames: Iterable[CanFrame], db=None) -> list[Anomaly]:
    db = db or load_dbc()
    known = {m.frame_id: m for m in db.messages}
    states: dict[int, _State] = {}
    out: list[Anomaly] = []

    for frame in sorted(frames, key=lambda f: (f.ts, f.line_no)):
        if frame.is_error:  # 规则 2
            out.append(_anomaly(frame, "CAN_ERROR_FRAME", f"class=0x{frame.can_id:03X}"))
            continue
        msg = known.get(frame.can_id)
        if msg is None or frame.is_remote or frame.is_extended:  # 规则 1
            continue

        st = states.setdefault(frame.can_id, _State())
        period_s = (msg.cycle_time or 0) / 1000
        skip_counter = False
        if st.last_ts is not None and period_s:  # 规则 4
            gap = frame.ts - st.last_ts
            if gap > period_s * CYCLE_LOSS_FACTOR:
                extra = {"dropout": "long"} if gap >= period_s * LONG_DROPOUT_FACTOR else {}
                out.append(
                    _anomaly(
                        frame,
                        "CAN_CYCLE_LOSS",
                        start_line=st.last_line,
                        expected_ms=msg.cycle_time,
                        gap_ms=round(gap * 1000),
                        **extra,
                    )
                )
            skip_counter = gap > period_s * COUNTER_SKIP_FACTOR
        st.last_ts, st.last_line = frame.ts, frame.line_no

        if len(frame.data) != msg.length:  # 规则 3
            out.append(_anomaly(frame, "CAN_DLC_MISMATCH", expected=msg.length, actual=len(frame.data)))
            st.counter = None
            continue

        values = msg.decode(frame.data, decode_choices=False, scaling=True)
        for sig in msg.signals:  # 规则 5：信号越界
            if sig.name == COUNTER_SIGNAL:
                continue
            v = values[sig.name]
            if (sig.minimum is not None and v < sig.minimum) or (sig.maximum is not None and v > sig.maximum):
                out.append(_anomaly(frame, "CAN_SIGNAL_OUT_OF_RANGE", f"signal={sig.name}", value=_num(v)))

        if COUNTER_SIGNAL in values:  # 规则 5：计数器
            cur = int(values[COUNTER_SIGNAL])
            if st.counter is not None and not skip_counter:
                expected = (st.counter + 1) % 16
                if cur != expected:
                    out.append(_anomaly(frame, "CAN_COUNTER_JUMP", expected=expected, actual=cur))
            st.counter = cur
    return out
