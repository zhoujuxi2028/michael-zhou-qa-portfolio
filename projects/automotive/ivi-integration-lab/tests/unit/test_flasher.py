import pytest

from src.flasher import Flasher, FlashResult
from src.package_registry import ECUImage
from src.virtual_device import DeviceState, VirtualDevice


@pytest.fixture
def device():
    return VirtualDevice("ivi-01", "IVI")


@pytest.fixture
def image():
    return ECUImage("ivi-2.3.1", "2.3.1", "IVI", "abc123", 512.0)


@pytest.fixture
def flasher():
    return Flasher()


def test_flash_success_path(flasher, device, image):
    result = flasher.flash(device, image, provided_checksum="abc123")
    assert result == FlashResult.SUCCESS
    assert device.state == DeviceState.READY


def test_flash_checksum_mismatch(flasher, device, image):
    result = flasher.flash(device, image, provided_checksum="wrong")
    assert result == FlashResult.CHECKSUM_MISMATCH
    assert device.state == DeviceState.ERROR


def test_flash_timeout(flasher, device, image):
    flasher_with_timeout = Flasher(simulate_timeout=True)
    result = flasher_with_timeout.flash(device, image, provided_checksum="abc123")
    assert result == FlashResult.TIMEOUT
    assert device.state == DeviceState.ERROR


def test_flash_error_stores_reason(flasher, device, image):
    flasher.flash(device, image, provided_checksum="wrong")
    assert device.error_reason == "checksum_mismatch"


def test_flash_timeout_stores_reason(device, image):
    flasher = Flasher(simulate_timeout=True)
    flasher.flash(device, image, provided_checksum="abc123")
    assert device.error_reason == "flash_timeout"


def test_flash_device_starts_idle(flasher, device, image):
    assert device.state == DeviceState.IDLE
    flasher.flash(device, image, provided_checksum="abc123")
    # device leaves IDLE, goes through FLASHING → READY on success
    assert device.state != DeviceState.IDLE
