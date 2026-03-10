#!/usr/bin/env python3
"""
OWASP ZAP API Scan Script

Scans REST APIs using OpenAPI/Swagger specifications.
Supports OpenAPI 3.0 and Swagger 2.0 formats.

Usage:
    python zap-api-scan.py --spec openapi.yaml --target http://localhost:3000
    python zap-api-scan.py --spec https://api.example.com/openapi.json
"""

import argparse
import os
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from zapv2 import ZAPv2
except ImportError:
    print("Error: python-owasp-zap-v2.4 not installed")
    sys.exit(1)


class ZAPAPIScan:
    """OWASP ZAP API Scanner"""

    def __init__(self, zap_host: str = "localhost", zap_port: int = 8090, api_key: str = ""):
        """Initialize ZAP connection."""
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

    def check_connection(self) -> bool:
        """Check ZAP connectivity."""
        try:
            version = self.zap.core.version
            print(f"[+] Connected to ZAP version: {version}")
            return True
        except Exception as e:
            print(f"[-] Failed to connect to ZAP: {e}")
            return False

    def import_openapi(self, spec_path: str, target: str = None) -> bool:
        """Import OpenAPI specification.

        Args:
            spec_path: Path or URL to OpenAPI spec
            target: Override target URL

        Returns:
            True if import successful
        """
        print(f"\n[*] Importing OpenAPI specification: {spec_path}")

        try:
            if spec_path.startswith("http"):
                # Import from URL
                result = self.zap.openapi.import_url(spec_path, target)
            else:
                # Import from file
                with open(spec_path, "r") as f:
                    spec_content = f.read()
                result = self.zap.openapi.import_file(spec_path, target)

            print(f"[+] OpenAPI import result: {result}")
            return True
        except Exception as e:
            print(f"[-] Failed to import OpenAPI spec: {e}")
            return False

    def spider_api(self, target: str, max_duration: int = 60) -> int:
        """Spider API endpoints."""
        print(f"\n[*] Spidering API: {target}")
        self.target = target

        scan_id = self.zap.spider.scan(target)
        start_time = time.time()

        while int(self.zap.spider.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                self.zap.spider.stop(scan_id)
                break
            print(f"    Spider progress: {self.zap.spider.status(scan_id)}%")
            time.sleep(3)

        urls = self.zap.spider.results(scan_id)
        print(f"[+] Found {len(urls)} API endpoints")
        return len(urls)

    def passive_scan(self, wait_time: int = 30) -> None:
        """Wait for passive scanning."""
        print("\n[*] Running passive scan...")
        start_time = time.time()

        while int(self.zap.pscan.records_to_scan) > 0:
            if time.time() - start_time > wait_time:
                break
            time.sleep(2)

        print("[+] Passive scan completed")

    def active_scan_api(self, target: str, max_duration: int = 300) -> None:
        """Run active scan on API endpoints."""
        print(f"\n[*] Running active API scan on {target}")

        scan_id = self.zap.ascan.scan(target)
        start_time = time.time()

        while int(self.zap.ascan.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                self.zap.ascan.stop(scan_id)
                break
            progress = self.zap.ascan.status(scan_id)
            print(f"    Active scan progress: {progress}%")
            time.sleep(5)

        print("[+] Active scan completed")

    def get_alerts(self) -> list:
        """Get all alerts."""
        return self.zap.core.alerts(baseurl=self.target)

    def get_api_specific_alerts(self, alerts: list) -> list:
        """Filter for API-specific vulnerabilities."""
        api_keywords = [
            "injection",
            "authentication",
            "authorization",
            "jwt",
            "token",
            "api",
            "json",
            "xml",
            "cors",
            "rate",
        ]

        api_alerts = []
        for alert in alerts:
            alert_name = alert.get("name", "").lower()
            alert_desc = alert.get("description", "").lower()

            if any(kw in alert_name or kw in alert_desc for kw in api_keywords):
                api_alerts.append(alert)

        return api_alerts

    def get_summary(self, alerts: list) -> dict:
        """Generate alert summary."""
        summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}
        for alert in alerts:
            risk = alert.get("risk", "Informational")
            if risk in summary:
                summary[risk] += 1
        return summary

    def generate_report(self, output_dir: str, report_format: str = "html") -> str:
        """Generate API scan report."""
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"zap_api_scan_{timestamp}.{report_format}"
        filepath = os.path.join(output_dir, filename)

        if report_format == "html":
            report = self.zap.core.htmlreport()
        elif report_format == "json":
            report = self.zap.core.jsonreport()
        else:
            report = self.zap.core.xmlreport()

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report)

        print(f"[+] Report saved to: {filepath}")
        return filepath

    def run(
        self,
        spec_path: str = None,
        target: str = None,
        output_dir: str = "./reports",
        report_format: str = "html",
        active_scan: bool = True,
    ) -> dict:
        """Run API scan.

        Args:
            spec_path: Path to OpenAPI spec
            target: Target API URL
            output_dir: Report directory
            report_format: Report format
            active_scan: Whether to run active scan

        Returns:
            Scan results
        """
        print("=" * 60)
        print("OWASP ZAP API Scan")
        print("=" * 60)

        if not self.check_connection():
            return {"success": False, "error": "Cannot connect to ZAP"}

        # Import OpenAPI spec if provided
        if spec_path:
            if not self.import_openapi(spec_path, target):
                print("[!] Warning: OpenAPI import failed, continuing with spider")

        # Spider API
        if target:
            self.spider_api(target)

        # Passive scan
        self.passive_scan()

        # Active scan (optional)
        if active_scan and target:
            self.active_scan_api(target)

        # Get results
        alerts = self.get_alerts()
        api_alerts = self.get_api_specific_alerts(alerts)
        summary = self.get_summary(alerts)

        # Print summary
        print("\n" + "=" * 60)
        print("API SCAN SUMMARY")
        print("=" * 60)
        print(f"Target: {target}")
        print(f"Total Alerts: {len(alerts)}")
        print(f"API-Specific Alerts: {len(api_alerts)}")
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
            "api_alerts": len(api_alerts),
            "summary": summary,
            "report_path": report_path,
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="OWASP ZAP API Scan")
    parser.add_argument("--spec", "-s", help="OpenAPI spec path or URL")
    parser.add_argument("--target", "-t", help="Target API URL")
    parser.add_argument("--zap-host", default="localhost", help="ZAP host")
    parser.add_argument("--zap-port", type=int, default=8090, help="ZAP port")
    parser.add_argument("--api-key", default="", help="ZAP API key")
    parser.add_argument("--output", "-o", default="./reports", help="Output directory")
    parser.add_argument("--report", "-r", default="html", choices=["html", "json", "xml"])
    parser.add_argument("--passive-only", action="store_true", help="Skip active scan")

    args = parser.parse_args()

    if not args.spec and not args.target:
        parser.error("Either --spec or --target is required")

    scanner = ZAPAPIScan(
        zap_host=args.zap_host, zap_port=args.zap_port, api_key=args.api_key
    )

    results = scanner.run(
        spec_path=args.spec,
        target=args.target,
        output_dir=args.output,
        report_format=args.report,
        active_scan=not args.passive_only,
    )

    if results.get("success") and results.get("summary", {}).get("High", 0) > 0:
        print("\n[!] High risk vulnerabilities found!")
        sys.exit(1)

    sys.exit(0 if results.get("success") else 1)


if __name__ == "__main__":
    main()
