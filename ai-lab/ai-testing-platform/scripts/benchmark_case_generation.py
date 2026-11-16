#!/usr/bin/env python3
"""Reproducible benchmark for AI test-case generation.

Measures the *pure* engine time of TestCaseGenerator.generate_from_requirement
on a fixed input (docs/requirements/LOGIN-REQUIREMENTS.md) over many iterations,
and reports summary statistics. Output is written to docs/qa/ for traceability.

Usage:
    python3 scripts/benchmark_case_generation.py [--iterations 50]
"""

import argparse
import json
import platform
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.case_generator.generator import TestCaseGenerator

REQ_FILE = Path(__file__).parent.parent / "docs/requirements/LOGIN-REQUIREMENTS.md"
OUT_FILE = Path(__file__).parent.parent / "docs/qa/case-generation-benchmark.json"


def run(iterations: int) -> dict:
    req_text = REQ_FILE.read_text(encoding="utf-8")
    gen = TestCaseGenerator()

    # Warm-up (exclude first-call import/lazy cost from the sample)
    gen.generate_from_requirement(req_text, module="login")

    samples_ms = []
    for _ in range(iterations):
        start = time.perf_counter()
        cases = gen.generate_from_requirement(req_text, module="login")
        samples_ms.append((time.perf_counter() - start) * 1000.0)

    coverage = gen.analyze_coverage(cases)
    samples_sorted = sorted(samples_ms)

    return {
        "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor() or platform.machine(),
        },
        "input": str(REQ_FILE.relative_to(REQ_FILE.parent.parent.parent)),
        "iterations": iterations,
        "cases_per_run": len(cases),
        "coverage_score": coverage["coverage_score"],
        "by_type": coverage["by_type"],
        "by_priority": coverage["by_priority"],
        "ms": {
            "min": round(samples_sorted[0], 3),
            "median": round(statistics.median(samples_ms), 3),
            "mean": round(statistics.fmean(samples_ms), 3),
            "max": round(samples_sorted[-1], 3),
            "std": round(statistics.pstdev(samples_ms), 3),
            "p95": round(samples_sorted[max(0, int(len(samples_sorted) * 0.95) - 1)], 3),
        },
        "samples_ms": [round(s, 3) for s in samples_ms],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=50)
    args = parser.parse_args()

    result = run(args.iterations)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    ms = result["ms"]
    print(f"iterations : {result['iterations']}")
    print(f"cases/run  : {result['cases_per_run']}  (coverage_score={result['coverage_score']})")
    print(
        f"per-run ms : median={ms['median']}  mean={ms['mean']}  "
        f"min={ms['min']}  max={ms['max']}  std={ms['std']}  p95={ms['p95']}"
    )
    print(f"written    : {OUT_FILE}")


if __name__ == "__main__":
    main()
