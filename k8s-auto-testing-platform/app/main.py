"""
K8S Auto Testing Platform - Test Application
FastAPI application for testing HPA, Deployment, and Service
"""

import logging
import os
import time
from datetime import datetime

import psutil
from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus Metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

ACTIVE_REQUESTS = Gauge(
    "http_active_requests",
    "Number of active HTTP requests",
)

CPU_USAGE = Gauge(
    "app_cpu_usage_percent",
    "Application CPU usage percentage",
)

MEMORY_USAGE = Gauge(
    "app_memory_usage_percent",
    "Application memory usage percentage",
)

MEMORY_ALLOCATED_MB = Gauge(
    "app_memory_allocated_mb",
    "Memory allocated by load tests in MB",
)

SCALING_EVENTS = Counter(
    "app_scaling_events_total",
    "Total scaling related events",
    ["event_type"],
)

POD_INFO = Gauge(
    "app_pod_info",
    "Pod information",
    ["hostname", "namespace", "pod_ip"],
)

# Create FastAPI app
app = FastAPI(
    title="K8S Test Application",
    description="Test application for K8S automated testing",
    version="1.0.0",
)

# Global variables for load simulation
cpu_load = False
memory_data = []


@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    """Middleware to track request metrics"""
    ACTIVE_REQUESTS.inc()
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time
    endpoint = request.url.path
    method = request.method
    status = response.status_code

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
    ACTIVE_REQUESTS.dec()

    return response


def update_system_metrics():
    """Update system metrics gauges"""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()

    CPU_USAGE.set(cpu_percent)
    MEMORY_USAGE.set(memory.percent)

    # Update pod info
    hostname = os.getenv("HOSTNAME", "unknown")
    namespace = os.getenv("POD_NAMESPACE", "unknown")
    pod_ip = os.getenv("POD_IP", "unknown")
    POD_INFO.labels(hostname=hostname, namespace=namespace, pod_ip=pod_ip).set(1)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "K8S Auto Testing Platform - Test Application",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "hostname": os.getenv("HOSTNAME", "unknown"),
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Health check endpoint for liveness probe"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/ready")
async def ready():
    """Readiness check endpoint"""
    return {"status": "ready", "timestamp": datetime.now().isoformat()}


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    update_system_metrics()
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/metrics/json")
async def metrics_json():
    """JSON metrics endpoint - returns current resource usage"""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()

    return {
        "cpu_percent": cpu_percent,
        "memory_percent": memory.percent,
        "memory_available_mb": memory.available / 1024 / 1024,
        "hostname": os.getenv("HOSTNAME", "unknown"),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/info")
async def info():
    """Pod information endpoint"""
    return {
        "hostname": os.getenv("HOSTNAME", "unknown"),
        "pod_name": os.getenv("POD_NAME", "unknown"),
        "pod_namespace": os.getenv("POD_NAMESPACE", "unknown"),
        "pod_ip": os.getenv("POD_IP", "unknown"),
        "node_name": os.getenv("NODE_NAME", "unknown"),
        "service_account": os.getenv("SERVICE_ACCOUNT", "unknown"),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/cpu-load")
async def cpu_load_endpoint(duration: int = 10):
    """
    Generate CPU load for testing HPA

    Args:
        duration: Duration in seconds (default 10)
    """
    SCALING_EVENTS.labels(event_type="cpu_load_started").inc()
    logger.info(f"Starting CPU load for {duration} seconds")

    start_time = time.time()
    result = 0

    while time.time() - start_time < duration:
        # CPU intensive calculation
        result += sum(range(1000000))
        # Update CPU metric periodically
        if int(time.time() - start_time) % 2 == 0:
            CPU_USAGE.set(psutil.cpu_percent(interval=0.1))

    SCALING_EVENTS.labels(event_type="cpu_load_completed").inc()
    logger.info(f"CPU load completed after {duration} seconds")

    return {
        "message": f"CPU load generated for {duration} seconds",
        "result": result,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/memory-load")
async def memory_load_endpoint(size_mb: int = 100):
    """
    Allocate memory for testing

    Args:
        size_mb: Memory size in MB (default 100)
    """
    global memory_data

    SCALING_EVENTS.labels(event_type="memory_load_started").inc()
    logger.info(f"Allocating {size_mb}MB of memory")

    # Allocate memory
    data = [0] * (size_mb * 1024 * 256)  # Roughly size_mb MB
    memory_data.append(data)

    memory = psutil.virtual_memory()
    total_mb = len(memory_data) * size_mb
    MEMORY_ALLOCATED_MB.set(total_mb)
    MEMORY_USAGE.set(memory.percent)

    SCALING_EVENTS.labels(event_type="memory_allocated").inc()
    logger.info(f"Memory allocated. Total: {total_mb}MB")

    return {
        "message": f"Allocated {size_mb}MB of memory",
        "total_allocations": len(memory_data),
        "memory_percent": memory.percent,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/memory-release")
async def memory_release():
    """Release allocated memory"""
    global memory_data

    count = len(memory_data)
    memory_data.clear()

    MEMORY_ALLOCATED_MB.set(0)
    SCALING_EVENTS.labels(event_type="memory_released").inc()
    logger.info(f"Released {count} memory allocations")

    return {
        "message": f"Released {count} memory allocations",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/version")
async def version():
    """Application version"""
    return {"version": "1.0.0", "name": "k8s-test-app", "build_date": "2026-03-02"}


@app.get("/env")
async def environment():
    """Return environment variables (for debugging)"""
    return {"environment": dict(os.environ), "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))

    logger.info(f"Starting K8S Test Application on port {port}")

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
