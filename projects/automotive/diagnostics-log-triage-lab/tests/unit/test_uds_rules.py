"""TC-UR-*：UDS 异常规则（DLT-05，architecture §4.3）。"""

from src.models import UdsExchange
from src.uds_rules import detect, load_timing

H = bytes.fromhex


def ex(req, *responses, req_ts=1.0, isotp_error=False):
    """responses: (相对 req_ts 的秒数, hex)"""
    return UdsExchange(
        req_ts=req_ts,
        req_id="0x7E0",
        request=H(req),
        responses=[(req_ts + dt, H(r)) for dt, r in responses],
        isotp_error=isotp_error,
        line_span=(1, 2),
    )


def run(*exchanges, trace_end=100.0):
    return [(a.kind, a.signature) for a in detect(list(exchanges), trace_end)]


def test_nrc_classified():  # TC-UR-01
    anomalies = detect([ex("22ABCD", (0.01, "7F2231"))], 100.0)
    assert [(a.kind, a.signature, a.bus_id) for a in anomalies] == [("UDS_NRC", "sid=0x22 nrc=0x31", "0x7E0")]
    assert anomalies[0].params["name"] == "requestOutOfRange"


def test_nrc_positive_ignored():  # TC-UR-02
    assert run(ex("22F190", (0.01, "62F19001"))) == []


def test_p2_timeout_detected():  # TC-UR-03
    assert run(ex("22F190"), trace_end=1.06) == [("UDS_P2_TIMEOUT", "sid=0x22 timer=P2")]


def test_p2_late_response_is_timeout():
    assert run(ex("22F190", (0.06, "62F19001"))) == [("UDS_P2_TIMEOUT", "sid=0x22 timer=P2")]


def test_p2_in_time_ok():  # TC-UR-04
    assert run(ex("22F190", (0.04, "62F19001"))) == []


def test_pending_loop_detected():  # TC-UR-05
    pend = [(0.04 * (i + 1), "7F2278") for i in range(7)]
    assert run(ex("22F190", *pend, (0.5, "62F19001"))) == [("UDS_PENDING_LOOP", "sid=0x22")]


def test_pending_single_ok():  # TC-UR-06
    assert run(ex("22F190", (0.01, "7F2278"), (1.0, "62F19001"))) == []


def test_security_fail_detected():  # TC-UR-07
    assert run(ex("27020000", (0.01, "7F2735"))) == [("UDS_SECURITY_FAIL", "sid=0x27 nrc=0x35")]


def test_security_success_ok():  # TC-UR-08
    assert run(ex("27021234", (0.01, "6702"))) == []


def test_suppress_bit_no_timeout():  # TC-UR-09
    assert run(ex("3E80")) == []


def test_p2star_timeout_detected():  # TC-UR-10
    assert run(ex("22F190", (0.01, "7F2278")), trace_end=7.0) == [("UDS_P2_TIMEOUT", "sid=0x22 timer=P2*")]


def test_p2star_in_time_ok():  # TC-UR-11
    assert run(ex("22F190", (0.01, "7F2278"), (4.0, "62F19001"))) == []


def test_p2star_gap_between_pending_and_final():
    assert run(ex("22F190", (0.01, "7F2278"), (5.5, "62F19001"))) == [("UDS_P2_TIMEOUT", "sid=0x22 timer=P2*")]


def test_trace_end_no_false_timeout():  # TC-UR-12
    assert run(ex("22F190"), trace_end=1.03) == []
    assert run(ex("22F190", (0.01, "7F2278")), trace_end=5.0) == []


def test_security_fail_not_double_counted():  # TC-UR-13
    kinds = [k for k, _ in run(ex("27020000", (0.01, "7F2735")))]
    assert kinds == ["UDS_SECURITY_FAIL"]


def test_security_lockout_0x36():  # TC-UR-14
    assert run(ex("27020000", (0.01, "7F2736"))) == [("UDS_SECURITY_FAIL", "sid=0x27 nrc=0x36")]


def test_isotp_error_highest_priority():
    assert run(ex("22F190", isotp_error=True)) == [("ISOTP_SEQUENCE_ERROR", "sid=0x22")]


def test_timing_loaded_from_config():
    t = load_timing()
    assert (t.p2_s, t.p2_star_s, t.pending_loop_max) == (0.05, 5.0, 5)
