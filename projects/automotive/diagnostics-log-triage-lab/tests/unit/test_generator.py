"""TC-GEN-*：合成数据生成器（DLT-01）。"""

import ast
import itertools
import json
from pathlib import Path

import pytest

from src.can_parser import parse_candump
from src.generator import generate, load_scenario
from src.models import KINDS

SRC = Path(__file__).resolve().parents[2] / "src"


@pytest.fixture(scope="module")
def dev():
    return generate(seed=42, scenario="dev")


def test_same_seed_byte_identical(tmp_path):  # TC-GEN-01
    a, b = generate(seed=7, scenario="dev"), generate(seed=7, scenario="dev")
    a.write(tmp_path / "a")
    b.write(tmp_path / "b")
    for name in ("trace.log", "labels.json"):
        assert (tmp_path / "a" / name).read_bytes() == (tmp_path / "b" / name).read_bytes()


def test_different_seed_differs():  # TC-GEN-02
    assert generate(seed=1, scenario="dev").lines != generate(seed=2, scenario="dev").lines


def test_every_fault_has_label(dev):  # TC-GEN-03
    spec = load_scenario("dev")
    labelled = {(f["kind"], f["signature"]) for f in dev.labels["faults"]}
    expected = {(f["kind"], f["signature"]) for f in spec["faults"]}
    expected |= {("UDS_SECURITY_FAIL", a["signature"]) for f in spec["faults"] for a in f.get("attempt_labels", [])}
    assert labelled == expected
    ids = [f["fault_id"] for f in dev.labels["faults"]]
    assert len(ids) == len(set(ids))
    for f in dev.labels["faults"]:
        assert f["t_start"] <= f["t_end"] and f["expected_priority"] in ("P1", "P2")


def test_noise_not_labeled(dev):  # TC-GEN-04
    assert dev.noise, "dev profile 应注入噪声"
    for n in dev.noise:
        assert not any(f["t_start"] - 0.05 <= n["t"] <= f["t_end"] + 0.05 for f in dev.labels["faults"]), n


@pytest.mark.parametrize("name", ["dev", "eval"])
def test_all_kinds_covered(name):  # TC-GEN-05
    ds = generate(seed=1001, scenario=name)
    assert {f["kind"] for f in ds.labels["faults"]} == set(KINDS)


def test_generator_independent_of_triage_rules():  # TC-GEN-06
    tree = ast.parse((SRC / "generator.py").read_text())
    imported = {n.module for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)}
    imported |= {a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names}
    assert not {m for m in imported if m and ("triage" in m or "rules" in m)}
    assert "triage_rules" not in (SRC / "generator.py").read_text()


def test_labels_meta(dev):  # TC-GEN-07
    meta = dev.labels["meta"]
    assert meta["seed"] == 42 and meta["profile"] == "dev" and meta["total_lines"] == len(dev.lines)
    stats = parse_candump(dev.lines).stats
    assert stats.invalid_line_nos == meta["invalid_line_nos"] and len(meta["invalid_line_nos"]) == 2


def test_flow_control_emitted(dev):  # TC-GEN-08
    diag = [f for f in parse_candump(dev.lines).frames if f.can_id in (0x7E0, 0x7E8)]
    fc_after_ff = 0
    for a, b in itertools.pairwise(diag):
        if a.can_id == 0x7E8 and a.data[0] >> 4 == 1:
            assert b.can_id == 0x7E0 and b.data[0] == 0x30
            fc_after_ff += 1
    assert fc_after_ff > 0


def test_eval_profile_noise():
    ds = generate(seed=1001, scenario="eval")
    frames = parse_candump(ds.lines).frames
    assert any(f.can_id == 0x123 for f in frames)
    assert len(ds.labels["meta"]["invalid_line_nos"]) == 10  # 5 非法 + 5 截断副本
    assert {n["kind"] for n in ds.noise} >= {"single_pending", "suppress_no_response"}


def test_trace_sorted_and_written(tmp_path, dev):
    dev.write(tmp_path)
    labels = json.loads((tmp_path / "labels.json").read_text())
    assert labels == dev.labels
    ts = [f.ts for f in parse_candump(dev.lines).frames]
    assert ts == sorted(ts)


def test_unknown_scenario_rejected():
    with pytest.raises(FileNotFoundError):
        load_scenario("nope")
