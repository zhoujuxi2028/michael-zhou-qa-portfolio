import time

import can
import cantools


class CANBusSimulator:
    def __init__(self, dbc_path: str, channel: str = "test"):
        self.db = cantools.database.load_file(dbc_path)
        self.bus = can.interface.Bus(interface="virtual", channel=channel)

    def send_signal(self, msg_name: str, signals: dict) -> None:
        msg = self.db.get_message_by_name(msg_name)
        data = msg.encode(signals)
        frame = can.Message(
            arbitration_id=msg.frame_id, data=data, is_extended_id=False
        )
        self.bus.send(frame)

    def receive_signal(self, msg_name: str, timeout: float = 1.0) -> dict | None:
        msg = self.db.get_message_by_name(msg_name)
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            remaining = max(0.0, deadline - time.monotonic())
            frame = self.bus.recv(timeout=remaining)
            if frame and frame.arbitration_id == msg.frame_id:
                return msg.decode(frame.data)
        return None

    def close(self) -> None:
        self.bus.shutdown()
