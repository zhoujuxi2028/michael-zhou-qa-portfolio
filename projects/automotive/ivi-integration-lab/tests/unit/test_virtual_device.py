import pytest

from src.virtual_device import DeviceState, InvalidStateError, VirtualDevice


@pytest.fixture
def ivi():
    return VirtualDevice("ivi-01", "IVI")


@pytest.fixture
def codriver():
    return VirtualDevice("cd-01", "CODRIVER")


def test_initial_state_is_idle(ivi):
    assert ivi.state == DeviceState.IDLE


def test_start_flash_transition(ivi):
    ivi.start_flash()
    assert ivi.state == DeviceState.FLASHING


def test_complete_flash_transition(ivi):
    ivi.start_flash()
    ivi.complete_flash()
    assert ivi.state == DeviceState.READY


def test_start_running(ivi):
    ivi.start_flash()
    ivi.complete_flash()
    ivi.start()
    assert ivi.state == DeviceState.RUNNING


def test_fail_from_flashing(ivi):
    ivi.start_flash()
    ivi.fail("timeout")
    assert ivi.state == DeviceState.ERROR


def test_fail_from_running(ivi):
    ivi.start_flash()
    ivi.complete_flash()
    ivi.start()
    ivi.fail("crash")
    assert ivi.state == DeviceState.ERROR


def test_reset_from_error(ivi):
    ivi.start_flash()
    ivi.fail("bad")
    ivi.reset()
    assert ivi.state == DeviceState.IDLE


def test_invalid_transition_raises(ivi):
    with pytest.raises(InvalidStateError):
        ivi.complete_flash()  # IDLE → FLASHING 未经 start_flash


def test_reset_from_non_error_raises(ivi):
    with pytest.raises(InvalidStateError):
        ivi.reset()  # 只有 ERROR 状态可 reset


def test_codriver_device_instantiates(codriver):
    assert codriver.ecu_type == "CODRIVER"
    assert codriver.state == DeviceState.IDLE


def test_fail_stores_reason(ivi):
    ivi.start_flash()
    ivi.fail("checksum_mismatch")
    assert ivi.error_reason == "checksum_mismatch"
