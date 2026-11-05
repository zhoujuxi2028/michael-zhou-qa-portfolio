import pytest

from src.can_bus import CANBusSimulator
from src.virtual_device import DeviceState


@pytest.mark.smoke
def test_can_bus_send_receive(dbc_path, unique_channel):
    sender = CANBusSimulator(dbc_path, channel=unique_channel)
    receiver = CANBusSimulator(dbc_path, channel=unique_channel)
    sender.send_signal("IVI_Status", {"MediaState": 1, "Volume": 25})
    result = receiver.receive_signal("IVI_Status", timeout=1.0)
    assert result is not None
    assert result["MediaState"] == 1
    sender.close()
    receiver.close()


@pytest.mark.smoke
def test_device_power_on_self_test(ivi_device, cluster_device, codriver_device):
    for device in [ivi_device, cluster_device, codriver_device]:
        device.start_flash()
        device.complete_flash()
        assert device.state == DeviceState.READY


@pytest.mark.smoke
def test_package_registry_register(registry):
    img = registry.get("ivi-2.3.1")
    assert img.version == "2.3.1"
    assert registry.verify_checksum("ivi-2.3.1", "abc123") is True


@pytest.mark.smoke
def test_media_state_signal_send(dbc_path, unique_channel):
    sender = CANBusSimulator(dbc_path, channel=unique_channel)
    receiver = CANBusSimulator(dbc_path, channel=unique_channel)
    sender.send_signal("IVI_Status", {"MediaState": 2, "Volume": 0})
    result = receiver.receive_signal("IVI_Status", timeout=1.0)
    assert result["MediaState"] == 2
    sender.close()
    receiver.close()


@pytest.mark.smoke
def test_audio_volume_signal(dbc_path, unique_channel):
    sender = CANBusSimulator(dbc_path, channel=unique_channel)
    receiver = CANBusSimulator(dbc_path, channel=unique_channel)
    sender.send_signal("IVI_Status", {"MediaState": 1, "Volume": 50})
    result = receiver.receive_signal("IVI_Status", timeout=1.0)
    assert result["Volume"] == 50
    sender.close()
    receiver.close()
