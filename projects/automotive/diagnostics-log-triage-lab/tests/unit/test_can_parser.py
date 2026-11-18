"""TC-CP-*：candump 解析（DLT-02）。"""

from src.can_parser import load_dbc, parse_candump
from tests.helpers import line


def _one(text):
    res = parse_candump([text])
    assert res.stats.invalid == 0, res.stats.invalid_line_nos
    return res.frames[0]


def test_parse_classic_frame():  # TC-CP-01
    f = _one(line(1.0, "100", "0102030405060708"))
    assert (f.can_id, f.data, f.is_fd, f.ts, f.line_no) == (0x100, bytes(range(1, 9)), False, 1.0, 1)


def test_parse_fd_frame():  # TC-CP-02
    f = _one(line(1.0, "200", "#1" + "AB" * 64))
    assert f.is_fd and f.flags == 1 and len(f.data) == 64


def test_parse_rtr_frame():  # TC-CP-03
    f = _one(line(1.0, "101", "R"))
    assert f.is_remote and f.data == b""


def test_parse_error_frame():  # TC-CP-04
    f = _one(line(1.0, "20000004", "0004000000000000"))
    assert f.is_error and f.is_extended


def test_invalid_lines_counted():  # TC-CP-05
    lines = [line(1.0, "100", "00"), "garbage-line", "", "# comment", line(2.0, "100", "0")]
    res = parse_candump(lines)
    assert res.stats.total == 3
    assert res.stats.invalid_line_nos == [2, 5]
    assert len(res.frames) == 1
    assert res.trace_end == 1.0


def test_dbc_decode_signal():  # TC-CP-06
    db = load_dbc()
    msg = db.get_message_by_frame_id(0x100)
    data = msg.encode({"VehicleSpeed": 123.45, "AliveCounter": 7})
    assert db.decode_message(0x100, data) == {"VehicleSpeed": 123.45, "AliveCounter": 7}
    assert msg.cycle_time == 20
    assert db.get_message_by_frame_id(0x200).is_fd


def test_invalid_length_rejected():  # TC-CP-07
    lines = [line(1.0, "100", "00" * 9), line(1.0, "200", "#1" + "00" * 10), line(1.0, "100", "ABC")]
    assert parse_candump(lines).stats.invalid == 3


def test_extended_id_parsed():  # TC-CP-08
    f = _one(line(1.0, "18DAF110", "02"))
    assert f.is_extended and not f.is_error and f.can_id == 0x18DAF110


def test_std_id_over_7ff_rejected():  # TC-CP-09
    assert parse_candump([line(1.0, "800", "00")]).stats.invalid == 1
