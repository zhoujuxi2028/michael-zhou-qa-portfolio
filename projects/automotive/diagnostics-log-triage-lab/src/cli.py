"""命令行入口（DLT-14）：generate / triage / demo。"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from src.generator import generate
from src.metrics import evaluate
from src.pipeline import run
from src.regression import run_tests, write_tests
from src.report import render


def _generate(args) -> int:
    ds = generate(seed=args.seed, scenario=args.scenario)
    ds.write(args.out)
    print(f"generated {len(ds.lines)} lines, {len(ds.labels['faults'])} faults → {args.out}")
    return 0


def _triage(trace: Path, labels_path: Path | None, out: Path, run_regression: bool) -> int:
    if not trace.exists():
        print(f"trace not found: {trace}", file=sys.stderr)
        return 2
    lines = trace.read_text(encoding="utf-8").splitlines()
    result = run(lines)
    files = write_tests(result, lines, out / "regression")
    regression = run_tests(out / "regression") if run_regression and files else None
    labels = json.loads(labels_path.read_text(encoding="utf-8")) if labels_path else None
    metrics = evaluate(result, labels, regression) if labels else None
    md, _ = render(result, metrics, out, files)

    p1 = sum(i.priority == "P1" for i in result.incidents)
    print(f"{len(result.incidents)} incidents (P1={p1}), {len(files)} regression tests, report → {md}")
    if metrics:
        print(
            f"recall={metrics.recall:.1%} fp={metrics.false_positive_rate:.1%} "
            f"accuracy={metrics.triage_accuracy:.1%} completeness={metrics.completeness:.3f}"
        )
    if regression is not None:
        print(f"regression: {regression.passed} passed, {regression.failed} failed")
        return 0 if regression.returncode == 0 else 1
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m src.cli", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="生成合成 trace.log + labels.json")
    g.add_argument("--seed", type=int, default=42)
    g.add_argument("--scenario", default="dev")
    g.add_argument("--out", type=Path, default=Path("out"))

    t = sub.add_parser("triage", help="分流 + 报告 + 回归模板")
    t.add_argument("trace", type=Path)
    t.add_argument("--labels", type=Path)
    t.add_argument("--out", type=Path, default=Path("out"))
    t.add_argument("--run-regression", action="store_true")

    d = sub.add_parser("demo", help="generate → triage → 运行回归模板")
    d.add_argument("--seed", type=int, default=42)
    d.add_argument("--scenario", default="dev")
    d.add_argument("--out", type=Path, default=Path("out"))

    args = parser.parse_args(argv)
    if args.cmd == "generate":
        return _generate(args)
    if args.cmd == "triage":
        return _triage(args.trace, args.labels, args.out, args.run_regression)
    _generate(args)
    return _triage(args.out / "trace.log", args.out / "labels.json", args.out, run_regression=True)


if __name__ == "__main__":
    raise SystemExit(main())
