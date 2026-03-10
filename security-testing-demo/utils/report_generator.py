"""
Security Scan Report Generator

Generates formatted reports from security scan results.
"""

import json
import os
from datetime import datetime
from typing import Dict, List


class ReportGenerator:
    """Generate security scan reports."""

    def __init__(self, output_dir: str = "./reports"):
        """Initialize report generator.

        Args:
            output_dir: Directory to save reports
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_summary_report(
        self,
        scan_type: str,
        target: str,
        alerts: List[Dict],
        duration: float = 0,
    ) -> Dict:
        """Generate summary report.

        Args:
            scan_type: Type of scan (baseline, full, api)
            target: Target URL
            alerts: List of alerts
            duration: Scan duration in seconds

        Returns:
            Report dictionary
        """
        summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}

        for alert in alerts:
            risk = alert.get("risk", "Informational")
            if risk in summary:
                summary[risk] += 1

        report = {
            "scan_type": scan_type,
            "target": target,
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": duration,
            "total_alerts": len(alerts),
            "summary": summary,
            "high_risk_alerts": [a for a in alerts if a.get("risk") == "High"],
            "alerts": alerts,
        }

        return report

    def save_json_report(self, report: Dict, filename: str = None) -> str:
        """Save report as JSON.

        Args:
            report: Report dictionary
            filename: Optional filename

        Returns:
            Path to saved report
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"security_report_{timestamp}.json"

        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)

        return filepath

    def save_html_report(self, report: Dict, filename: str = None) -> str:
        """Save report as HTML.

        Args:
            report: Report dictionary
            filename: Optional filename

        Returns:
            Path to saved report
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"security_report_{timestamp}.html"

        filepath = os.path.join(self.output_dir, filename)

        html_content = self._generate_html(report)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)

        return filepath

    def _generate_html(self, report: Dict) -> str:
        """Generate HTML content from report.

        Args:
            report: Report dictionary

        Returns:
            HTML string
        """
        summary = report.get("summary", {})
        alerts = report.get("alerts", [])

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .header {{
            background-color: #1a1a2e;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }}
        .summary-card {{
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            color: white;
        }}
        .high {{ background-color: #dc3545; }}
        .medium {{ background-color: #fd7e14; }}
        .low {{ background-color: #ffc107; color: #333; }}
        .info {{ background-color: #17a2b8; }}
        .summary-card h2 {{
            margin: 0;
            font-size: 36px;
        }}
        .alert-table {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }}
        .alert-table th, .alert-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        .alert-table th {{
            background-color: #333;
            color: white;
        }}
        .risk-high {{ color: #dc3545; font-weight: bold; }}
        .risk-medium {{ color: #fd7e14; font-weight: bold; }}
        .risk-low {{ color: #ffc107; }}
        .risk-info {{ color: #17a2b8; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Scan Report</h1>
        <p><strong>Target:</strong> {report.get('target', 'N/A')}</p>
        <p><strong>Scan Type:</strong> {report.get('scan_type', 'N/A')}</p>
        <p><strong>Timestamp:</strong> {report.get('timestamp', 'N/A')}</p>
        <p><strong>Duration:</strong> {report.get('duration_seconds', 0):.1f} seconds</p>
    </div>

    <div class="summary">
        <div class="summary-card high">
            <h2>{summary.get('High', 0)}</h2>
            <p>High Risk</p>
        </div>
        <div class="summary-card medium">
            <h2>{summary.get('Medium', 0)}</h2>
            <p>Medium Risk</p>
        </div>
        <div class="summary-card low">
            <h2>{summary.get('Low', 0)}</h2>
            <p>Low Risk</p>
        </div>
        <div class="summary-card info">
            <h2>{summary.get('Informational', 0)}</h2>
            <p>Informational</p>
        </div>
    </div>

    <h2>Alerts ({len(alerts)})</h2>
    <table class="alert-table">
        <thead>
            <tr>
                <th>Risk</th>
                <th>Alert</th>
                <th>URL</th>
            </tr>
        </thead>
        <tbody>
"""

        for alert in alerts:
            risk = alert.get("risk", "Informational")
            risk_class = f"risk-{risk.lower()}"
            name = alert.get("name", "Unknown")
            url = alert.get("url", "N/A")[:80]

            html += f"""            <tr>
                <td class="{risk_class}">{risk}</td>
                <td>{name}</td>
                <td>{url}</td>
            </tr>
"""

        html += """        </tbody>
    </table>
</body>
</html>"""

        return html

    def print_summary(self, report: Dict) -> None:
        """Print summary to console.

        Args:
            report: Report dictionary
        """
        summary = report.get("summary", {})

        print("\n" + "=" * 60)
        print("SECURITY SCAN SUMMARY")
        print("=" * 60)
        print(f"Target: {report.get('target', 'N/A')}")
        print(f"Scan Type: {report.get('scan_type', 'N/A')}")
        print(f"Duration: {report.get('duration_seconds', 0):.1f} seconds")
        print(f"Total Alerts: {report.get('total_alerts', 0)}")
        print("-" * 60)
        print(f"  High:          {summary.get('High', 0)}")
        print(f"  Medium:        {summary.get('Medium', 0)}")
        print(f"  Low:           {summary.get('Low', 0)}")
        print(f"  Informational: {summary.get('Informational', 0)}")
        print("=" * 60)
