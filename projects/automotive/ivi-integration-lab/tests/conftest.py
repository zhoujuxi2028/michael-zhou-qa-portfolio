import os
import uuid

import pytest

from src.package_registry import ECUImage, PackageRegistry
from src.virtual_device import VirtualDevice

DBC_PATH = os.path.join(os.path.dirname(__file__), "../src/data/ivi_cluster.dbc")


@pytest.fixture
def dbc_path():
    return DBC_PATH


@pytest.fixture
def unique_channel():
    return f"ch_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def ivi_device():
    return VirtualDevice("ivi-01", "IVI")


@pytest.fixture
def cluster_device():
    return VirtualDevice("cluster-01", "CLUSTER")


@pytest.fixture
def codriver_device():
    return VirtualDevice("cd-01", "CODRIVER")


@pytest.fixture
def registry():
    r = PackageRegistry()
    r.register(ECUImage("ivi-2.3.1", "2.3.1", "IVI", "abc123", 512.0))
    r.register(ECUImage("cluster-1.0", "1.0", "CLUSTER", "def456", 128.0))
    r.register(ECUImage("codriver-1.0", "1.0", "CODRIVER", "cd789", 256.0))
    return r
