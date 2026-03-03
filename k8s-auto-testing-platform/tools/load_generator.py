"""
Load Generator Tool

Generates CPU and Memory load to trigger HPA scaling
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LoadGenerator:
    """Generate load on K8S application"""

    def __init__(self, base_url: str, namespace: str = "k8s-testing"):
        """
        Initialize load generator

        Args:
            base_url: Base URL of the application
            namespace: Kubernetes namespace
        """
        self.base_url = base_url.rstrip("/")
        self.namespace = namespace
        self.session = requests.Session()

    def generate_cpu_load(self, duration: int = 60, concurrency: int = 10) -> dict:
        """
        Generate CPU load

        Args:
            duration: Duration in seconds
            concurrency: Number of concurrent requests

        Returns:
            dict: Results with success/failure counts
        """
        logger.info(
            f"Generating CPU load: duration={duration}s, concurrency={concurrency}"
        )

        url = f"{self.base_url}/cpu-load?duration=10"

        results = {
            "success": 0,
            "failure": 0,
            "start_time": time.time(),
            "end_time": None,
        }

        start_time = time.time()

        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = []

            # Submit requests
            while time.time() - start_time < duration:
                future = executor.submit(self._make_request, url)
                futures.append(future)
                time.sleep(0.1)  # Small delay between requests

            # Collect results
            for future in as_completed(futures):
                try:
                    response = future.result()
                    if response.status_code == 200:
                        results["success"] += 1
                    else:
                        results["failure"] += 1
                except Exception as e:
                    logger.error(f"Request failed: {e}")
                    results["failure"] += 1

        results["end_time"] = time.time()

        logger.info(
            f"CPU load generation complete: {results['success']} success, {results['failure']} failures"
        )

        return results

    def generate_memory_load(self, size_mb: int = 100, count: int = 5) -> dict:
        """
        Generate memory load

        Args:
            size_mb: Memory size per allocation in MB
            count: Number of allocations

        Returns:
            dict: Results
        """
        logger.info(f"Generating memory load: {size_mb}MB x {count} allocations")

        url = f"{self.base_url}/memory-load?size_mb={size_mb}"

        results = {"success": 0, "failure": 0, "allocations": []}

        for i in range(count):
            try:
                response = self.session.get(url)
                if response.status_code == 200:
                    results["success"] += 1
                    results["allocations"].append(response.json())
                else:
                    results["failure"] += 1
            except Exception as e:
                logger.error(f"Memory allocation failed: {e}")
                results["failure"] += 1

            time.sleep(1)  # Small delay between allocations

        logger.info(f"Memory load generation complete: {results['success']} success")

        return results

    def release_memory(self) -> dict:
        """
        Release allocated memory

        Returns:
            dict: Result
        """
        logger.info("Releasing memory")

        url = f"{self.base_url}/memory-release"

        try:
            response = self.session.get(url)
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Memory released: {result}")
                return result
        except Exception as e:
            logger.error(f"Memory release failed: {e}")
            return {"error": str(e)}

    def continuous_load(self, duration: int = 300, interval: int = 5):
        """
        Generate continuous load

        Args:
            duration: Total duration in seconds
            interval: Interval between load bursts
        """
        logger.info(
            f"Starting continuous load: duration={duration}s, interval={interval}s"
        )

        start_time = time.time()

        while time.time() - start_time < duration:
            # Generate a burst of load
            self.generate_cpu_load(duration=10, concurrency=5)

            # Wait before next burst
            time.sleep(interval)

        logger.info("Continuous load complete")

    def _make_request(self, url: str, timeout: int = 30) -> requests.Response:
        """
        Make HTTP request

        Args:
            url: Request URL
            timeout: Request timeout

        Returns:
            Response object
        """
        return self.session.get(url, timeout=timeout)

    def health_check(self) -> bool:
        """
        Check if application is healthy

        Returns:
            bool: True if healthy
        """
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


def main():
    """Main function for CLI usage"""
    import argparse

    parser = argparse.ArgumentParser(description="K8S Load Generator")
    parser.add_argument("--url", required=True, help="Application URL")
    parser.add_argument("--duration", type=int, default=60, help="Duration in seconds")
    parser.add_argument(
        "--concurrency", type=int, default=10, help="Concurrent requests"
    )
    parser.add_argument(
        "--type",
        choices=["cpu", "memory", "continuous"],
        default="cpu",
        help="Load type",
    )

    args = parser.parse_args()

    generator = LoadGenerator(args.url)

    # Health check
    if not generator.health_check():
        logger.error("Application is not healthy")
        return

    # Generate load
    if args.type == "cpu":
        generator.generate_cpu_load(
            duration=args.duration, concurrency=args.concurrency
        )
    elif args.type == "memory":
        generator.generate_memory_load(size_mb=100, count=5)
    elif args.type == "continuous":
        generator.continuous_load(duration=args.duration)


if __name__ == "__main__":
    main()
