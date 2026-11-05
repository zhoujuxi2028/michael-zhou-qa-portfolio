import pytest

from src.package_registry import ECUImage, PackageRegistry


@pytest.fixture
def registry():
    return PackageRegistry()


@pytest.fixture
def sample_image():
    return ECUImage(
        image_id="ivi-2.3.1",
        version="2.3.1",
        target_ecu="IVI",
        checksum="abc123",
        size_mb=512.0,
    )


def test_register_new_image(registry, sample_image):
    registry.register(sample_image)
    result = registry.get("ivi-2.3.1")
    assert result.checksum == "abc123"
    assert result.version == "2.3.1"


def test_list_by_ecu_type(registry, sample_image):
    cluster_image = ECUImage("cluster-1.0", "1.0", "CLUSTER", "def456", 128.0)
    registry.register(sample_image)
    registry.register(cluster_image)
    ivi_list = registry.list_by_ecu("IVI")
    assert len(ivi_list) == 1
    assert ivi_list[0].image_id == "ivi-2.3.1"


def test_verify_checksum_match(registry, sample_image):
    registry.register(sample_image)
    assert registry.verify_checksum("ivi-2.3.1", "abc123") is True


def test_verify_checksum_mismatch(registry, sample_image):
    registry.register(sample_image)
    assert registry.verify_checksum("ivi-2.3.1", "wrong") is False


def test_delete_image(registry, sample_image):
    registry.register(sample_image)
    registry.delete("ivi-2.3.1")
    with pytest.raises(KeyError):
        registry.get("ivi-2.3.1")


def test_delete_nonexistent_raises(registry):
    with pytest.raises(KeyError):
        registry.delete("nonexistent")


def test_get_nonexistent_raises(registry):
    with pytest.raises(KeyError):
        registry.get("nonexistent")


def test_codriver_image_registered(registry):
    img = ECUImage("codriver-1.0", "1.0", "CODRIVER", "cd789", 256.0)
    registry.register(img)
    assert registry.list_by_ecu("CODRIVER")[0].image_id == "codriver-1.0"
