"""TC-UDS-*：模拟 ECU 与请求 / 响应配对（DLT-04，architecture §4.4）。"""

import pytest

from src.can_parser import parse_candump
from src.isotp import flow_control, segment
from src.uds import SimulatedEcu, pair_exchanges
from tests.helpers import line


@pytest.fixture
def ecu():
    return SimulatedEcu()


def unlocked(ecu):
    ecu.handle(bytes.fromhex("1003"))
    seed = ecu.handle(bytes.fromhex("2701"))[2:]
    assert ecu.handle(bytes.fromhex("2702") + SimulatedEcu.key_for(seed)) == bytes.fromhex("6702")
    return ecu


POSITIVE = [
    ("10", "1003"),
    ("22", "22F190"),
    ("27", None),
    ("2e", None),
    ("19", "1902FF"),
    ("3e", "3E00"),
]


@pytest.mark.parametrize("sid,req", POSITIVE, ids=[p[0] for p in POSITIVE])
def test_service_positive(ecu, sid, req):  # TC-UDS-01~06
    if sid == "27":
        ecu.handle(bytes.fromhex("1003"))
        req = "2701"
    if sid == "2e":
        unlocked(ecu)
        req = "2EF19A0102"
    resp = ecu.handle(bytes.fromhex(req))
    assert resp[0] == int(sid, 16) + 0x40


NRC = [
    ("10", ["1005"], 0x12),
    ("22", ["22ABCD"], 0x31),
    ("27", ["1003", "2701", "27020000"], 0x35),
    ("2e", ["1003", "2EF19A01"], 0x33),
    ("19", ["1999"], 0x12),
    ("3e", ["3E0000"], 0x13),
]


@pytest.mark.parametrize("sid,reqs,nrc", NRC, ids=[n[0] for n in NRC])
def test_service_nrc(ecu, sid, reqs, nrc):  # TC-UDS-07~12
    for r in reqs:
        resp = ecu.handle(bytes.fromhex(r))
    assert resp == bytes([0x7F, int(sid, 16), nrc])


def test_security_lockout_after_3_attempts(ecu):  # TC-UDS-14
    ecu.handle(bytes.fromhex("1003"))
    results = []
    for _ in range(3):
        ecu.handle(bytes.fromhex("2701"))
        results.append(ecu.handle(bytes.fromhex("27020000"))[2])
    assert results == [0x35, 0x35, 0x36]


def test_write_requires_unlock(ecu):  # TC-UDS-15
    assert ecu.handle(bytes.fromhex("2EF19A01")) == bytes.fromhex("7F2E22")
    ecu.handle(bytes.fromhex("1003"))
    assert ecu.handle(bytes.fromhex("2EF19A01")) == bytes.fromhex("7F2E33")


def test_3e_suppress_no_response(ecu):  # TC-UDS-16
    assert ecu.handle(bytes.fromhex("3E80")) is None


def test_security_key_order(ecu):
    ecu.handle(bytes.fromhex("1003"))
    assert ecu.handle(bytes.fromhex("27020000")) == bytes.fromhex("7F2724")


def test_unknown_service(ecu):
    assert ecu.handle(bytes.fromhex("85")) == bytes.fromhex("7F8511")


def test_security_requires_extended_session(ecu):
    assert ecu.handle(bytes.fromhex("2701")) == bytes.fromhex("7F277F")


def test_read_dtc_multiframe(ecu):
    assert len(ecu.handle(bytes.fromhex("1902FF"))) > 7


def _lines(frames):
    """frames: [(ts, can_id, bytes)] → candump 行"""
    return [line(ts, cid, data.hex().upper()) for ts, cid, data in frames]


def test_pair_exchanges():  # TC-UDS-13
    vin = SimulatedEcu().handle(bytes.fromhex("22F190"))
    resp_frames = segment(vin)
    frames = [
        (1.000, "7E0", segment(bytes.fromhex("22F190"))[0]),
        (1.010, "7E8", resp_frames[0]),
        (1.011, "7E0", flow_control()),
        *[(1.012 + i * 0.001, "7E8", f) for i, f in enumerate(resp_frames[1:])],
        (2.000, "7E0", segment(bytes.fromhex("22ABCD"))[0]),
        (2.005, "7E8", segment(bytes.fromhex("7F2278"))[0]),
        (2.100, "7E8", segment(bytes.fromhex("7F2231"))[0]),
        (3.000, "7E0", segment(bytes.fromhex("3E80"))[0]),
    ]
    parsed = parse_candump(_lines(frames))
    ex = pair_exchanges(parsed.frames)
    assert [e.request.hex() for e in ex] == ["22f190", "22abcd", "3e80"]
    assert ex[0].responses == [(1.013, vin)] and ex[0].line_span == (1, 5)
    assert [r for _, r in ex[1].responses] == [bytes.fromhex("7F2278"), bytes.fromhex("7F2231")]
    assert ex[2].responses == [] and ex[2].suppress_positive


def test_pair_exchanges_isotp_error():
    resp = segment(bytes(range(0x62, 0x62 + 20)))
    frames = [
        (1.0, "7E0", segment(bytes.fromhex("22F190"))[0]),
        (1.01, "7E8", resp[0]),
        (1.02, "7E8", resp[2]),
    ]
    ex = pair_exchanges(parse_candump(_lines(frames)).frames)
    assert ex[0].isotp_error and ex[0].responses == []


def test_response_without_request_ignored():
    frames = [(1.0, "7E8", segment(bytes.fromhex("7E00"))[0])]
    assert pair_exchanges(parse_candump(_lines(frames)).frames) == []
