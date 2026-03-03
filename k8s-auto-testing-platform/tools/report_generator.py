"""
K8S Auto Testing Platform - Test Report Generator

Custom report generator for enhanced test metrics and summaries.
"""

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class TestResult:
    """Individual test result"""

    name: str
    outcome: str  # passed, failed, skipped, error
    duration: float
    markers: List[str] = field(default_factory=list)
    error_message: Optional[str] = None


@dataclass
class TestSummary:
    """Test execution summary"""

    total: int = 0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: int = 0
    duration: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class ReportGenerator:
    """Generate enhanced test reports with metrics"""

    def __init__(self, report_dir: str = "reports"):
        """
        Initialize report generator

        Args:
            report_dir: Directory to store reports
        """
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(exist_ok=True)
        self.results: List[TestResult] = []
        self.summary = TestSummary()

    def parse_pytest_output(self, output: str) -> None:
        """
        Parse pytest output to extract test results

        Args:
            output: Raw pytest output
        """
        # Reset results
        self.results = []
        self.summary = TestSummary()
        self.summary.start_time = datetime.now()

        # Parse test results
        test_pattern = re.compile(
            r"(\S+\.py::\S+)\s+(PASSED|FAILED|SKIPPED|ERROR)\s*\[?\s*(\d+)%?\]?"
        )

        for match in test_pattern.finditer(output):
            name, outcome, _ = match.groups()
            self.results.append(
                TestResult(
                    name=name,
                    outcome=outcome.lower(),
                    duration=0.0,  # Will be populated from JSON if available
                )
            )

        # Parse summary line
        summary_pattern = re.compile(
            r"=+ (\d+) passed(?:, (\d+) failed)?(?:, (\d+) skipped)?(?:, (\d+) error)?"
            r".*in ([\d.]+)s"
        )
        summary_match = summary_pattern.search(output)

        if summary_match:
            groups = summary_match.groups()
            self.summary.passed = int(groups[0]) if groups[0] else 0
            self.summary.failed = int(groups[1]) if groups[1] else 0
            self.summary.skipped = int(groups[2]) if groups[2] else 0
            self.summary.errors = int(groups[3]) if groups[3] else 0
            self.summary.duration = float(groups[4]) if groups[4] else 0.0
            self.summary.total = (
                self.summary.passed
                + self.summary.failed
                + self.summary.skipped
                + self.summary.errors
            )

        self.summary.end_time = datetime.now()

    def parse_junit_xml(self, xml_path: str) -> None:
        """
        Parse JUnit XML report for detailed results

        Args:
            xml_path: Path to JUnit XML file
        """
        try:
            import xml.etree.ElementTree as ET

            tree = ET.parse(xml_path)
            root = tree.getroot()

            self.results = []
            self.summary = TestSummary()

            for testsuite in root.findall(".//testsuite"):
                self.summary.total += int(testsuite.get("tests", 0))
                self.summary.failed += int(testsuite.get("failures", 0))
                self.summary.errors += int(testsuite.get("errors", 0))
                self.summary.skipped += int(testsuite.get("skipped", 0))
                self.summary.duration += float(testsuite.get("time", 0))

                for testcase in testsuite.findall("testcase"):
                    name = f"{testcase.get('classname')}::{testcase.get('name')}"
                    duration = float(testcase.get("time", 0))

                    # Determine outcome
                    failure = testcase.find("failure")
                    error = testcase.find("error")
                    skipped = testcase.find("skipped")

                    if failure is not None:
                        outcome = "failed"
                        error_msg = failure.get("message", "")
                    elif error is not None:
                        outcome = "error"
                        error_msg = error.get("message", "")
                    elif skipped is not None:
                        outcome = "skipped"
                        error_msg = skipped.get("message", "")
                    else:
                        outcome = "passed"
                        error_msg = None

                    self.results.append(
                        TestResult(
                            name=name,
                            outcome=outcome,
                            duration=duration,
                            error_message=error_msg,
                        )
                    )

            self.summary.passed = (
                self.summary.total
                - self.summary.failed
                - self.summary.errors
                - self.summary.skipped
            )

        except Exception as e:
            print(f"Error parsing JUnit XML: {e}")

    def generate_executive_summary(self) -> Dict:
        """
        Generate executive summary of test results

        Returns:
            dict: Executive summary data
        """
        pass_rate = (
            (self.summary.passed / self.summary.total * 100)
            if self.summary.total > 0
            else 0
        )

        # Group by test category
        categories: Dict[str, Dict] = {}
        for result in self.results:
            # Extract category from test name (e.g., test_deployment, test_hpa)
            parts = result.name.split("::")
            if len(parts) >= 2:
                category = parts[0].replace("tests/", "").replace(".py", "")
            else:
                category = "other"

            if category not in categories:
                categories[category] = {"passed": 0, "failed": 0, "skipped": 0}

            categories[category][result.outcome] = (
                categories[category].get(result.outcome, 0) + 1
            )

        return {
            "title": "K8S Auto Testing Platform - Test Report",
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": self.summary.duration,
            "duration_formatted": self._format_duration(self.summary.duration),
            "summary": {
                "total": self.summary.total,
                "passed": self.summary.passed,
                "failed": self.summary.failed,
                "skipped": self.summary.skipped,
                "errors": self.summary.errors,
                "pass_rate": round(pass_rate, 2),
            },
            "categories": categories,
            "status": "PASSED" if self.summary.failed == 0 else "FAILED",
        }

    def generate_html_report(self, output_path: Optional[str] = None) -> str:
        """
        Generate enhanced HTML report

        Args:
            output_path: Optional output path

        Returns:
            str: Path to generated report
        """
        summary = self.generate_executive_summary()

        if output_path is None:
            output_path = self.report_dir / "executive-summary.html"

        html_content = self._render_html_template(summary)

        with open(output_path, "w") as f:
            f.write(html_content)

        return str(output_path)

    def generate_json_report(self, output_path: Optional[str] = None) -> str:
        """
        Generate JSON report

        Args:
            output_path: Optional output path

        Returns:
            str: Path to generated report
        """
        summary = self.generate_executive_summary()
        summary["test_results"] = [
            {
                "name": r.name,
                "outcome": r.outcome,
                "duration": r.duration,
                "markers": r.markers,
                "error_message": r.error_message,
            }
            for r in self.results
        ]

        if output_path is None:
            output_path = self.report_dir / "test-results.json"

        with open(output_path, "w") as f:
            json.dump(summary, f, indent=2)

        return str(output_path)

    def _format_duration(self, seconds: float) -> str:
        """Format duration in human-readable format"""
        if seconds < 60:
            return f"{seconds:.2f}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = seconds % 60
            return f"{minutes}m {secs:.1f}s"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"

    def _render_html_template(self, summary: Dict) -> str:
        """Render HTML report template"""
        status_color = "#28a745" if summary["status"] == "PASSED" else "#dc3545"

        categories_html = ""
        for cat, stats in summary.get("categories", {}).items():
            cat_total = (
                stats.get("passed", 0)
                + stats.get("failed", 0)
                + stats.get("skipped", 0)
            )
            cat_pass_rate = (
                (stats.get("passed", 0) / cat_total * 100) if cat_total > 0 else 0
            )
            categories_html += f"""
            <tr>
                <td>{cat}</td>
                <td>{stats.get('passed', 0)}</td>
                <td>{stats.get('failed', 0)}</td>
                <td>{stats.get('skipped', 0)}</td>
                <td>{cat_pass_rate:.1f}%</td>
            </tr>
            """

        test_results_html = ""
        for result in self.results:
            outcome_color = {
                "passed": "#28a745",
                "failed": "#dc3545",
                "skipped": "#ffc107",
                "error": "#dc3545",
            }.get(result.outcome, "#6c757d")

            test_results_html += f"""
            <tr>
                <td>{result.name}</td>
                <td style="color: {outcome_color}; font-weight: bold;">
                    {result.outcome.upper()}
                </td>
                <td>{result.duration:.3f}s</td>
            </tr>
            """

        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K8S Auto Testing Platform - Test Report</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
        }}
        .header h1 {{ font-size: 2em; margin-bottom: 10px; }}
        .header .timestamp {{ opacity: 0.8; font-size: 0.9em; }}
        .status-badge {{
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.2em;
            background: {status_color};
            margin-top: 15px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .metric-card {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }}
        .metric-value {{
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }}
        .metric-label {{ color: #666; margin-top: 5px; }}
        .metric-card.passed .metric-value {{ color: #28a745; }}
        .metric-card.failed .metric-value {{ color: #dc3545; }}
        .metric-card.skipped .metric-value {{ color: #ffc107; }}
        .section {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}
        .section h2 {{
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f8f9fa; color: #666; font-weight: 600; }}
        tr:hover {{ background: #f8f9fa; }}
        .progress-bar {{
            height: 20px;
            background: #eee;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 15px;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>K8S Auto Testing Platform</h1>
            <p class="timestamp">Generated: {summary['timestamp']}</p>
            <p class="timestamp">Duration: {summary['duration_formatted']}</p>
            <span class="status-badge">{summary['status']}</span>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">{summary['summary']['total']}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card passed">
                <div class="metric-value">{summary['summary']['passed']}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card failed">
                <div class="metric-value">{summary['summary']['failed']}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card skipped">
                <div class="metric-value">{summary['summary']['skipped']}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{summary['summary']['pass_rate']}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
        </div>

        <div class="section">
            <h2>Test Progress</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {summary['summary']['pass_rate']}%"></div>
            </div>
        </div>

        <div class="section">
            <h2>Results by Category</h2>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Skipped</th>
                        <th>Pass Rate</th>
                    </tr>
                </thead>
                <tbody>
                    {categories_html}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Outcome</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {test_results_html}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>K8S Auto Testing Platform - Phase 3 Enhanced Reporting</p>
            <p>Generated by ReportGenerator</p>
        </div>
    </div>
</body>
</html>
        """


def run_tests_and_generate_report(
    test_path: str = "tests/",
    markers: Optional[str] = None,
    output_dir: str = "reports",
) -> int:
    """
    Run pytest and generate enhanced reports

    Args:
        test_path: Path to tests
        markers: Optional pytest markers
        output_dir: Output directory for reports

    Returns:
        int: Exit code
    """
    # Build pytest command
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        test_path,
        "-v",
        f"--junitxml={output_dir}/junit-results.xml",
        f"--html={output_dir}/test-report.html",
        "--self-contained-html",
    ]

    if markers:
        cmd.extend(["-m", markers])

    # Run pytest
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    print(result.stdout)
    if result.stderr:
        print(result.stderr)

    # Generate enhanced report
    generator = ReportGenerator(output_dir)

    # Try to parse JUnit XML first
    junit_path = f"{output_dir}/junit-results.xml"
    if os.path.exists(junit_path):
        generator.parse_junit_xml(junit_path)
    else:
        generator.parse_pytest_output(result.stdout)

    # Generate reports
    html_path = generator.generate_html_report()
    json_path = generator.generate_json_report()

    print("\nReports generated:")
    print(f"  HTML: {html_path}")
    print(f"  JSON: {json_path}")
    print(f"  JUnit: {junit_path}")

    return result.returncode


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="K8S Auto Testing Platform - Report Generator"
    )
    parser.add_argument(
        "--test-path", default="tests/", help="Path to tests (default: tests/)"
    )
    parser.add_argument("--markers", "-m", help="Pytest markers to filter tests")
    parser.add_argument(
        "--output-dir", "-o", default="reports", help="Output directory for reports"
    )
    parser.add_argument(
        "--junit-xml", help="Parse existing JUnit XML instead of running tests"
    )

    args = parser.parse_args()

    if args.junit_xml:
        # Just generate report from existing JUnit XML
        generator = ReportGenerator(args.output_dir)
        generator.parse_junit_xml(args.junit_xml)
        html_path = generator.generate_html_report()
        json_path = generator.generate_json_report()
        print(f"Reports generated from {args.junit_xml}:")
        print(f"  HTML: {html_path}")
        print(f"  JSON: {json_path}")
        return 0

    return run_tests_and_generate_report(
        test_path=args.test_path,
        markers=args.markers,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    sys.exit(main())
