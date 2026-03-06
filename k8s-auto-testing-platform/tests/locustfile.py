"""
K8S Auto Testing Platform - Locust Performance Tests
Load testing suite for HPA auto-scaling validation
"""

import random
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner


class TestAppUser(HttpUser):
    """
    Simulates user behavior for the K8S test application.
    Designed to trigger HPA scaling events.
    """

    # Wait 1-3 seconds between tasks
    wait_time = between(1, 3)

    @task(10)
    def health_check(self):
        """High frequency health checks (weight: 10)"""
        self.client.get("/health", name="/health")

    @task(5)
    def get_info(self):
        """Get pod information (weight: 5)"""
        self.client.get("/info", name="/info")

    @task(3)
    def get_metrics_json(self):
        """Get JSON metrics (weight: 3)"""
        self.client.get("/metrics/json", name="/metrics/json")

    @task(2)
    def root_endpoint(self):
        """Access root endpoint (weight: 2)"""
        self.client.get("/", name="/")

    @task(1)
    def get_version(self):
        """Get application version (weight: 1)"""
        self.client.get("/version", name="/version")


class CPULoadUser(HttpUser):
    """
    Generates CPU load to trigger HPA scaling.
    Uses longer wait times to avoid overwhelming the system.
    """

    # Wait 5-15 seconds between CPU load requests
    wait_time = between(5, 15)

    @task(1)
    def short_cpu_load(self):
        """Short CPU burst (5 seconds)"""
        self.client.get("/cpu-load?duration=5", name="/cpu-load (5s)")

    @task(2)
    def medium_cpu_load(self):
        """Medium CPU load (10 seconds)"""
        self.client.get("/cpu-load?duration=10", name="/cpu-load (10s)")


class MemoryLoadUser(HttpUser):
    """
    Generates memory pressure to test memory-based HPA.
    """

    # Wait 10-20 seconds between memory allocations
    wait_time = between(10, 20)

    @task(3)
    def small_memory_allocation(self):
        """Allocate 50MB of memory"""
        self.client.get("/memory-load?size_mb=50", name="/memory-load (50MB)")

    @task(2)
    def medium_memory_allocation(self):
        """Allocate 100MB of memory"""
        self.client.get("/memory-load?size_mb=100", name="/memory-load (100MB)")

    @task(1)
    def release_memory(self):
        """Release all allocated memory"""
        self.client.get("/memory-release", name="/memory-release")


class HPAStressUser(HttpUser):
    """
    Combined stress test user for HPA validation.
    Simulates mixed workload patterns.
    """

    wait_time = between(0.5, 2)

    @task(20)
    def rapid_health_checks(self):
        """Rapid health checks to increase request rate"""
        self.client.get("/health", name="/health (stress)")

    @task(5)
    def burst_cpu_load(self):
        """Short CPU bursts"""
        duration = random.choice([3, 5, 8])
        self.client.get(f"/cpu-load?duration={duration}", name=f"/cpu-load ({duration}s)")

    @task(3)
    def memory_pressure(self):
        """Memory allocation pressure"""
        size = random.choice([25, 50, 75])
        self.client.get(f"/memory-load?size_mb={size}", name=f"/memory-load ({size}MB)")

    @task(2)
    def info_requests(self):
        """Information requests"""
        self.client.get("/info", name="/info (stress)")

    @task(1)
    def cleanup_memory(self):
        """Periodic memory cleanup"""
        self.client.get("/memory-release", name="/memory-release (cleanup)")


# Event handlers for reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("=" * 60)
    print("K8S HPA Performance Test Started")
    print("=" * 60)
    if isinstance(environment.runner, MasterRunner):
        print(f"Running in distributed mode with {environment.runner.worker_count} workers")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("=" * 60)
    print("K8S HPA Performance Test Completed")
    print("=" * 60)


# Custom failure handler
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Log slow requests"""
    if response_time > 5000:  # More than 5 seconds
        print(f"SLOW REQUEST: {name} took {response_time}ms")
