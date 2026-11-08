from enum import Enum


class DeviceState(Enum):
    IDLE = "idle"
    FLASHING = "flashing"
    READY = "ready"
    RUNNING = "running"
    ERROR = "error"


class InvalidStateError(Exception):
    pass


_VALID_TRANSITIONS = {
    DeviceState.IDLE: {DeviceState.FLASHING},
    DeviceState.FLASHING: {DeviceState.READY, DeviceState.ERROR},
    DeviceState.READY: {DeviceState.RUNNING, DeviceState.ERROR},
    DeviceState.RUNNING: {DeviceState.ERROR},
    DeviceState.ERROR: {DeviceState.IDLE},
}


class VirtualDevice:
    def __init__(self, device_id: str, ecu_type: str):
        self.device_id = device_id
        self.ecu_type = ecu_type  # IVI | CLUSTER | CODRIVER | ADAS
        self.state = DeviceState.IDLE
        self.error_reason: str = ""

    def _transition(self, target: DeviceState) -> None:
        if target not in _VALID_TRANSITIONS[self.state]:
            raise InvalidStateError(
                f"Cannot transition from {self.state.value} to {target.value}"
            )
        self.state = target

    def start_flash(self) -> None:
        self._transition(DeviceState.FLASHING)

    def complete_flash(self) -> None:
        self._transition(DeviceState.READY)

    def start(self) -> None:
        self._transition(DeviceState.RUNNING)

    def fail(self, reason: str) -> None:
        self.error_reason = reason
        self._transition(DeviceState.ERROR)

    def reset(self) -> None:
        if self.state != DeviceState.ERROR:
            raise InvalidStateError("reset() only allowed from ERROR state")
        self.error_reason = ""
        self.state = DeviceState.IDLE
