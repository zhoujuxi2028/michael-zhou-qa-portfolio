from enum import Enum

from src.package_registry import ECUImage
from src.virtual_device import VirtualDevice


class FlashResult(Enum):
    SUCCESS = "success"
    CHECKSUM_MISMATCH = "checksum_mismatch"
    TIMEOUT = "timeout"


class Flasher:
    def __init__(self, simulate_timeout: bool = False):
        self._simulate_timeout = simulate_timeout

    def flash(
        self, device: VirtualDevice, image: ECUImage, provided_checksum: str
    ) -> FlashResult:
        device.start_flash()

        if image.checksum != provided_checksum:
            device.fail("checksum_mismatch")
            return FlashResult.CHECKSUM_MISMATCH

        if self._simulate_timeout:
            device.fail("flash_timeout")
            return FlashResult.TIMEOUT

        device.complete_flash()
        return FlashResult.SUCCESS
