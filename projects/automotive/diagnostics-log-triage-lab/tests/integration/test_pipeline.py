"""TC-INT-01/02/04：eval profile 指标阈值、耗时、手写对抗样本（test-plan 阈值表）。"""

import json
from pathlib import Path

import pytest

from src.generator import generate
from src.llm import NullBackend
from src.metrics import evaluate
from src.pipeline import run
from src.regression import run_tests, write_tests

pytestmark = pytest.mark.integration

EVAL_SEEDS = (1001, 1002, 1003, 1004, 1005)
FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "adversarial"


@pytest.fixture(scope="module")
def eval_runs(tmp_path_factory):
    out = tmp_path_factory.mktemp("eval_regression")
    runs = {}
    for seed in EVAL_SEEDS:
        ds = generate(seed=seed, scenario="eval")
        res = run(ds.lines, backend=NullBackend())
        files = write_tests(res, ds.lines, out, prefix=f"s{seed}_")
        runs[seed] = (ds, res, files)
    report = run_tests(out)  # 5 个 seed 的回归模板一次运行
    return runs, report


def test_eval_seeds_meet_thresholds(eval_runs):  # TC-INT-01
    runs, report = eval_runs
    assert report.returncode == 0, report.output[-2000:]
    total_files = sum(len(files) for _, _, files in runs.values())
    assert report.passed == total_files and report.failed == 0  # 回归覆盖率 = 100%
    for seed, (ds, res, _) in runs.items():
        m = evaluate(res, ds.labels)
        assert m.parse_success_rate >= 0.995, seed
        assert m.invalid_lines_exact, seed
        assert m.recall >= 0.95, (seed, m)
        assert m.false_positive_rate <= 0.10, (seed, m)
        assert m.triage_accuracy >= 0.90, (seed, m)
        assert m.homogeneity >= 0.90, (seed, m)
        assert m.completeness >= 0.80, (seed, m)


def test_pipeline_runtime():  # TC-INT-02
    ds = generate(seed=1001, scenario="eval")
    run(ds.lines[:100], backend=NullBackend())  # 预热导入，不计入
    res = run(ds.lines, backend=NullBackend())
    assert ds.labels["meta"]["duration_s"] == 60
    assert res.elapsed_s <= 10.0


# 手写对抗样本中已知的规则缺口（发现于 Stage 3，未为迎合样本而调规则）
KNOWN_MISSES = {"A12"}  # tester 侧 ISO-TP 序号错误：只检查 ECU 响应方向
KNOWN_PRIORITY_GAPS = {
    ("CAN_SIGNAL_OUT_OF_RANGE", "0x100", "signal=VehicleSpeed"),  # 安全报文单次越界：规则 P2，判断 P1
    ("CAN_ERROR_FRAME", "ERR", "class=0x040"),  # 1 s 内 2 次 bus-off：规则需 3 次
}


def test_adversarial_fixture():  # TC-INT-04
    lines = (FIXTURE / "trace.log").read_text().splitlines()
    labels = json.loads((FIXTURE / "labels.json").read_text())
    res = run(lines, backend=NullBackend())
    m = evaluate(res, labels)

    assert m.invalid_lines_exact and m.parse_success_rate == 1.0
    assert m.false_positive_rate == 0.0  # 所有边界负例（2.4×、=max、回绕、3E 80、48 ms、5 次 0x78）均不告警
    assert m.recall >= 0.90 and m.triage_accuracy >= 0.80

    detected = {(i.kind, i.bus_id, i.signature): i.priority for i in res.incidents}
    missed = {f["fault_id"] for f in labels["faults"] if (f["kind"], f["bus_id"], f["signature"]) not in detected}
    assert missed == KNOWN_MISSES
    gaps = {
        (f["kind"], f["bus_id"], f["signature"])
        for f in labels["faults"]
        if (key := (f["kind"], f["bus_id"], f["signature"])) in detected and detected[key] != f["expected_priority"]
    }
    assert gaps == KNOWN_PRIORITY_GAPS
