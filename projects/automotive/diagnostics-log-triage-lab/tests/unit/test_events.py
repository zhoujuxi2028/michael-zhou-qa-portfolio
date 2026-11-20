"""TC-EV-*：统一事件 schema 与标准化（DLT-06）。"""

import pytest

from src.events import SchemaError, event_to_dict, validate
from src.models import Anomaly
from src.normalize import to_events


def can_anomaly(ts=2.0):
    return Anomaly(ts, "CAN", "CAN_CYCLE_LOSS", "0x100", "", {"expected_ms": "20", "gap_ms": "95"}, (10, 11))


def uds_anomaly(ts=1.0):
    return Anomaly(ts, "UDS", "UDS_NRC", "0x7E0", "sid=0x22 nrc=0x31", {"name": "requestOutOfRange"}, (3, 4))


def test_event_schema_valid():  # TC-EV-01
    for ev in to_events([can_anomaly(), uds_anomaly()]):
        validate(event_to_dict(ev))


def test_event_schema_rejects_missing():  # TC-EV-02
    d = event_to_dict(to_events([uds_anomaly()])[0])
    del d["kind"]
    with pytest.raises(SchemaError, match="kind"):
        validate(d)


def test_event_schema_rejects_wrong_type():
    d = event_to_dict(to_events([uds_anomaly()])[0])
    d["ts"] = "soon"
    with pytest.raises(SchemaError, match="ts"):
        validate(d)


def test_event_schema_rejects_unknown_kind():
    d = event_to_dict(to_events([uds_anomaly()])[0])
    d["kind"] = "WHATEVER"
    with pytest.raises(SchemaError, match="kind"):
        validate(d)


def test_mixed_sources_sorted():  # TC-EV-03
    events = to_events([can_anomaly(ts=2.0), uds_anomaly(ts=1.0)])
    assert [e.source for e in events] == ["UDS", "CAN"]
    assert [e.event_id for e in events] == ["E00001", "E00002"]


def test_message_format():
    uds, can = to_events([uds_anomaly(), can_anomaly()])
    assert uds.message == "UDS_NRC id=0x7E0 sid=0x22 nrc=0x31 name=requestOutOfRange"
    assert can.message == "CAN_CYCLE_LOSS id=0x100 expected_ms=20 gap_ms=95"
