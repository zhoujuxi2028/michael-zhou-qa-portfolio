"""TC-INT-03：`cli demo` 端到端（DLT-14）。"""

import json

import pytest

from src.cli import main

pytestmark = pytest.mark.integration


def test_demo_end_to_end(tmp_path, capsys):  # TC-INT-03
    assert main(["demo", "--seed", "42", "--out", str(tmp_path)]) == 0
    for name in ("trace.log", "labels.json", "report.md", "report.json"):
        assert (tmp_path / name).exists(), name
    tests = list((tmp_path / "regression").glob("test_*.py"))
    assert tests
    metrics = json.loads((tmp_path / "report.json").read_text())["metrics"]
    assert metrics["regression_coverage"] == 1.0
    assert f"regression: {len(tests)} passed, 0 failed" in capsys.readouterr().out
