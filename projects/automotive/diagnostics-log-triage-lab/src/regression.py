"""Incident → 最小复现片段 + pytest 回归模板（DLT-11，architecture §6.3）。"""

from __future__ import annotations

import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from src.can_parser import EFF_MASK, load_dbc, parse_candump
from src.models import PROJECT_ROOT, CanFrame, Event, Incident, TriageResult
from src.uds import ECU_ID, TESTER_ID
from src.uds_rules import load_timing

MARKER_ID = 0x7FF  # 不在 DBC 中，规则忽略；只用于把 trace_end 推到超时判定点之后
CAN_WINDOW_PERIODS = 3
MAX_EVIDENCE = 5

TEMPLATE = '''"""Regression: {incident_id} / {kind} id={bus_id} {signature} ({priority}, {count} occurrences).

自动生成，勿手改。来源：diagnostics-log-triage-lab `src/regression.py`。
"""

from src.llm import NullBackend
from src.pipeline import run

TRACE = """
{trace}
"""


def test_{func}_detected():
    got = {{(i.kind, i.bus_id, i.signature): i.priority for i in run(TRACE, backend=NullBackend()).incidents}}
    key = ({kind!r}, {bus_id!r}, {signature!r})
    assert key in got, sorted(got)
    assert got[key] == {priority!r}
'''

CONFTEST = '''"""自动生成：让回归模板在任意目录下都能找到 src。"""

import os
import sys

ROOT = os.environ.get("DLT_PROJECT_ROOT", {root!r})
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
os.environ.setdefault("DLT_LLM", "off")
'''

PYTEST_INI = "[pytest]\naddopts = -q -p no:cacheprovider\n"


@dataclass
class RegressionReport:
    returncode: int
    passed: int
    failed: int
    output: str


def _marker(ts: float) -> str:
    return f"({ts:.6f}) can0 {MARKER_ID:03X}#00"


def snippet_lines(
    incident: Incident,
    events: dict[str, Event],
    lines: Sequence[str],
    frames: list[CanFrame] | None = None,
) -> list[str]:
    frames = frames if frames is not None else parse_candump(lines).frames
    by_line = {f.line_no: f for f in frames}
    evs = [events[e] for e in incident.evidence[:MAX_EVIDENCE]]
    picked: set[int] = set()

    if incident.bus_id == "ERR":
        cls = int(incident.signature.split("=", 1)[1], 16)
        for f in frames:
            if f.is_error and (f.can_id & EFF_MASK) == cls and any(abs(f.ts - e.ts) < 0.01 for e in evs):
                picked.add(f.line_no)
    elif evs and evs[0].source == "CAN":
        can_id = int(incident.bus_id, 16)
        period = load_dbc().get_message_by_frame_id(can_id).cycle_time / 1000
        margin = CAN_WINDOW_PERIODS * period
        windows = [(by_line[e.line_span[0]].ts - margin, by_line[e.line_span[1]].ts + margin) for e in evs]
        for f in frames:
            if f.can_id == can_id and not f.is_error and any(lo <= f.ts <= hi for lo, hi in windows):
                picked.add(f.line_no)
    else:
        for e in evs:
            lo, hi = e.line_span
            picked.update(ln for ln in range(lo, hi + 1) if ln in by_line and by_line[ln].can_id in (TESTER_ID, ECU_ID))

    out = [lines[ln - 1].strip() for ln in sorted(picked)]
    if evs and evs[0].source == "UDS":
        last = max(by_line[ln].ts for ln in picked)
        out.append(_marker(last + load_timing().p2_star_s + 0.2))
    return out


def _module_name(incident: Incident) -> str:
    return f"reg_{incident.incident_id.lower().replace('-', '_')}_{incident.kind.lower()}"


def write_tests(result: TriageResult, lines: Sequence[str], out_dir: str | Path) -> list[Path]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "conftest.py").write_text(CONFTEST.format(root=str(PROJECT_ROOT)), encoding="utf-8")
    (out / "pytest.ini").write_text(PYTEST_INI, encoding="utf-8")
    frames = parse_candump(lines).frames
    events = {e.event_id: e for e in result.events}
    files = []
    for inc in result.incidents:
        if not inc.regression_candidate:
            continue
        name = _module_name(inc)
        body = TEMPLATE.format(
            incident_id=inc.incident_id,
            kind=inc.kind,
            bus_id=inc.bus_id,
            signature=inc.signature,
            priority=inc.priority,
            count=inc.count,
            trace="\n".join(snippet_lines(inc, events, lines, frames)),
            func=name,
        )
        path = out / f"test_{name}.py"
        path.write_text(body, encoding="utf-8")
        files.append(path)
    return files


def run_tests(out_dir: str | Path) -> RegressionReport:
    out = Path(out_dir).resolve()
    junit = out / "junit.xml"
    env = {**os.environ, "PYTHONPATH": str(PROJECT_ROOT), "DLT_LLM": "off"}
    proc = subprocess.run(  # 固定参数，运行本项目生成的测试
        [sys.executable, "-m", "pytest", str(out), "-c", str(out / "pytest.ini"), f"--junitxml={junit}"],
        capture_output=True,
        text=True,
        cwd=out,
        env=env,
        check=False,
    )
    passed = failed = 0
    if junit.exists():
        for case in ET.parse(junit).getroot().iter("testcase"):
            if case.find("failure") is not None or case.find("error") is not None:
                failed += 1
            elif case.find("skipped") is None:
                passed += 1
    return RegressionReport(proc.returncode, passed, failed, proc.stdout + proc.stderr)
