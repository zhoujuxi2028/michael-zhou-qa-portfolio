"""TC-TP-*：ISO-TP 分段 / 重组（DLT-04）。"""

import pytest

from src.isotp import IsoTpError, Reassembler, flow_control, reassemble, segment


def test_single_frame_roundtrip():  # TC-TP-01
    payload = bytes.fromhex("22F190")
    frames = segment(payload)
    assert frames == [bytes.fromhex("0322F190AAAAAAAA")]
    assert reassemble(frames) == [payload]


def test_multi_frame_roundtrip():  # TC-TP-02
    payload = b"\x62\xf1\x90" + b"WVWZZZ1KZAW000001"
    frames = segment(payload)
    assert len(frames) == 3 and frames[0][:2] == b"\x10\x14" and frames[1][0] == 0x21
    assert all(len(f) == 8 for f in frames)
    assert reassemble(frames) == [payload]


def test_sequence_error_detected():  # TC-TP-03
    frames = segment(bytes(range(20)))
    with pytest.raises(IsoTpError, match="sequence"):
        reassemble([frames[0], frames[2]])


def test_flow_control_skipped():  # TC-TP-04
    payload = bytes(range(30))
    frames = segment(payload)
    mixed = [frames[0], flow_control()] + frames[1:]
    assert flow_control() == bytes.fromhex("300000AAAAAAAAAA")
    assert reassemble(mixed) == [payload]


def test_sequence_number_wraparound():  # TC-TP-05
    payload = bytes(i % 256 for i in range(120))
    frames = segment(payload)
    sns = [f[0] & 0x0F for f in frames[1:]]
    assert 0xF in sns and sns[sns.index(0xF) + 1] == 0x0
    assert reassemble(frames) == [payload]


def test_reassembler_reports_error_without_raising():
    r = Reassembler()
    frames = segment(bytes(range(20)))
    assert r.feed(frames[0]) is None
    assert r.feed(frames[2]) == ("error", "sequence: got 2 want 1")
    assert r.feed(segment(b"\x7e\x00")[0]) == ("message", b"\x7e\x00")


def test_unexpected_consecutive_frame_is_error():
    assert Reassembler().feed(bytes.fromhex("2100000000000000")) == ("error", "unexpected CF")


def test_payload_too_long_rejected():
    with pytest.raises(ValueError):
        segment(bytes(4096))
