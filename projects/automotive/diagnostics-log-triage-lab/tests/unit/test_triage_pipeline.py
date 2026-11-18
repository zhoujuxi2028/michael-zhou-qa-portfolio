"""TC-TR-*：P1/P2 分流（DLT-09）与 pipeline smoke。"""

import pytest

from src.clustering import cluster
from src.generator import generate
from src.models import KINDS, Event
from src.pipeline import run
from src.triage import load_rules, triage


def ev(i, kind, bus, sig="", ts=None):
    msg = " ".join(x for x in (kind, f"id={bus}", sig) if x)
    return Event(f"E{i:05d}", float(i) if ts is None else ts, "CAN", kind, bus, sig, msg, {}, (i, i))


def incidents(events):
    res = cluster(events)
    return triage(res.events, res.clusters)


def by_key(incs):
    return {(i.kind, i.bus_id, i.signature): i for i in incs}


BASE = [
    ("CAN_DLC_MISMATCH", "0x101", "", "P2"),
    ("CAN_COUNTER_JUMP", "0x101", "", "P2"),
    ("UDS_NRC", "0x7E0", "sid=0x22 nrc=0x31", "P2"),
    ("UDS_P2_TIMEOUT", "0x7E0", "sid=0x22 timer=P2", "P1"),
    ("UDS_PENDING_LOOP", "0x7E0", "sid=0x19", "P1"),
    ("ISOTP_SEQUENCE_ERROR", "0x7E0", "sid=0x22", "P2"),
]


@pytest.mark.parametrize("kind,bus,sig,prio", BASE, ids=[b[0] for b in BASE])
def test_priority_base_rules(kind, bus, sig, prio):  # TC-TR-01
    (inc,) = incidents([ev(0, kind, bus, sig)])
    assert inc.priority == prio


def test_priority_escalation():  # TC-TR-02
    events = [
        ev(0, "CAN_CYCLE_LOSS", "0x100", ts=1.0),  # 安全 ID → P1
        ev(1, "CAN_CYCLE_LOSS", "0x101", ts=2.0),  # 非安全 ID → P2
        ev(2, "CAN_ERROR_FRAME", "ERR", "class=0x004", ts=3.0),  # 单次 → P2
        *[ev(3 + k, "CAN_ERROR_FRAME", "ERR", "class=0x040", ts=5.0 + 0.1 * k) for k in range(3)],  # burst → P1
        ev(6, "UDS_SECURITY_FAIL", "0x7E0", "sid=0x27 nrc=0x35", ts=7.0),
        ev(7, "UDS_SECURITY_FAIL", "0x7E0", "sid=0x27 nrc=0x36", ts=8.0),
        *[ev(8 + k, "CAN_SIGNAL_OUT_OF_RANGE", "0x200", "signal=ObjDistance", ts=9 + 0.1 * k) for k in range(3)],
        ev(11, "CAN_SIGNAL_OUT_OF_RANGE", "0x100", "signal=VehicleSpeed", ts=12.0),
        ev(12, "CAN_SIGNAL_OUT_OF_RANGE", "0x100", "signal=VehicleSpeed", ts=14.0),
    ]
    got = {k: v.priority for k, v in by_key(incidents(events)).items()}
    assert got == {
        ("CAN_CYCLE_LOSS", "0x100", ""): "P1",
        ("CAN_CYCLE_LOSS", "0x101", ""): "P2",
        ("CAN_ERROR_FRAME", "ERR", "class=0x004"): "P2",
        ("CAN_ERROR_FRAME", "ERR", "class=0x040"): "P1",
        ("UDS_SECURITY_FAIL", "0x7E0", "sid=0x27 nrc=0x35"): "P2",
        ("UDS_SECURITY_FAIL", "0x7E0", "sid=0x27 nrc=0x36"): "P1",
        ("CAN_SIGNAL_OUT_OF_RANGE", "0x200", "signal=ObjDistance"): "P1",
        ("CAN_SIGNAL_OUT_OF_RANGE", "0x100", "signal=VehicleSpeed"): "P2",
    }


def test_regression_candidate():  # TC-TR-03
    events = [
        ev(0, "UDS_P2_TIMEOUT", "0x7E0", "sid=0x22 timer=P2"),  # P1 单次 → 候选
        ev(1, "CAN_DLC_MISMATCH", "0x101", ts=1.0),  # P2 ×2 → 候选
        ev(2, "CAN_DLC_MISMATCH", "0x101", ts=5.0),
        ev(3, "UDS_NRC", "0x7E0", "sid=0x22 nrc=0x31"),  # P2 单次 → 非候选
    ]
    got = {k[0]: (v.count, v.regression_candidate) for k, v in by_key(incidents(events)).items()}
    assert got == {"UDS_P2_TIMEOUT": (1, True), "CAN_DLC_MISMATCH": (2, True), "UDS_NRC": (1, False)}


def test_incidents_sorted_p1_first():
    incs = incidents([ev(0, "UDS_NRC", "0x7E0", "sid=0x22 nrc=0x31"), ev(1, "UDS_PENDING_LOOP", "0x7E0", "sid=0x19")])
    assert [i.priority for i in incs] == ["P1", "P2"]
    assert incs[0].incident_id.startswith("C")


def test_rules_loaded():
    rules = load_rules()
    assert set(rules["base_priority"]) == set(KINDS)


def test_pipeline_smoke_seed42():  # TC-TR-04
    ds = generate(seed=42, scenario="dev")
    res = run("\n".join(ds.lines))
    assert {i.kind for i in res.incidents} == set(KINDS)
    assert res.parse_stats.invalid == 2 and res.elapsed_s > 0
    assert len(res.events) >= len(ds.labels["faults"])


def test_pipeline_accepts_line_list_and_empty():
    assert run([]).incidents == []
