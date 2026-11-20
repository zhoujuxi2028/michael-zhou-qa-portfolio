"""Shared data structures (architecture §3.1)."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

BusId = str  # "0x100" / "0x7E0"
Priority = Literal["P1", "P2"]

DATA_DIR = Path(__file__).resolve().parent / "data"
PROJECT_ROOT = Path(__file__).resolve().parent.parent

KINDS = (
    "CAN_CYCLE_LOSS",
    "CAN_DLC_MISMATCH",
    "CAN_SIGNAL_OUT_OF_RANGE",
    "CAN_ERROR_FRAME",
    "CAN_COUNTER_JUMP",
    "UDS_NRC",
    "UDS_P2_TIMEOUT",
    "UDS_PENDING_LOOP",
    "UDS_SECURITY_FAIL",
    "ISOTP_SEQUENCE_ERROR",
)


def bus_id(can_id: int) -> BusId:
    return f"0x{can_id:03X}"


@dataclass(frozen=True)
class CanFrame:
    line_no: int
    ts: float
    channel: str
    can_id: int
    data: bytes
    is_fd: bool = False
    flags: int = 0
    is_remote: bool = False
    is_error: bool = False
    is_extended: bool = False


@dataclass
class ParseStats:
    total: int = 0
    invalid_line_nos: list[int] = field(default_factory=list)

    @property
    def invalid(self) -> int:
        return len(self.invalid_line_nos)

    @property
    def ok(self) -> int:
        return self.total - self.invalid


@dataclass
class ParseResult:
    frames: list[CanFrame]
    stats: ParseStats
    trace_end: float = 0.0


@dataclass
class UdsExchange:
    req_ts: float
    req_id: BusId
    request: bytes
    responses: list[tuple[float, bytes]] = field(default_factory=list)  # 含 0x78
    isotp_error: bool = False
    line_span: tuple[int, int] = (0, 0)

    @property
    def sid(self) -> int:
        return self.request[0]

    @property
    def suppress_positive(self) -> bool:
        return len(self.request) > 1 and self.sid in SUBFUNCTION_SIDS and bool(self.request[1] & 0x80)


SUBFUNCTION_SIDS = frozenset({0x10, 0x19, 0x27, 0x3E})


@dataclass(frozen=True)
class Anomaly:
    ts: float
    source: Literal["CAN", "UDS"]
    kind: str
    bus_id: BusId
    signature: str
    params: dict[str, str]
    line_span: tuple[int, int]


@dataclass(frozen=True)
class Event:
    event_id: str
    ts: float
    source: str
    kind: str
    bus_id: BusId
    signature: str
    message: str
    params: dict[str, str]
    line_span: tuple[int, int]
    template_id: int | None = None
    cluster_id: int | None = None


@dataclass(frozen=True)
class Cluster:
    cluster_id: int
    template_ids: list[int]
    event_ids: list[str]


@dataclass(frozen=True)
class Hypothesis:
    text: str
    evidence_event_ids: list[str]


@dataclass
class Incident:
    incident_id: str
    cluster_id: int
    kind: str
    bus_id: BusId
    signature: str
    priority: Priority
    count: int
    first_ts: float
    last_ts: float
    regression_candidate: bool
    evidence: list[str]
    summary: str | None = None
    hypotheses: list[Hypothesis] = field(default_factory=list)
    summary_note: str | None = None


@dataclass
class TriageResult:
    parse_stats: ParseStats
    events: list[Event]
    clusters: list[Cluster]
    incidents: list[Incident]
    elapsed_s: float = 0.0
    trace_end: float = 0.0
