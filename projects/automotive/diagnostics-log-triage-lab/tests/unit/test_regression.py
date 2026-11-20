"""TC-RG-*：缺陷 → pytest 回归模板（DLT-11，architecture §6.3）。"""

import importlib.util
import subprocess
import sys

import pytest

from src.can_parser import parse_candump
from src.generator import generate
from src.llm import NullBackend
from src.models import PROJECT_ROOT
from src.pipeline import run
from src.regression import MARKER_ID, run_tests, snippet_lines, write_tests


@pytest.fixture(scope="module")
def generated(tmp_path_factory):
    ds = generate(seed=42, scenario="dev")
    result = run(ds.lines, backend=NullBackend())
    out = tmp_path_factory.mktemp("regression")
    files = write_tests(result, ds.lines, out)
    return ds, result, out, files


def test_one_file_per_candidate(generated):
    _, result, out, files = generated
    candidates = [i for i in result.incidents if i.regression_candidate]
    assert len(files) == len(candidates) > 0
    assert (out / "conftest.py").exists() and (out / "pytest.ini").exists()


def test_regression_file_collectable(generated):  # TC-RG-01
    _, _, out, files = generated
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            str(out),
            "--collect-only",
            "-p",
            "no:cacheprovider",
            "-c",
            str(out / "pytest.ini"),
        ],
        capture_output=True,
        text=True,
        cwd=out,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert f"{len(files)} tests collected" in proc.stdout


def test_regression_file_passes(generated):  # TC-RG-02
    _, _, out, files = generated
    report = run_tests(out)
    assert report.returncode == 0, report.output
    assert report.passed == len(files) and report.failed == 0


def _incident(result, kind, candidate=True):
    return next(i for i in result.incidents if i.kind == kind and (i.regression_candidate or not candidate))


def test_snippet_window(generated):  # TC-RG-03
    ds, result, _, _ = generated
    events = {e.event_id: e for e in result.events}

    can = _incident(result, "CAN_CYCLE_LOSS")
    snip = parse_candump(snippet_lines(can, events, ds.lines)).frames
    first = events[can.evidence[0]]
    assert min(f.ts for f in snip) <= first.ts - 0.06  # 前 3 个周期（0x100 周期 20 ms，含丢帧间隔）
    assert {f.can_id for f in snip} == {0x100}

    uds = _incident(result, "UDS_P2_TIMEOUT")
    frames = parse_candump(snippet_lines(uds, events, ds.lines)).frames
    assert frames[-1].can_id == MARKER_ID
    assert frames[-1].ts - events[uds.evidence[0]].ts > 5.0  # P2* 尾部
    assert {f.can_id for f in frames[:-1]} <= {0x7E0, 0x7E8}


def test_snippet_includes_flow_control(generated):
    ds, result, _, _ = generated
    events = {e.event_id: e for e in result.events}
    inc = _incident(result, "ISOTP_SEQUENCE_ERROR", candidate=False)
    data = [f.data for f in parse_candump(snippet_lines(inc, events, ds.lines)).frames]
    assert any(d[0] == 0x30 for d in data)


def test_regression_detects_removed_rule(generated, monkeypatch):  # TC-RG-04
    *_, files = generated
    target = next(p for p in files if "uds_nrc" in p.name)
    spec = importlib.util.spec_from_file_location("reg_mod", target)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    tests = [getattr(mod, n) for n in dir(mod) if n.startswith("test_")]
    for t in tests:
        t()  # 规则在时通过
    monkeypatch.setattr("src.uds_rules.detect", lambda *a, **k: [])
    for t in tests:
        with pytest.raises(AssertionError):
            t()


def test_generated_conftest_points_to_project(generated):
    _, _, out, _ = generated
    assert str(PROJECT_ROOT) in (out / "conftest.py").read_text()
