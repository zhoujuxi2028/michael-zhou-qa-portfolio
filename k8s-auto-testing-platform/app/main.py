"""
K8S Auto Testing Platform - Test Application
FastAPI application for testing HPA, Deployment, and Service
"""

from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
import os
import psutil
import time
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="K8S Test Application",
    description="Test application for K8S automated testing",
    version="1.0.0"
)

# Global variables for load simulation
cpu_load = False
memory_data = []


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "K8S Auto Testing Platform - Test Application",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "hostname": os.getenv("HOSTNAME", "unknown"),
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint for liveness probe"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/ready")
async def ready():
    """Readiness check endpoint"""
    return {
        "status": "ready",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/metrics")
async def metrics():
    """Metrics endpoint - returns current resource usage"""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()

    return {
        "cpu_percent": cpu_percent,
        "memory_percent": memory.percent,
        "memory_available_mb": memory.available / 1024 / 1024,
        "hostname": os.getenv("HOSTNAME", "unknown"),
        "timestamp": datetime.now().isoformat()
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
        "timestamp": datetime.now().isoformat()
    }


@app.get("/cpu-load")
async def cpu_load_endpoint(duration: int = 10):
    """
    Generate CPU load for testing HPA

    Args:
        duration: Duration in seconds (default 10)
    """
    start_time = time.time()
    result = 0

    while time.time() - start_time < duration:
        # CPU intensive calculation
        result += sum(range(1000000))

    return {
        "message": f"CPU load generated for {duration} seconds",
        "result": result,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/memory-load")
async def memory_load_endpoint(size_mb: int = 100):
    """
    Allocate memory for testing

    Args:
        size_mb: Memory size in MB (default 100)
    """
    global memory_data

    # Allocate memory
    data = [0] * (size_mb * 1024 * 256)  # Roughly size_mb MB
    memory_data.append(data)

    memory = psutil.virtual_memory()

    return {
        "message": f"Allocated {size_mb}MB of memory",
        "total_allocations": len(memory_data),
        "memory_percent": memory.percent,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/memory-release")
async def memory_release():
    """Release allocated memory"""
    global memory_data

    count = len(memory_data)
    memory_data.clear()

    return {
        "message": f"Released {count} memory allocations",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/version")
async def version():
    """Application version"""
    return {
        "version": "1.0.0",
        "name": "k8s-test-app",
        "build_date": "2026-03-02"
    }


@app.get("/env")
async def environment():
    """Return environment variables (for debugging)"""
    return {
        "environment": dict(os.environ),
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))

    logger.info(f"Starting K8S Test Application on port {port}")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
