"""
Kubernetes Helper Functions

Utility functions for K8S operations
"""

import logging
import time
from typing import Dict, Optional

from kubernetes import client, config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class K8sHelper:
    """Helper class for Kubernetes operations"""

    def __init__(self, namespace: str = "k8s-testing"):
        """
        Initialize K8S helper

        Args:
            namespace: Kubernetes namespace
        """
        # Load config
        try:
            config.load_kube_config()
        except Exception:
            config.load_incluster_config()

        self.namespace = namespace
        self.core_v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()
        self.autoscaling_v2 = client.AutoscalingV2Api()

    def get_pod_count(self, label_selector: str = "app=test-app") -> int:
        """
        Get number of running pods

        Args:
            label_selector: Label selector

        Returns:
            int: Number of running pods
        """
        pods = self.core_v1.list_namespaced_pod(namespace=self.namespace, label_selector=label_selector)

        running_pods = [p for p in pods.items if p.status.phase == "Running"]

        return len(running_pods)

    def get_deployment_replicas(self, deployment_name: str) -> Dict[str, int]:
        """
        Get deployment replica counts

        Args:
            deployment_name: Deployment name

        Returns:
            dict: Replica counts
        """
        deployment = self.apps_v1.read_namespaced_deployment(name=deployment_name, namespace=self.namespace)

        return {
            "desired": deployment.spec.replicas,
            "ready": deployment.status.ready_replicas or 0,
            "available": deployment.status.available_replicas or 0,
            "unavailable": deployment.status.unavailable_replicas or 0,
        }

    def get_hpa_status(self, hpa_name: str) -> Dict:
        """
        Get HPA status

        Args:
            hpa_name: HPA name

        Returns:
            dict: HPA status
        """
        hpa = self.autoscaling_v2.read_namespaced_horizontal_pod_autoscaler(name=hpa_name, namespace=self.namespace)

        status = {
            "current_replicas": hpa.status.current_replicas,
            "desired_replicas": hpa.status.desired_replicas,
            "min_replicas": hpa.spec.min_replicas,
            "max_replicas": hpa.spec.max_replicas,
            "metrics": [],
        }

        if hpa.status.current_metrics:
            for metric in hpa.status.current_metrics:
                if metric.resource:
                    status["metrics"].append(
                        {
                            "name": metric.resource.name,
                            "current": metric.resource.current.average_utilization,
                        }
                    )

        return status

    def wait_for_pods_ready(self, count: int, label_selector: str = "app=test-app", timeout: int = 120) -> bool:
        """
        Wait for pods to be ready

        Args:
            count: Expected pod count
            label_selector: Label selector
            timeout: Timeout in seconds

        Returns:
            bool: True if ready
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            ready_count = self.get_pod_count(label_selector)

            if ready_count >= count:
                logger.info(f"Pods ready: {ready_count}/{count}")
                return True

            logger.info(f"Waiting for pods: {ready_count}/{count}")
            time.sleep(5)

        logger.error(f"Timeout waiting for pods: {self.get_pod_count(label_selector)}/{count}")
        return False

    def delete_pod(self, pod_name: str) -> bool:
        """
        Delete a pod

        Args:
            pod_name: Pod name

        Returns:
            bool: True if successful
        """
        try:
            self.core_v1.delete_namespaced_pod(name=pod_name, namespace=self.namespace)
            logger.info(f"Deleted pod: {pod_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete pod {pod_name}: {e}")
            return False

    def get_pod_logs(self, pod_name: str, container: Optional[str] = None, tail_lines: int = 100) -> str:
        """
        Get pod logs

        Args:
            pod_name: Pod name
            container: Container name (optional)
            tail_lines: Number of lines to tail

        Returns:
            str: Pod logs
        """
        try:
            logs = self.core_v1.read_namespaced_pod_log(
                name=pod_name,
                namespace=self.namespace,
                container=container,
                tail_lines=tail_lines,
            )
            return logs
        except Exception as e:
            logger.error(f"Failed to get logs for {pod_name}: {e}")
            return ""

    def get_service_endpoint(self, service_name: str) -> Optional[str]:
        """
        Get service endpoint

        Args:
            service_name: Service name

        Returns:
            str: Service endpoint URL
        """
        try:
            service = self.core_v1.read_namespaced_service(name=service_name, namespace=self.namespace)

            cluster_ip = service.spec.cluster_ip
            port = service.spec.ports[0].port

            return f"http://{cluster_ip}:{port}"
        except Exception as e:
            logger.error(f"Failed to get service endpoint: {e}")
            return None


def main():
    """Main function for CLI usage"""
    import argparse

    parser = argparse.ArgumentParser(description="K8S Helper CLI")
    parser.add_argument("--namespace", default="k8s-testing", help="Namespace")
    parser.add_argument(
        "--action",
        required=True,
        choices=["pod-count", "deployment-info", "hpa-status"],
        help="Action to perform",
    )
    parser.add_argument("--name", help="Resource name")

    args = parser.parse_args()

    helper = K8sHelper(namespace=args.namespace)

    if args.action == "pod-count":
        count = helper.get_pod_count()
        print(f"Running pods: {count}")

    elif args.action == "deployment-info":
        if not args.name:
            print("Error: --name required for deployment-info")
            return
        info = helper.get_deployment_replicas(args.name)
        print(f"Deployment info: {info}")

    elif args.action == "hpa-status":
        if not args.name:
            print("Error: --name required for hpa-status")
            return
        status = helper.get_hpa_status(args.name)
        print(f"HPA status: {status}")


if __name__ == "__main__":
    main()
