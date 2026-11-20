"""TC-CR-*：CAN 异常规则（DLT-03，architecture §4.2）。"""

from src.can_parser import load_dbc, parse_candump
from src.can_rules import detect
from tests.helpers import line

DB = load_dbc()


def vd(ts, speed=50.0, counter=0, can_id="100"):
    data = DB.get_message_by_frame_id(0x100).encode({"VehicleSpeed": speed, "AliveCounter": counter}, strict=False)
    return line(ts, can_id, data.hex().upper())


def vd_stream(n, start=0.0, period=0.02, counter0=0):
    return [vd(start + i * period, counter=(counter0 + i) % 16) for i in range(n)]


def kinds(lines):
    return [a.kind for a in detect(parse_candump(lines).frames)]


def test_cycle_loss_detected():  # TC-CR-01
    lines = vd_stream(3) + [vd(0.04 + 0.06, counter=3)]  # 间隔 60 ms = 3× 周期
    anomalies = detect(parse_candump(lines).frames)
    assert [a.kind for a in anomalies] == ["CAN_CYCLE_LOSS"]
    a = anomalies[0]
    assert a.bus_id == "0x100" and a.params["expected_ms"] == "20" and a.params["gap_ms"] == "60"
    assert a.line_span == (3, 4)


def test_cycle_loss_within_tolerance():  # TC-CR-02
    lines = vd_stream(3) + [vd(0.04 + 0.03, counter=3)]  # 1.5×
    assert kinds(lines) == []


def test_dlc_mismatch_detected():  # TC-CR-03
    anomalies = detect(parse_candump([line(0.0, "100", "000000000000")]).frames)
    assert [a.kind for a in anomalies] == ["CAN_DLC_MISMATCH"]
    assert anomalies[0].params == {"expected": "8", "actual": "6"}


def test_dlc_ok_fd_64_bytes():  # TC-CR-04
    data = DB.get_message_by_frame_id(0x200).encode({"ObjDistance": 10.0}).hex()
    assert kinds([line(0.0, "200", "#1" + data)]) == []


def test_signal_out_of_range_detected():  # TC-CR-05
    anomalies = detect(parse_candump([vd(0.0, speed=300.01)]).frames)
    assert [(a.kind, a.signature) for a in anomalies] == [("CAN_SIGNAL_OUT_OF_RANGE", "signal=VehicleSpeed")]
    assert anomalies[0].params["value"] == "300.01"


def test_signal_boundary_ok():  # TC-CR-06
    assert kinds([vd(0.0, speed=300.0)]) == []


def test_error_frame_detected():  # TC-CR-07
    anomalies = detect(parse_candump([line(0.0, "20000004", "0004000000000000")]).frames)
    assert [(a.kind, a.bus_id, a.signature) for a in anomalies] == [("CAN_ERROR_FRAME", "ERR", "class=0x004")]


def test_extended_id_no_error_frame():  # TC-CR-10
    assert kinds([line(0.0, "18DAF110", "0201")]) == []


def test_counter_jump_detected():  # TC-CR-08
    lines = [vd(0.00, counter=3), vd(0.02, counter=5)]
    anomalies = detect(parse_candump(lines).frames)
    assert [a.kind for a in anomalies] == ["CAN_COUNTER_JUMP"]
    assert anomalies[0].params == {"expected": "4", "actual": "5"}


def test_counter_wraparound_ok():  # TC-CR-09
    assert kinds(vd_stream(4, counter0=14)) == []


def test_cycle_loss_suppresses_counter_jump():  # TC-CR-11
    lines = vd_stream(2) + [vd(0.02 + 0.08, counter=5)]  # 丢 3 帧，计数器 1 → 5
    assert kinds(lines) == ["CAN_CYCLE_LOSS"]


def test_dlc_mismatch_suppresses_signal_checks():  # TC-CR-12
    lines = [vd(0.00, counter=1), line(0.02, "100", "FFFF"), vd(0.04, counter=3)]
    assert kinds(lines) == ["CAN_DLC_MISMATCH"]


def test_unknown_id_ignored():  # TC-CR-13
    lines = [line(0.0, "123", "00"), line(0.1, "7E0", "0322F19000000000"), line(0.2, "7E8", "037F223100000000")]
    assert kinds(lines) == []


def test_long_dropout_adds_optional_field():
    lines = vd_stream(2) + [vd(0.02 + 0.25, counter=0)]  # 250 ms ≥ 10× 周期
    a = detect(parse_candump(lines).frames)[0]
    assert a.params["dropout"] == "long"


def test_remote_frame_ignored():
    assert kinds([line(0.0, "100", "R")]) == []
