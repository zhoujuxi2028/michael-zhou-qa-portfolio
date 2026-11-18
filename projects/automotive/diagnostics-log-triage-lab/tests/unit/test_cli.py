"""TC-CLI-01：CLI generate / triage（DLT-14）。demo 端到端见 tests/integration。"""

import json

from src.cli import main


def test_cli_generate_and_triage(tmp_path, capsys):  # TC-CLI-01
    assert main(["generate", "--seed", "42", "--scenario", "dev", "--out", str(tmp_path)]) == 0
    assert (tmp_path / "trace.log").exists() and (tmp_path / "labels.json").exists()

    out = tmp_path / "result"
    rc = main(["triage", str(tmp_path / "trace.log"), "--labels", str(tmp_path / "labels.json"), "--out", str(out)])
    assert rc == 0
    for name in ("report.md", "report.json"):
        assert (out / name).exists()
    assert list((out / "regression").glob("test_*.py"))
    data = json.loads((out / "report.json").read_text())
    assert data["metrics"]["recall"] == 1.0
    assert "incidents" in capsys.readouterr().out


def test_cli_triage_without_labels(tmp_path):
    main(["generate", "--seed", "1", "--out", str(tmp_path)])
    assert main(["triage", str(tmp_path / "trace.log"), "--out", str(tmp_path / "r")]) == 0
    assert json.loads((tmp_path / "r" / "report.json").read_text())["metrics"] is None


def test_cli_missing_trace(tmp_path, capsys):
    assert main(["triage", str(tmp_path / "nope.log"), "--out", str(tmp_path)]) == 2
    assert "not found" in capsys.readouterr().err
