import pytest

from src.flasher import Flasher, FlashResult
from src.package_registry import ECUImage, PackageRegistry
from src.quality_gate import QualityGate
from src.virtual_device import DeviceState, VirtualDevice


@pytest.mark.regression
def test_flash_rollback_on_checksum_mismatch():
    """DEF-IVI-001: device must not remain in FLASHING after checksum failure."""
    device = VirtualDevice("ivi-01", "IVI")
    image = ECUImage("ivi-2.3.1", "2.3.1", "IVI", "abc123", 512.0)
    result = Flasher().flash(device, image, provided_checksum="wrong")
    assert result == FlashResult.CHECKSUM_MISMATCH
    assert device.state == DeviceState.ERROR
    assert device.state != DeviceState.FLASHING


@pytest.mark.regression
def test_flash_rollback_on_timeout():
    """DEF-IVI-002: timeout must leave device in ERROR, not FLASHING."""
    device = VirtualDevice("ivi-01", "IVI")
    image = ECUImage("ivi-2.3.1", "2.3.1", "IVI", "abc123", 512.0)
    result = Flasher(simulate_timeout=True).flash(
        device, image, provided_checksum="abc123"
    )
    assert result == FlashResult.TIMEOUT
    assert device.state == DeviceState.ERROR


@pytest.mark.regression
def test_device_reset_from_error():
    """DEF-IVI-003: ERROR state must be recoverable via reset()."""
    device = VirtualDevice("ivi-01", "IVI")
    device.start_flash()
    device.fail("forced")
    device.reset()
    assert device.state == DeviceState.IDLE


@pytest.mark.regression
def test_registry_delete_nonexistent_raises():
    """DEF-IVI-004: deleting unknown image must raise KeyError, not silently pass."""
    registry = PackageRegistry()
    with pytest.raises(KeyError):
        registry.delete("nonexistent-image")


@pytest.mark.regression
def test_quality_gate_fails_on_low_coverage():
    """DEF-IVI-006: QualityGate must block when coverage < 80%."""
    gate = QualityGate()
    result = gate.check_coverage(79.9)
    assert result.passed is False


@pytest.mark.regression
def test_codriver_ecu_type_accepted():
    """DEF-IVI-005: CODRIVER must be a valid ECU type, not silently ignored."""
    registry = PackageRegistry()
    image = ECUImage("cd-1.0", "1.0", "CODRIVER", "cd789", 256.0)
    registry.register(image)
    results = registry.list_by_ecu("CODRIVER")
    assert len(results) == 1
    assert results[0].image_id == "cd-1.0"
