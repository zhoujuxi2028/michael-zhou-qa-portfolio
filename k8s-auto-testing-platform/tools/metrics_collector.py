"""
K8S Auto Testing Platform - Metrics Collector

Utility functions for collecting and analyzing Prometheus metrics.
"""

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MetricSnapshot:
    """Snapshot of metrics at a point in time"""

    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    pod_count: int
    request_rate: float
    latency_p50: float
    latency_p95: float
    latency_p99: float
    scaling_events: Dict[str, int]


class MetricsCollector:
    """Collect metrics from Prometheus"""

    def __init__(
        self,
        prometheus_url: str = "http://localhost:9090",
        namespace: str = "k8s-testing",
    ):
        """
        Initialize metrics collector

        Args:
            prometheus_url: Prometheus server URL
            namespace: Kubernetes namespace
        """
        self.prometheus_url = prometheus_url.rstrip("/")
        self.namespace = namespace
        self.snapshots: List[MetricSnapshot] = []

    def query(self, query: str) -> Optional[float]:
        """
        Execute PromQL query and return first result

        Args:
            query: PromQL query string

        Returns:
            float: First metric value or None
        """
        try:
            response = requests.get(
                f"{self.prometheus_url}/api/v1/query",
                params={"query": query},
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            if data["status"] == "success" and data["data"]["result"]:
                return float(data["data"]["result"][0]["value"][1])
            return None
        except Exception as e:
            logger.error(f"Query failed: {e}")
            return None

    def query_range(
        self,
        query: str,
        start: datetime,
        end: datetime,
        step: str = "15s",
    ) -> List[Dict]:
        """
        Execute PromQL range query

        Args:
            query: PromQL query string
            start: Start time
            end: End time
            step: Query resolution

        Returns:
            list: List of metric data points
        """
        try:
            response = requests.get(
                f"{self.prometheus_url}/api/v1/query_range",
                params={
                    "query": query,
                    "start": start.timestamp(),
                    "end": end.timestamp(),
                    "step": step,
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            if data["status"] == "success":
                return data["data"]["result"]
            return []
        except Exception as e:
            logger.error(f"Range query failed: {e}")
            return []

    def collect_snapshot(self) -> MetricSnapshot:
        """
        Collect current metrics snapshot

        Returns:
            MetricSnapshot: Current metrics
        """
        snapshot = MetricSnapshot(
            timestamp=datetime.now(),
            cpu_usage=self.query("avg(app_cpu_usage_percent)") or 0,
            memory_usage=self.query("avg(app_memory_usage_percent)") or 0,
            pod_count=int(self.query("count(app_pod_info)") or 0),
            request_rate=self.query("sum(rate(http_requests_total[1m]))") or 0,
            latency_p50=self.query(
                "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))"
            )
            or 0,
            latency_p95=self.query(
                "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
            )
            or 0,
            latency_p99=self.query(
                "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
            )
            or 0,
            scaling_events=self._get_scaling_events(),
        )

        self.snapshots.append(snapshot)
        return snapshot

    def _get_scaling_events(self) -> Dict[str, int]:
        """Get scaling event counts"""
        events = {}
        event_types = [
            "cpu_load_started",
            "cpu_load_completed",
            "memory_load_started",
            "memory_allocated",
            "memory_released",
        ]

        for event_type in event_types:
            value = self.query(
                f'sum(app_scaling_events_total{{event_type="{event_type}"}})'
            )
            if value is not None:
                events[event_type] = int(value)

        return events

    def wait_for_cpu_threshold(
        self,
        threshold: float,
        above: bool = True,
        timeout: int = 120,
        interval: int = 5,
    ) -> bool:
        """
        Wait for CPU to cross threshold

        Args:
            threshold: CPU percentage threshold
            above: True to wait for above, False for below
            timeout: Maximum wait time in seconds
            interval: Check interval in seconds

        Returns:
            bool: True if threshold crossed
        """
        start_time = time.time()
        logger.info(f"Waiting for CPU {'above' if above else 'below'} {threshold}%")

        while time.time() - start_time < timeout:
            cpu = self.query("avg(app_cpu_usage_percent)")
            if cpu is not None:
                logger.info(f"Current CPU: {cpu:.1f}%")
                if above and cpu > threshold:
                    return True
                if not above and cpu < threshold:
                    return True
            time.sleep(interval)

        logger.warning("Timeout waiting for CPU threshold")
        return False

    def wait_for_pod_count(
        self,
        expected_count: int,
        comparison: str = ">=",
        timeout: int = 120,
        interval: int = 5,
    ) -> bool:
        """
        Wait for pod count to meet condition

        Args:
            expected_count: Expected pod count
            comparison: Comparison operator (>=, <=, ==, >, <)
            timeout: Maximum wait time in seconds
            interval: Check interval in seconds

        Returns:
            bool: True if condition met
        """
        start_time = time.time()
        logger.info(f"Waiting for pod count {comparison} {expected_count}")

        while time.time() - start_time < timeout:
            count = self.query("count(app_pod_info)")
            if count is not None:
                count = int(count)
                logger.info(f"Current pod count: {count}")

                if comparison == ">=" and count >= expected_count:
                    return True
                if comparison == "<=" and count <= expected_count:
                    return True
                if comparison == "==" and count == expected_count:
                    return True
                if comparison == ">" and count > expected_count:
                    return True
                if comparison == "<" and count < expected_count:
                    return True

            time.sleep(interval)

        logger.warning("Timeout waiting for pod count")
        return False

    def get_hpa_scaling_report(
        self,
        start: datetime,
        end: datetime,
    ) -> Dict:
        """
        Generate HPA scaling report for time period

        Args:
            start: Start time
            end: End time

        Returns:
            dict: Scaling report
        """
        report = {
            "period": {"start": start.isoformat(), "end": end.isoformat()},
            "pod_count": {},
            "cpu_usage": {},
            "memory_usage": {},
            "scaling_events": {},
        }

        # Pod count over time
        pod_data = self.query_range("count(app_pod_info)", start, end, "30s")
        if pod_data:
            values = [float(v[1]) for v in pod_data[0].get("values", [])]
            report["pod_count"] = {
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
                "avg": sum(values) / len(values) if values else 0,
            }

        # CPU usage over time
        cpu_data = self.query_range("avg(app_cpu_usage_percent)", start, end, "30s")
        if cpu_data:
            values = [float(v[1]) for v in cpu_data[0].get("values", [])]
            report["cpu_usage"] = {
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
                "avg": sum(values) / len(values) if values else 0,
            }

        # Memory usage over time
        mem_data = self.query_range("avg(app_memory_usage_percent)", start, end, "30s")
        if mem_data:
            values = [float(v[1]) for v in mem_data[0].get("values", [])]
            report["memory_usage"] = {
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
                "avg": sum(values) / len(values) if values else 0,
            }

        # Scaling events
        report["scaling_events"] = self._get_scaling_events()

        return report

    def export_snapshots(self, filepath: str) -> None:
        """
        Export collected snapshots to JSON

        Args:
            filepath: Output file path
        """
        data = [
            {
                "timestamp": s.timestamp.isoformat(),
                "cpu_usage": s.cpu_usage,
                "memory_usage": s.memory_usage,
                "pod_count": s.pod_count,
                "request_rate": s.request_rate,
                "latency_p50": s.latency_p50,
                "latency_p95": s.latency_p95,
                "latency_p99": s.latency_p99,
                "scaling_events": s.scaling_events,
            }
            for s in self.snapshots
        ]

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Exported {len(self.snapshots)} snapshots to {filepath}")

    def print_summary(self) -> None:
        """Print summary of collected snapshots"""
        if not self.snapshots:
            print("No snapshots collected")
            return

        cpu_values = [s.cpu_usage for s in self.snapshots]
        mem_values = [s.memory_usage for s in self.snapshots]
        pod_values = [s.pod_count for s in self.snapshots]

        print("\n" + "=" * 50)
        print("METRICS SUMMARY")
        print("=" * 50)
        print(f"Snapshots collected: {len(self.snapshots)}")
        print(
            f"Time range: {self.snapshots[0].timestamp} - {self.snapshots[-1].timestamp}"
        )
        print()
        print("CPU Usage:")
        print(f"  Min: {min(cpu_values):.1f}%")
        print(f"  Max: {max(cpu_values):.1f}%")
        print(f"  Avg: {sum(cpu_values)/len(cpu_values):.1f}%")
        print()
        print("Memory Usage:")
        print(f"  Min: {min(mem_values):.1f}%")
        print(f"  Max: {max(mem_values):.1f}%")
        print(f"  Avg: {sum(mem_values)/len(mem_values):.1f}%")
        print()
        print("Pod Count:")
        print(f"  Min: {min(pod_values)}")
        print(f"  Max: {max(pod_values)}")
        print("=" * 50)


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="K8S Auto Testing Platform - Metrics Collector"
    )
    parser.add_argument(
        "--prometheus-url",
        default="http://localhost:9090",
        help="Prometheus server URL",
    )
    parser.add_argument(
        "--namespace", default="k8s-testing", help="Kubernetes namespace"
    )
    parser.add_argument(
        "--action",
        choices=["snapshot", "watch", "report"],
        default="snapshot",
        help="Action to perform",
    )
    parser.add_argument(
        "--duration", type=int, default=60, help="Watch duration in seconds"
    )
    parser.add_argument(
        "--interval", type=int, default=5, help="Collection interval in seconds"
    )
    parser.add_argument("--output", "-o", help="Output file for export")

    args = parser.parse_args()

    collector = MetricsCollector(
        prometheus_url=args.prometheus_url,
        namespace=args.namespace,
    )

    if args.action == "snapshot":
        snapshot = collector.collect_snapshot()
        print(f"Timestamp: {snapshot.timestamp}")
        print(f"CPU Usage: {snapshot.cpu_usage:.1f}%")
        print(f"Memory Usage: {snapshot.memory_usage:.1f}%")
        print(f"Pod Count: {snapshot.pod_count}")
        print(f"Request Rate: {snapshot.request_rate:.2f} req/s")
        print(f"Latency p50: {snapshot.latency_p50*1000:.1f}ms")
        print(f"Latency p95: {snapshot.latency_p95*1000:.1f}ms")
        print(f"Latency p99: {snapshot.latency_p99*1000:.1f}ms")

    elif args.action == "watch":
        print(f"Watching metrics for {args.duration} seconds...")
        start_time = time.time()

        while time.time() - start_time < args.duration:
            collector.collect_snapshot()
            time.sleep(args.interval)

        collector.print_summary()

        if args.output:
            collector.export_snapshots(args.output)

    elif args.action == "report":
        from datetime import timedelta

        end = datetime.now()
        start = end - timedelta(minutes=15)
        report = collector.get_hpa_scaling_report(start, end)
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
