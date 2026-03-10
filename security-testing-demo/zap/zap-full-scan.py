#!/usr/bin/env python3
"""
OWASP ZAP Full Scan Script

Performs comprehensive active scanning against a target URL.
Includes spidering, passive scanning, and active scanning.
Execution time: 15-30 minutes depending on target size.

Usage:
    python zap-full-scan.py --target http://localhost
    python zap-full-scan.py --target http://localhost --policy aggressive
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


class ZAPFullScan:
    """OWASP ZAP Full Scanner with Active Scanning"""

    # Scan policies
    POLICIES = {
        "default": "Default Policy",
        "aggressive": "Aggressive",
        "passive": "Passive Only",
    }

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

    def spider(self, target: str, max_duration: int = 120) -> int:
        """Spider the target URL with extended duration."""
        print(f"\n[*] Phase 1: Spidering {target}")
        self.target = target

        scan_id = self.zap.spider.scan(target)
        start_time = time.time()

        while int(self.zap.spider.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                print(f"[!] Spider timeout after {max_duration}s")
                self.zap.spider.stop(scan_id)
                break
            progress = self.zap.spider.status(scan_id)
            print(f"    Spider progress: {progress}%")
            time.sleep(5)

        urls = self.zap.spider.results(scan_id)
        print(f"[+] Spider completed: {len(urls)} URLs found")
        return len(urls)

    def ajax_spider(self, target: str, max_duration: int = 60) -> None:
        """Run AJAX spider for JavaScript-heavy applications."""
        print(f"\n[*] Phase 2: AJAX Spider on {target}")

        self.zap.ajaxSpider.scan(target)
        start_time = time.time()

        while self.zap.ajaxSpider.status == "running":
            if time.time() - start_time > max_duration:
                print(f"[!] AJAX Spider timeout after {max_duration}s")
                self.zap.ajaxSpider.stop()
                break
            print(f"    AJAX Spider status: {self.zap.ajaxSpider.status}")
            time.sleep(5)

        results = self.zap.ajaxSpider.results(start=0, count=100)
        print(f"[+] AJAX Spider completed: {len(results)} additional URLs")

    def passive_scan(self, wait_time: int = 60) -> None:
        """Wait for passive scanning."""
        print("\n[*] Phase 3: Passive Scanning")

        start_time = time.time()
        while int(self.zap.pscan.records_to_scan) > 0:
            if time.time() - start_time > wait_time:
                break
            remaining = self.zap.pscan.records_to_scan
            print(f"    Passive scan records remaining: {remaining}")
            time.sleep(5)

        print("[+] Passive scan completed")

    def active_scan(self, target: str, policy: str = "default", max_duration: int = 600) -> None:
        """Run active scanning against target.

        Args:
            target: Target URL
            policy: Scan policy (default, aggressive, passive)
            max_duration: Maximum scan duration in seconds
        """
        print(f"\n[*] Phase 4: Active Scanning ({policy} policy)")
        print("[!] Warning: Active scanning may modify target application data")

        # Start active scan
        scan_id = self.zap.ascan.scan(target)
        print(f"    Active scan started with ID: {scan_id}")

        start_time = time.time()
        while int(self.zap.ascan.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                print(f"[!] Active scan timeout after {max_duration}s")
                self.zap.ascan.stop(scan_id)
                break

            progress = self.zap.ascan.status(scan_id)
            alerts_count = len(self.zap.core.alerts(baseurl=target))
            print(f"    Active scan progress: {progress}% | Alerts: {alerts_count}")
            time.sleep(10)

        print("[+] Active scan completed")

    def get_alerts(self) -> list:
        """Get all alerts."""
        return self.zap.core.alerts(baseurl=self.target)

    def get_summary(self, alerts: list) -> dict:
        """Generate alert summary."""
        summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}
        for alert in alerts:
            risk = alert.get("risk", "Informational")
            if risk in summary:
                summary[risk] += 1
        return summary

    def generate_report(self, output_dir: str, report_format: str = "html") -> str:
        """Generate comprehensive report."""
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"zap_full_scan_{timestamp}.{report_format}"
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
        target: str,
        policy: str = "default",
        output_dir: str = "./reports",
        report_format: str = "html",
        skip_ajax: bool = False,
    ) -> dict:
        """Run full scan.

        Args:
            target: Target URL
            policy: Scan policy
            output_dir: Report directory
            report_format: Report format
            skip_ajax: Skip AJAX spider

        Returns:
            Scan results
        """
        print("=" * 60)
        print("OWASP ZAP Full Scan")
        print("=" * 60)
        print(f"Target: {target}")
        print(f"Policy: {policy}")
        print("=" * 60)

        if not self.check_connection():
            return {"success": False, "error": "Cannot connect to ZAP"}

        start_time = time.time()

        # Phase 1: Spider
        self.spider(target)

        # Phase 2: AJAX Spider (optional)
        if not skip_ajax:
            self.ajax_spider(target)

        # Phase 3: Passive Scan
        self.passive_scan()

        # Phase 4: Active Scan
        self.active_scan(target, policy)

        # Get results
        alerts = self.get_alerts()
        summary = self.get_summary(alerts)
        duration = time.time() - start_time

        # Print summary
        print("\n" + "=" * 60)
        print("FULL SCAN SUMMARY")
        print("=" * 60)
        print(f"Target: {target}")
        print(f"Duration: {duration:.1f} seconds")
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
            "duration": duration,
            "total_alerts": len(alerts),
            "summary": summary,
            "report_path": report_path,
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="OWASP ZAP Full Scan")
    parser.add_argument("--target", "-t", required=True, help="Target URL")
    parser.add_argument("--zap-host", default="localhost", help="ZAP host")
    parser.add_argument("--zap-port", type=int, default=8090, help="ZAP port")
    parser.add_argument("--api-key", default="", help="ZAP API key")
    parser.add_argument(
        "--policy", "-p", default="default", choices=["default", "aggressive"], help="Scan policy"
    )
    parser.add_argument("--output", "-o", default="./reports", help="Output directory")
    parser.add_argument("--report", "-r", default="html", choices=["html", "json", "xml"])
    parser.add_argument("--skip-ajax", action="store_true", help="Skip AJAX spider")

    args = parser.parse_args()

    scanner = ZAPFullScan(
        zap_host=args.zap_host, zap_port=args.zap_port, api_key=args.api_key
    )

    results = scanner.run(
        target=args.target,
        policy=args.policy,
        output_dir=args.output,
        report_format=args.report,
        skip_ajax=args.skip_ajax,
    )

    if results.get("success") and results.get("summary", {}).get("High", 0) > 0:
        print("\n[!] High risk vulnerabilities found!")
        sys.exit(1)

    sys.exit(0 if results.get("success") else 1)


if __name__ == "__main__":
    main()
