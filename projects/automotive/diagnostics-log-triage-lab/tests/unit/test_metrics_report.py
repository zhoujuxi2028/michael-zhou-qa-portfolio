"""TC-MT-* / TC-RP-*：指标口径（architecture §7）与报告（DLT-12）。"""

import json

import pytest

from src.generator import generate
from src.llm import NullBackend
from src.metrics import evaluate, tolerance
from src.models import Event, Incident, ParseStats, TriageResult
from src.pipeline import run
from src.regression import RegressionReport
from src.report import render, result_to_dict

BASE = 1700000000.0


def ev(i, kind, bus, sig, ts, cid, source="UDS"):
    return Event(f"E{i:05d}", BASE + ts, source, kind, bus, sig, kind, {}, (i, i), template_id=cid, cluster_id=cid)


def inc(iid, cid, kind, bus, sig, prio, evidence, candidate=False):
    return Incident(iid, cid, kind, bus, sig, prio, len(evidence), 0.0, 0.0, candidate, evidence)


def fault(fid, kind, bus, sig, t0, t1, prio):
    return {
        "fault_id": fid,
        "kind": kind,
        "bus_id": bus,
        "signature": sig,
        "t_start": BASE + t0,
        "t_end": BASE + t1,
        "expected_priority": prio,
    }


def labels(*faults, total=100, invalid=()):
    return {"meta": {"total_lines": total, "invalid_line_nos": list(invalid)}, "faults": list(faults)}


NRC = ("UDS_NRC", "0x7E0", "sid=0x22 nrc=0x31")


def result(events, incidents, ok=98, invalid=(3, 9)):
    stats = ParseStats(total=ok + len(invalid), invalid_line_nos=list(invalid))
    return TriageResult(stats, events, [], incidents, elapsed_s=0.5)


def test_metrics_known_fixture():  # TC-MT-01
    events = [ev(1, *NRC, 1.0, 0), ev(2, *NRC, 2.0, 0), ev(3, "UDS_PENDING_LOOP", "0x7E0", "sid=0x19", 3.0, 1)]
    incidents = [
        inc("C000-0", 0, *NRC, "P2", ["E00001", "E00002"], candidate=True),
        inc("C001-0", 1, "UDS_PENDING_LOOP", "0x7E0", "sid=0x19", "P2", ["E00003"]),
    ]
    lab = labels(
        fault("F001", *NRC, 1.0, 1.01, "P2"),
        fault("F002", *NRC, 2.0, 2.01, "P2"),
        fault("F003", "UDS_PENDING_LOOP", "0x7E0", "sid=0x19", 3.0, 3.3, "P1"),
        fault("F004", "UDS_P2_TIMEOUT", "0x7E0", "sid=0x22 timer=P2", 9.0, 9.05, "P1"),
        total=100,
        invalid=(3, 9),
    )
    m = evaluate(result(events, incidents), lab, RegressionReport(0, 1, 0, ""))
    assert m.recall == 0.75
    assert m.false_positive_rate == 0.0
    assert m.triage_accuracy == 0.5  # PENDING_LOOP 被判 P2，期望 P1
    assert m.parse_success_rate == 1.0 and m.invalid_lines_exact
    assert m.homogeneity == 1.0 and m.completeness == 1.0 and m.purity == 1.0
    assert m.regression_coverage == 1.0
    assert m.incidents == 2 and m.manual_estimate_min == 10


def test_match_tolerance():  # TC-MT-02
    assert tolerance("UDS_NRC", "0x7E0") == 0.05
    assert tolerance("UDS_P2_TIMEOUT", "0x7E0") == 5.0
    assert tolerance("CAN_CYCLE_LOSS", "0x100") == pytest.approx(0.06)
    lab = labels(fault("F001", *NRC, 1.0, 1.0, "P2"))
    inside = evaluate(result([ev(1, *NRC, 1.049, 0)], [inc("C0", 0, *NRC, "P2", ["E00001"])]), lab)
    outside = evaluate(result([ev(1, *NRC, 1.051, 0)], [inc("C0", 0, *NRC, "P2", ["E00001"])]), lab)
    assert inside.recall == 1.0 and outside.recall == 0.0


def test_unmatched_incident_is_false_positive():  # TC-MT-03
    events = [ev(1, *NRC, 1.0, 0), ev(2, "UDS_NRC", "0x7E0", "sid=0x10 nrc=0x12", 5.0, 1)]
    incidents = [
        inc("C0", 0, *NRC, "P2", ["E00001"]),
        inc("C1", 1, "UDS_NRC", "0x7E0", "sid=0x10 nrc=0x12", "P2", ["E00002"]),
    ]
    m = evaluate(result(events, incidents), labels(fault("F001", *NRC, 1.0, 1.0, "P2")))
    assert m.false_positive_rate == 0.5 and m.triage_accuracy == 1.0


def test_one_fault_many_incidents():  # TC-MT-04
    events = [ev(1, *NRC, 1.0, 0), ev(2, *NRC, 1.01, 1)]
    incidents = [inc("C0", 0, *NRC, "P2", ["E00001"]), inc("C1", 1, *NRC, "P2", ["E00002"])]
    m = evaluate(result(events, incidents), labels(fault("F001", *NRC, 1.0, 1.02, "P2")))
    assert m.triage_accuracy == 1.0 and m.completeness < 1.0


def test_one_incident_many_faults():  # TC-MT-05：多数投票，平票取 P1
    events = [ev(1, *NRC, 1.0, 0), ev(2, *NRC, 2.0, 0)]
    lab = labels(fault("F001", *NRC, 1.0, 1.0, "P1"), fault("F002", *NRC, 2.0, 2.0, "P2"))
    as_p1 = evaluate(result(events, [inc("C0", 0, *NRC, "P1", ["E00001", "E00002"])]), lab)
    as_p2 = evaluate(result(events, [inc("C0", 0, *NRC, "P2", ["E00001", "E00002"])]), lab)
    assert as_p1.triage_accuracy == 1.0 and as_p2.triage_accuracy == 0.0


def test_event_matches_at_most_one_fault():
    lab = labels(fault("F001", *NRC, 1.0, 1.0, "P2"), fault("F002", *NRC, 1.02, 1.02, "P2"))
    m = evaluate(result([ev(1, *NRC, 1.015, 0)], [inc("C0", 0, *NRC, "P2", ["E00001"])]), lab)
    assert m.recall == 0.5  # 只匹配 t_start 最近的 F002


@pytest.fixture(scope="module")
def dev_run():
    ds = generate(seed=42, scenario="dev")
    return ds, run(ds.lines, backend=NullBackend())


def test_metrics_on_dev(dev_run):
    ds, res = dev_run
    m = evaluate(res, ds.labels)
    assert m.recall == 1.0 and m.false_positive_rate == 0.0 and m.triage_accuracy == 1.0
    assert m.parse_success_rate == 1.0 and m.invalid_lines_exact


def test_llm_does_not_change_metrics(dev_run):  # TC-LLM-04（Metrics 部分）
    from types import SimpleNamespace

    from src.llm import ClaudeBackend

    ds, base = dev_run
    resp = SimpleNamespace(stop_reason="refusal", parsed_output=None)
    fake = SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(parse=lambda **_: resp)))
    with_llm = run(ds.lines, backend=ClaudeBackend(client=fake))
    a, b = evaluate(base, ds.labels).to_dict(), evaluate(with_llm, ds.labels).to_dict()
    a.pop("elapsed_s")
    b.pop("elapsed_s")
    assert a == b


def test_report_json_fields(dev_run, tmp_path):  # TC-RP-01
    ds, res = dev_run
    _, js = render(res, evaluate(res, ds.labels), tmp_path)
    data = json.loads(js.read_text())
    assert set(data) >= {"parse_stats", "events", "clusters", "incidents", "metrics"}
    assert data["incidents"][0]["priority"] in ("P1", "P2")
    assert {e["kind"] for e in data["events"]} and data["metrics"]["recall"] == 1.0
    assert result_to_dict(res)["incidents"] == data["incidents"]


def test_report_markdown_sections(dev_run, tmp_path):  # TC-RP-02
    ds, res = dev_run
    md, _ = render(res, evaluate(res, ds.labels), tmp_path)
    text = md.read_text()
    for heading in ("## 解析统计", "## Incident 分流", "## 聚类", "## 指标", "## 耗时对比"):
        assert heading in text
    assert "合成数据" in text and "估算" in text


def test_report_without_labels(dev_run, tmp_path):
    _, res = dev_run
    md, js = render(res, None, tmp_path)
    assert json.loads(js.read_text())["metrics"] is None
    assert "未提供 labels" in md.read_text()
