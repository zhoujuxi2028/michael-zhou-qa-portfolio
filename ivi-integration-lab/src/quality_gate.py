from dataclasses import dataclass


@dataclass
class GateResult:
    passed: bool
    reason: str


class QualityGate:
    def check_smoke_pass_rate(self, results: dict) -> GateResult:
        total, passed = results["total"], results["passed"]
        if passed < total:
            return GateResult(False, f"Smoke gate requires 100% pass: {passed}/{total}")
        return GateResult(True, "Smoke 100% passed")

    def check_flaky_rate(self, results: dict) -> GateResult:
        total, flaky = results["total"], results["flaky"]
        rate = flaky / total if total else 0
        if rate > 0.10:
            return GateResult(False, f"Flaky rate {rate:.0%} exceeds 10% threshold")
        return GateResult(True, f"Flaky rate {rate:.0%} within 10% threshold")

    def check_coverage(self, coverage_pct: float) -> GateResult:
        if coverage_pct < 80.0:
            return GateResult(
                False, f"Coverage {coverage_pct:.1f}% below 80% threshold"
            )
        return GateResult(True, f"Coverage {coverage_pct:.1f}% meets 80% threshold")
