import os
import uuid

import pytest

from src.can_bus import CANBusSimulator

DBC_PATH = os.path.join(os.path.dirname(__file__), "../../src/data/ivi_cluster.dbc")


@pytest.fixture
def channel():
    return f"test_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def bus(channel):
    b = CANBusSimulator(DBC_PATH, channel=channel)
    yield b
    b.close()


def test_send_and_receive_ivi_status(channel):
    sender = CANBusSimulator(DBC_PATH, channel=channel)
    receiver = CANBusSimulator(DBC_PATH, channel=channel)
    sender.send_signal("IVI_Status", {"MediaState": 1, "Volume": 25})
    result = receiver.receive_signal("IVI_Status", timeout=1.0)
    assert result is not None
    assert result["MediaState"] == 1
    assert result["Volume"] == 25
    sender.close()
    receiver.close()


def test_send_nav_command(channel):
    sender = CANBusSimulator(DBC_PATH, channel=channel)
    receiver = CANBusSimulator(DBC_PATH, channel=channel)
    sender.send_signal("IVI_Navigation", {"NavCommand": 10})
    result = receiver.receive_signal("IVI_Navigation", timeout=1.0)
    assert result["NavCommand"] == 10
    sender.close()
    receiver.close()


def test_receive_timeout_returns_none(bus):
    result = bus.receive_signal("IVI_Status", timeout=0.1)
    assert result is None


def test_content_sync_to_codriver(channel):
    ivi = CANBusSimulator(DBC_PATH, channel=channel)
    codriver = CANBusSimulator(DBC_PATH, channel=channel)
    ivi.send_signal("IVI_ContentSync", {"ContentId": 42, "SyncEnable": 1})
    result = codriver.receive_signal("IVI_ContentSync", timeout=1.0)
    assert result["ContentId"] == 42
    assert result["SyncEnable"] == 1
    ivi.close()
    codriver.close()


def test_codriver_playback_signal(channel):
    codriver = CANBusSimulator(DBC_PATH, channel=channel)
    ivi = CANBusSimulator(DBC_PATH, channel=channel)
    codriver.send_signal("CoDriver_Playback", {"PlaybackState": 1, "CoVolume": 80})
    result = ivi.receive_signal("CoDriver_Playback", timeout=1.0)
    assert result["PlaybackState"] == 1
    assert result["CoVolume"] == 80
    codriver.close()
    ivi.close()


def test_cluster_speed_signal(channel):
    cluster = CANBusSimulator(DBC_PATH, channel=channel)
    ivi = CANBusSimulator(DBC_PATH, channel=channel)
    cluster.send_signal("Cluster_Status", {"VehicleSpeed": 60.0, "GearPosition": 3})
    result = ivi.receive_signal("Cluster_Status", timeout=1.0)
    assert abs(result["VehicleSpeed"] - 60.0) < 0.5
    assert result["GearPosition"] == 3
    cluster.close()
    ivi.close()
