from datetime import datetime


class DeviceLogger:
    def __init__(self):
        self._entries: list[tuple[str, str]] = []

    def log(self, level: str, msg: str) -> None:
        self._entries.append((level.upper(), msg))

    def get_errors(self) -> list[str]:
        return [msg for level, msg in self._entries if level == "ERROR"]

    def clear(self) -> None:
        self._entries.clear()

    def save_to_file(self, path: str) -> None:
        with open(path, "w") as f:
            for level, msg in self._entries:
                ts = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                f.write(f"{ts} [{level}] {msg}\n")
