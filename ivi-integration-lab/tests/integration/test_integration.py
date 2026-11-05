import pytest

from src.can_bus import CANBusSimulator


@pytest.mark.integration
def test_ivi_cluster_media_sync(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_Status", {"MediaState": 2, "Volume": 30})
    result = cluster.receive_signal("IVI_Status", timeout=1.0)
    assert result["MediaState"] == 2
    ivi.close()
    cluster.close()


@pytest.mark.integration
def test_volume_change_propagation(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_Status", {"MediaState": 1, "Volume": 80})
    result = cluster.receive_signal("IVI_Status", timeout=1.0)
    assert result["Volume"] == 80
    ivi.close()
    cluster.close()


@pytest.mark.integration
def test_nav_command_dispatch(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_Navigation", {"NavCommand": 10})
    result = cluster.receive_signal("IVI_Navigation", timeout=1.0)
    assert result["NavCommand"] == 10
    ivi.close()
    cluster.close()


@pytest.mark.integration
def test_ota_trigger_signal(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_OTA", {"OTATrigger": 1})
    result = cluster.receive_signal("IVI_OTA", timeout=1.0)
    assert result["OTATrigger"] == 1
    ivi.close()
    cluster.close()


@pytest.mark.integration
def test_cluster_speed_readback(dbc_path, unique_channel):
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster.send_signal("Cluster_Status", {"VehicleSpeed": 60.0, "GearPosition": 3})
    result = ivi.receive_signal("Cluster_Status", timeout=1.0)
    assert abs(result["VehicleSpeed"] - 60.0) < 0.5
    cluster.close()
    ivi.close()


@pytest.mark.integration
def test_cluster_gear_position(dbc_path, unique_channel):
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster.send_signal("Cluster_Status", {"VehicleSpeed": 0.0, "GearPosition": 3})
    result = ivi.receive_signal("Cluster_Status", timeout=1.0)
    assert result["GearPosition"] == 3
    cluster.close()
    ivi.close()


@pytest.mark.integration
def test_full_ivi_cluster_roundtrip(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    cluster = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_Status", {"MediaState": 1, "Volume": 40})
    r1 = cluster.receive_signal("IVI_Status", timeout=1.0)
    assert r1["MediaState"] == 1
    cluster.send_signal("Cluster_Status", {"VehicleSpeed": 100.0, "GearPosition": 4})
    r2 = ivi.receive_signal("Cluster_Status", timeout=1.0)
    assert abs(r2["VehicleSpeed"] - 100.0) < 0.5
    ivi.close()
    cluster.close()


@pytest.mark.integration
def test_signal_timeout_returns_none(dbc_path, unique_channel):
    bus = CANBusSimulator(dbc_path, channel=unique_channel)
    result = bus.receive_signal("IVI_Status", timeout=0.1)
    assert result is None
    bus.close()


@pytest.mark.integration
def test_codriver_content_sync(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    codriver = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_ContentSync", {"ContentId": 42, "SyncEnable": 1})
    result = codriver.receive_signal("IVI_ContentSync", timeout=1.0)
    assert result["ContentId"] == 42
    assert result["SyncEnable"] == 1
    ivi.close()
    codriver.close()


@pytest.mark.integration
def test_codriver_independent_volume(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    codriver = CANBusSimulator(dbc_path, channel=unique_channel)
    ivi.send_signal("IVI_Status", {"MediaState": 1, "Volume": 30})
    ivi.receive_signal("IVI_Status", timeout=0.5)  # flush own message
    codriver.send_signal("CoDriver_Playback", {"PlaybackState": 1, "CoVolume": 80})
    result = ivi.receive_signal("CoDriver_Playback", timeout=1.0)
    assert result["CoVolume"] == 80
    # IVI Volume is independent — not changed by CoDriver signal
    no_new_ivi = ivi.receive_signal("IVI_Status", timeout=0.1)
    assert no_new_ivi is None
    ivi.close()
    codriver.close()


@pytest.mark.integration
def test_codriver_playback_state_isolated(dbc_path, unique_channel):
    ivi = CANBusSimulator(dbc_path, channel=unique_channel)
    codriver = CANBusSimulator(dbc_path, channel=unique_channel)
    codriver.send_signal("CoDriver_Playback", {"PlaybackState": 1, "CoVolume": 50})
    result = ivi.receive_signal("CoDriver_Playback", timeout=1.0)
    assert result["PlaybackState"] == 1
    no_media_change = ivi.receive_signal("IVI_Status", timeout=0.1)
    assert no_media_change is None
    ivi.close()
    codriver.close()
