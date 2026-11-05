from dataclasses import dataclass


@dataclass
class ECUImage:
    image_id: str
    version: str
    target_ecu: str  # "IVI" | "CLUSTER" | "CODRIVER" | "ADAS"
    checksum: str
    size_mb: float


class PackageRegistry:
    def __init__(self):
        self._store: dict[str, ECUImage] = {}

    def register(self, image: ECUImage) -> None:
        self._store[image.image_id] = image

    def get(self, image_id: str) -> ECUImage:
        if image_id not in self._store:
            raise KeyError(f"Image not found: {image_id}")
        return self._store[image_id]

    def list_by_ecu(self, target_ecu: str) -> list[ECUImage]:
        return [img for img in self._store.values() if img.target_ecu == target_ecu]

    def delete(self, image_id: str) -> None:
        if image_id not in self._store:
            raise KeyError(f"Image not found: {image_id}")
        del self._store[image_id]

    def verify_checksum(self, image_id: str, checksum: str) -> bool:
        return self.get(image_id).checksum == checksum
