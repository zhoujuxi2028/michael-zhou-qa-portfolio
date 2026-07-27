#!/usr/bin/env python3
"""Scan a Python project and print a DefectPredictor risk ranking.

Usage:
    python scripts/scan_and_predict.py --path src/
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.code_scanner.scanner import CodeScanner, ScanError
from src.defect_predictor.predictor import DefectPredictor


def main():
    parser = argparse.ArgumentParser(description="Scan Python project and predict defect risk.")
    parser.add_argument("--path", required=True, help="Directory to scan (e.g. src/)")
    parser.add_argument("--git-root", default=None, help="Git root for git-based metrics (default: --path)")
    args = parser.parse_args()

    try:
        scanner = CodeScanner(base_path=args.path, git_root=args.git_root)
    except ScanError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning: {args.path}\n")
    metrics_list = scanner.scan()

    if not metrics_list:
        print("No Python files found.")
        return

    predictor = DefectPredictor()
    ranked = predictor.rank_modules_by_risk(metrics_list)

    header = f"{'Rank':<5} {'Module':<45} {'Score':>6} {'Level':<8} {'Defects':>7}"
    print(header)
    print("-" * len(header))
    for i, report in enumerate(ranked, 1):
        print(
            f"{i:<5} {report.module_name:<45} "
            f"{report.risk_score:>6.1f} {report.risk_level.value:<8} "
            f"{report.predicted_defects:>7}"
        )

    print(f"\nTotal modules: {len(ranked)}")
    high = sum(1 for r in ranked if r.risk_level.value == "HIGH")
    print(f"HIGH risk: {high}")


if __name__ == "__main__":
    main()
