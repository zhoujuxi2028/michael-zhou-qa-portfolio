"""candump 逐行解析 + DBC 加载（DLT-02，architecture §4.5 / AD-01）。"""

from __future__ import annotations

import re
from collections.abc import Iterable
from functools import lru_cache

import cantools

from src.models import DATA_DIR, CanFrame, ParseResult, ParseStats

LINE = re.compile(
    r"^\((?P<ts>\d+\.\d+)\)\s+(?P<ch>\S+)\s+(?P<id>[0-9A-Fa-f]{3}|[0-9A-Fa-f]{8})"
    r"#(?:#(?P<flags>[0-9A-Fa-f])(?P<fdata>[0-9A-Fa-f]*)|(?P<rtr>R\d?)|(?P<data>[0-9A-Fa-f]*))$"
)
CAN_ERR_FLAG = 0x20000000
EFF_MASK = 0x1FFFFFFF
FD_LENGTHS = frozenset([*range(9), 12, 16, 20, 24, 32, 48, 64])


@lru_cache(maxsize=1)
def load_dbc():
    return cantools.database.load_file(str(DATA_DIR / "lab.dbc"))


def _hex_bytes(text: str) -> bytes | None:
    if len(text) % 2:
        return None
    return bytes.fromhex(text)


def parse_line(line_no: int, line: str) -> CanFrame | None:
    m = LINE.match(line)
    if m is None:
        return None
    raw_id = int(m["id"], 16)
    extended = len(m["id"]) == 8
    if not extended and raw_id > 0x7FF:
        return None
    is_error = extended and bool(raw_id & CAN_ERR_FLAG)
    can_id = raw_id & EFF_MASK if extended else raw_id
    common = {
        "line_no": line_no,
        "ts": float(m["ts"]),
        "channel": m["ch"],
        "is_extended": extended,
        "is_error": is_error,
    }

    if m["flags"] is not None:
        data = _hex_bytes(m["fdata"])
        if data is None or len(data) not in FD_LENGTHS:
            return None
        return CanFrame(can_id=can_id, data=data, is_fd=True, flags=int(m["flags"], 16), **common)
    if m["rtr"] is not None:
        return CanFrame(can_id=can_id, data=b"", is_remote=True, **common)
    data = _hex_bytes(m["data"])
    if data is None or len(data) > 8:
        return None
    return CanFrame(can_id=can_id, data=data, **common)


def parse_candump(lines: Iterable[str]) -> ParseResult:
    frames: list[CanFrame] = []
    stats = ParseStats()
    for line_no, raw in enumerate(lines, start=1):
        text = raw.strip()
        if not text or text.startswith("#"):
            continue
        stats.total += 1
        frame = parse_line(line_no, text)
        if frame is None:
            stats.invalid_line_nos.append(line_no)
            continue
        frames.append(frame)
    trace_end = max((f.ts for f in frames), default=0.0)
    return ParseResult(frames, stats, trace_end)
