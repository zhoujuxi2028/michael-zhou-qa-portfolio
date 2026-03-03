"""
K8S Auto Testing Platform - Chaos Tester

Chaos engineering utilities for testing pod resilience and HPA behavior.
"""

import logging
import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

import requests
from kubernetes import client, config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ChaosResult:
    """Result of a chaos operation"""

    success: bool
    operation: str
    target: str
    duration: float
    error: Optional[str] = None
    metadata: Optional[Dict] = None


class ChaosTester:
    """Chaos engineering tester for K8S pods"""

    def __init__(
        self,
        namespace: str = "k8s-testing",
        service_url: Optional[str] = None,
    ):
        """
        Initialize chaos tester

        Args:
            namespace: Kubernetes namespace
            service_url: Optional service URL for health checks
        """
        # Load Kubernetes config
        try:
            config.load_kube_config()
        except Exception:
            config.load_incluster_config()

        self.namespace = namespace
        self.service_url = service_url
        self.core_v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()
        self.autoscaling_v2 = client.AutoscalingV2Api()

    def get_pods(
        self,
        label_selector: str = "app=test-app",
        phase: str = "Running",
    ) -> List[str]:
        """
        Get list of pod names

        Args:
            label_selector: Label selector
            phase: Pod phase filter

        Returns:
            list: List of pod names
        """
        pods = self.core_v1.list_namespaced_pod(
            namespace=self.namespace,
            label_selector=label_selector,
        )

        return [p.metadata.name for p in pods.items if p.status.phase == phase]

    def get_pod_count(self, label_selector: str = "app=test-app") -> int:
        """
        Get count of running pods

        Args:
            label_selector: Label selector

        Returns:
            int: Number of running pods
        """
        return len(self.get_pods(label_selector))

    def delete_pod_by_name(self, pod_name: str) -> ChaosResult:
        """
        Delete a specific pod

        Args:
            pod_name: Name of the pod to delete

        Returns:
            ChaosResult: Result of the operation
        """
        start_time = time.time()

        try:
            self.core_v1.delete_namespaced_pod(
                name=pod_name,
                namespace=self.namespace,
            )

            duration = time.time() - start_time
            logger.info(f"Deleted pod: {pod_name}")

            return ChaosResult(
                success=True,
                operation="delete_pod",
                target=pod_name,
                duration=duration,
            )

        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Failed to delete pod {pod_name}: {e}")

            return ChaosResult(
                success=False,
                operation="delete_pod",
                target=pod_name,
                duration=duration,
                error=str(e),
            )

    def delete_random_pod(
        self,
        label_selector: str = "app=test-app",
    ) -> ChaosResult:
        """
        Delete a random pod

        Args:
            label_selector: Label selector

        Returns:
            ChaosResult: Result of the operation
        """
        pods = self.get_pods(label_selector)

        if not pods:
            return ChaosResult(
                success=False,
                operation="delete_random_pod",
                target="none",
                duration=0,
                error="No pods found",
            )

        target_pod = random.choice(pods)
        logger.info(f"Selected random pod: {target_pod}")

        return self.delete_pod_by_name(target_pod)

    def delete_percentage_pods(
        self,
        percent: float,
        label_selector: str = "app=test-app",
    ) -> List[ChaosResult]:
        """
        Delete a percentage of pods

        Args:
            percent: Percentage of pods to delete (0-100)
            label_selector: Label selector

        Returns:
            list: Results for each deleted pod
        """
        pods = self.get_pods(label_selector)

        if not pods:
            return [
                ChaosResult(
                    success=False,
                    operation="delete_percentage",
                    target="none",
                    duration=0,
                    error="No pods found",
                )
            ]

        count_to_delete = max(1, int(len(pods) * percent / 100))
        pods_to_delete = random.sample(pods, count_to_delete)

        logger.info(
            f"Deleting {count_to_delete} pods ({percent}% of {len(pods)}): {pods_to_delete}"
        )

        results = []
        for pod in pods_to_delete:
            results.append(self.delete_pod_by_name(pod))

        return results

    def exhaust_cpu(
        self,
        pod_name: Optional[str] = None,
        duration: int = 30,
    ) -> ChaosResult:
        """
        Generate CPU load on a pod

        Args:
            pod_name: Target pod (uses service URL if not specified)
            duration: Duration of CPU load in seconds

        Returns:
            ChaosResult: Result of the operation
        """
        start_time = time.time()

        try:
            if self.service_url:
                url = f"{self.service_url}/cpu-load?duration={duration}"
            elif pod_name:
                pod = self.core_v1.read_namespaced_pod(
                    name=pod_name,
                    namespace=self.namespace,
                )
                pod_ip = pod.status.pod_ip
                url = f"http://{pod_ip}:8080/cpu-load?duration={duration}"
            else:
                return ChaosResult(
                    success=False,
                    operation="exhaust_cpu",
                    target="none",
                    duration=0,
                    error="No target specified",
                )

            logger.info(f"Generating CPU load for {duration}s: {url}")
            response = requests.get(url, timeout=duration + 10)

            elapsed = time.time() - start_time
            return ChaosResult(
                success=response.status_code == 200,
                operation="exhaust_cpu",
                target=pod_name or "service",
                duration=elapsed,
                metadata={"response": response.json()},
            )

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"CPU exhaustion failed: {e}")

            return ChaosResult(
                success=False,
                operation="exhaust_cpu",
                target=pod_name or "service",
                duration=elapsed,
                error=str(e),
            )

    def exhaust_memory(
        self,
        pod_name: Optional[str] = None,
        size_mb: int = 100,
    ) -> ChaosResult:
        """
        Allocate memory on a pod

        Args:
            pod_name: Target pod (uses service URL if not specified)
            size_mb: Memory size in MB

        Returns:
            ChaosResult: Result of the operation
        """
        start_time = time.time()

        try:
            if self.service_url:
                url = f"{self.service_url}/memory-load?size_mb={size_mb}"
            elif pod_name:
                pod = self.core_v1.read_namespaced_pod(
                    name=pod_name,
                    namespace=self.namespace,
                )
                pod_ip = pod.status.pod_ip
                url = f"http://{pod_ip}:8080/memory-load?size_mb={size_mb}"
            else:
                return ChaosResult(
                    success=False,
                    operation="exhaust_memory",
                    target="none",
                    duration=0,
                    error="No target specified",
                )

            logger.info(f"Allocating {size_mb}MB memory: {url}")
            response = requests.get(url, timeout=30)

            elapsed = time.time() - start_time
            return ChaosResult(
                success=response.status_code == 200,
                operation="exhaust_memory",
                target=pod_name or "service",
                duration=elapsed,
                metadata={"response": response.json()},
            )

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Memory exhaustion failed: {e}")

            return ChaosResult(
                success=False,
                operation="exhaust_memory",
                target=pod_name or "service",
                duration=elapsed,
                error=str(e),
            )

    def release_memory(self) -> ChaosResult:
        """
        Release all allocated memory

        Returns:
            ChaosResult: Result of the operation
        """
        start_time = time.time()

        try:
            if not self.service_url:
                return ChaosResult(
                    success=False,
                    operation="release_memory",
                    target="none",
                    duration=0,
                    error="Service URL not configured",
                )

            url = f"{self.service_url}/memory-release"
            response = requests.get(url, timeout=10)

            elapsed = time.time() - start_time
            return ChaosResult(
                success=response.status_code == 200,
                operation="release_memory",
                target="service",
                duration=elapsed,
                metadata={"response": response.json()},
            )

        except Exception as e:
            elapsed = time.time() - start_time
            return ChaosResult(
                success=False,
                operation="release_memory",
                target="service",
                duration=elapsed,
                error=str(e),
            )

    def restart_container(self, pod_name: str) -> ChaosResult:
        """
        Force restart a container by deleting the pod

        Args:
            pod_name: Target pod name

        Returns:
            ChaosResult: Result of the operation
        """
        # In K8S, restarting a container is effectively deleting the pod
        # The deployment controller will recreate it
        return self.delete_pod_by_name(pod_name)

    def wait_for_recovery(
        self,
        expected_replicas: int,
        timeout: int = 120,
        interval: int = 5,
        label_selector: str = "app=test-app",
    ) -> bool:
        """
        Wait for pods to recover to expected count

        Args:
            expected_replicas: Expected number of running pods
            timeout: Maximum wait time in seconds
            interval: Check interval in seconds
            label_selector: Label selector

        Returns:
            bool: True if recovery successful
        """
        start_time = time.time()
        logger.info(f"Waiting for {expected_replicas} pods to be ready...")

        while time.time() - start_time < timeout:
            current_count = self.get_pod_count(label_selector)
            logger.info(f"Current pod count: {current_count}/{expected_replicas}")

            if current_count >= expected_replicas:
                logger.info("Recovery successful!")
                return True

            time.sleep(interval)

        logger.error(
            f"Recovery timeout: only {self.get_pod_count(label_selector)} pods"
        )
        return False

    def verify_service_available(self, timeout: int = 30) -> bool:
        """
        Verify service is responding

        Args:
            timeout: Request timeout

        Returns:
            bool: True if service is available
        """
        if not self.service_url:
            logger.warning("Service URL not configured")
            return False

        try:
            response = requests.get(
                f"{self.service_url}/health",
                timeout=timeout,
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Service check failed: {e}")
            return False

    def get_hpa_status(self, hpa_name: str = "test-app-hpa") -> Dict:
        """
        Get HPA status

        Args:
            hpa_name: HPA name

        Returns:
            dict: HPA status
        """
        try:
            hpa = self.autoscaling_v2.read_namespaced_horizontal_pod_autoscaler(
                name=hpa_name,
                namespace=self.namespace,
            )

            return {
                "current_replicas": hpa.status.current_replicas,
                "desired_replicas": hpa.status.desired_replicas,
                "min_replicas": hpa.spec.min_replicas,
                "max_replicas": hpa.spec.max_replicas,
            }
        except Exception as e:
            logger.error(f"Failed to get HPA status: {e}")
            return {}

    def rolling_chaos(
        self,
        count: int = 3,
        interval: int = 10,
        label_selector: str = "app=test-app",
    ) -> List[ChaosResult]:
        """
        Perform rolling pod kills

        Args:
            count: Number of pods to kill sequentially
            interval: Interval between kills in seconds
            label_selector: Label selector

        Returns:
            list: Results for each operation
        """
        results = []

        for i in range(count):
            logger.info(f"Rolling chaos iteration {i + 1}/{count}")
            result = self.delete_random_pod(label_selector)
            results.append(result)

            if i < count - 1:
                time.sleep(interval)

        return results


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="K8S Auto Testing Platform - Chaos Tester"
    )
    parser.add_argument(
        "--namespace", default="k8s-testing", help="Kubernetes namespace"
    )
    parser.add_argument("--service-url", help="Service URL for load generation")
    parser.add_argument(
        "--action",
        choices=[
            "delete-random",
            "delete-percentage",
            "cpu-load",
            "memory-load",
            "rolling-chaos",
            "status",
        ],
        required=True,
        help="Chaos action to perform",
    )
    parser.add_argument(
        "--percent", type=float, default=50, help="Percentage for delete"
    )
    parser.add_argument(
        "--duration", type=int, default=30, help="Duration for CPU load"
    )
    parser.add_argument("--size-mb", type=int, default=100, help="Memory size in MB")
    parser.add_argument("--count", type=int, default=3, help="Count for rolling chaos")

    args = parser.parse_args()

    tester = ChaosTester(
        namespace=args.namespace,
        service_url=args.service_url,
    )

    if args.action == "delete-random":
        result = tester.delete_random_pod()
        print(f"Result: {result}")

    elif args.action == "delete-percentage":
        results = tester.delete_percentage_pods(args.percent)
        for result in results:
            print(f"Result: {result}")

    elif args.action == "cpu-load":
        result = tester.exhaust_cpu(duration=args.duration)
        print(f"Result: {result}")

    elif args.action == "memory-load":
        result = tester.exhaust_memory(size_mb=args.size_mb)
        print(f"Result: {result}")

    elif args.action == "rolling-chaos":
        results = tester.rolling_chaos(count=args.count)
        for result in results:
            print(f"Result: {result}")

    elif args.action == "status":
        print(f"Running pods: {tester.get_pod_count()}")
        print(f"HPA status: {tester.get_hpa_status()}")
        if args.service_url:
            print(f"Service available: {tester.verify_service_available()}")


if __name__ == "__main__":
    main()
