#!/usr/bin/env python3
"""
OWASP ZAP Baseline Scan Script

Performs a quick passive scan against a target URL.
Suitable for CI/CD pipelines due to fast execution (2-5 minutes).

Usage:
    python zap-baseline.py --target http://localhost
    python zap-baseline.py --target http://localhost --report html
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# Add parent directory to path for utils import
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from zapv2 import ZAPv2
except ImportError:
    print("Error: python-owasp-zap-v2.4 not installed")
    print("Run: pip install python-owasp-zap-v2.4")
    sys.exit(1)


class ZAPBaselineScan:
    """OWASP ZAP Baseline Scanner"""

    def __init__(self, zap_host: str = "localhost", zap_port: int = 8090, api_key: str = ""):
        """Initialize ZAP connection.

        Args:
            zap_host: ZAP daemon host
            zap_port: ZAP daemon port
            api_key: ZAP API key (empty if disabled)
        """
        self.zap_host = zap_host
        self.zap_port = zap_port
        self.zap = ZAPv2(
            apikey=api_key,
            proxies={
                "http": f"http://{zap_host}:{zap_port}",
                "https": f"http://{zap_host}:{zap_port}",
            },
        )
        self.target = None
        self.scan_id = None

    def check_connection(self) -> bool:
        """Check if ZAP is accessible.

        Returns:
            True if ZAP is accessible, False otherwise
        """
        try:
            version = self.zap.core.version
            print(f"[+] Connected to ZAP version: {version}")
            return True
        except Exception as e:
            print(f"[-] Failed to connect to ZAP: {e}")
            return False

    def spider(self, target: str, max_duration: int = 60) -> int:
        """Spider the target URL.

        Args:
            target: Target URL to spider
            max_duration: Maximum spider duration in seconds

        Returns:
            Number of URLs found
        """
        print(f"[*] Starting spider on {target}")
        self.target = target

        # Start spider
        scan_id = self.zap.spider.scan(target)
        print(f"[*] Spider started with ID: {scan_id}")

        # Wait for spider to complete
        start_time = time.time()
        while int(self.zap.spider.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                print(f"[!] Spider timeout after {max_duration}s")
                self.zap.spider.stop(scan_id)
                break
            progress = self.zap.spider.status(scan_id)
            print(f"[*] Spider progress: {progress}%")
            time.sleep(2)

        # Get results
        urls = self.zap.spider.results(scan_id)
        print(f"[+] Spider found {len(urls)} URLs")
        return len(urls)

    def passive_scan(self, wait_time: int = 30) -> None:
        """Wait for passive scanning to complete.

        Args:
            wait_time: Maximum wait time in seconds
        """
        print("[*] Waiting for passive scan to complete...")

        start_time = time.time()
        while int(self.zap.pscan.records_to_scan) > 0:
            if time.time() - start_time > wait_time:
                print(f"[!] Passive scan timeout after {wait_time}s")
                break
            remaining = self.zap.pscan.records_to_scan
            print(f"[*] Records remaining: {remaining}")
            time.sleep(2)

        print("[+] Passive scan completed")

    def get_alerts(self) -> list:
        """Get all alerts from the scan.

        Returns:
            List of alert dictionaries
        """
        alerts = self.zap.core.alerts(baseurl=self.target)
        return alerts

    def get_summary(self, alerts: list) -> dict:
        """Generate alert summary by risk level.

        Args:
            alerts: List of alerts

        Returns:
            Summary dictionary with counts by risk level
        """
        summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}

        for alert in alerts:
            risk = alert.get("risk", "Informational")
            if risk in summary:
                summary[risk] += 1

        return summary

    def generate_report(self, output_dir: str, report_format: str = "html") -> str:
        """Generate scan report.

        Args:
            output_dir: Output directory for report
            report_format: Report format (html, json, xml)

        Returns:
            Path to generated report
        """
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"zap_baseline_{timestamp}.{report_format}"
        filepath = os.path.join(output_dir, filename)

        if report_format == "html":
            report = self.zap.core.htmlreport()
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(report)
        elif report_format == "json":
            report = self.zap.core.jsonreport()
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(report)
        elif report_format == "xml":
            report = self.zap.core.xmlreport()
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(report)

        print(f"[+] Report saved to: {filepath}")
        return filepath

    def run(self, target: str, output_dir: str = "./reports", report_format: str = "html") -> dict:
        """Run baseline scan.

        Args:
            target: Target URL
            output_dir: Report output directory
            report_format: Report format

        Returns:
            Scan results dictionary
        """
        print("=" * 60)
        print("OWASP ZAP Baseline Scan")
        print("=" * 60)

        # Check connection
        if not self.check_connection():
            return {"success": False, "error": "Cannot connect to ZAP"}

        # Spider target
        self.spider(target)

        # Wait for passive scan
        self.passive_scan()

        # Get alerts
        alerts = self.get_alerts()
        summary = self.get_summary(alerts)

        # Print summary
        print("\n" + "=" * 60)
        print("SCAN SUMMARY")
        print("=" * 60)
        print(f"Target: {target}")
        print(f"Total Alerts: {len(alerts)}")
        print(f"  - High:          {summary['High']}")
        print(f"  - Medium:        {summary['Medium']}")
        print(f"  - Low:           {summary['Low']}")
        print(f"  - Informational: {summary['Informational']}")
        print("=" * 60)

        # Generate report
        report_path = self.generate_report(output_dir, report_format)

        return {
            "success": True,
            "target": target,
            "total_alerts": len(alerts),
            "summary": summary,
            "report_path": report_path,
            "alerts": alerts,
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="OWASP ZAP Baseline Scan")
    parser.add_argument("--target", "-t", required=True, help="Target URL to scan")
    parser.add_argument("--zap-host", default="localhost", help="ZAP host (default: localhost)")
    parser.add_argument("--zap-port", type=int, default=8090, help="ZAP port (default: 8090)")
    parser.add_argument("--api-key", default="", help="ZAP API key")
    parser.add_argument("--output", "-o", default="./reports", help="Output directory")
    parser.add_argument(
        "--report", "-r", default="html", choices=["html", "json", "xml"], help="Report format"
    )

    args = parser.parse_args()

    # Run scan
    scanner = ZAPBaselineScan(
        zap_host=args.zap_host, zap_port=args.zap_port, api_key=args.api_key
    )

    results = scanner.run(target=args.target, output_dir=args.output, report_format=args.report)

    # Exit with error if high risk alerts found
    if results.get("success") and results.get("summary", {}).get("High", 0) > 0:
        print("\n[!] High risk vulnerabilities found!")
        sys.exit(1)

    sys.exit(0 if results.get("success") else 1)


if __name__ == "__main__":
    main()
