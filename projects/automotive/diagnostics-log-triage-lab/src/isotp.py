"""ISO-TP（ISO 15765-2）经典 CAN 分段 / 被动重组（DLT-04，AD-03）。"""

from __future__ import annotations

from collections.abc import Iterable

PAD = 0xAA
MAX_PAYLOAD = 4095


class IsoTpError(ValueError):
    pass


def _pad(frame: bytes) -> bytes:
    return frame + bytes([PAD]) * (8 - len(frame))


def segment(payload: bytes) -> list[bytes]:
    n = len(payload)
    if n > MAX_PAYLOAD:
        raise ValueError(f"payload too long: {n}")
    if n <= 7:
        return [_pad(bytes([n]) + payload)]
    frames = [bytes([0x10 | (n >> 8), n & 0xFF]) + payload[:6]]
    sn, i = 1, 6
    while i < n:
        frames.append(_pad(bytes([0x20 | (sn & 0x0F)]) + payload[i : i + 7]))
        sn, i = sn + 1, i + 7
    return frames


def flow_control(block_size: int = 0, st_min: int = 0) -> bytes:
    return _pad(bytes([0x30, block_size, st_min]))


class Reassembler:
    """逐帧喂入；返回 ("message", payload)、("error", reason) 或 None（等待更多帧）。"""

    def __init__(self) -> None:
        self._expect = 0
        self._buf = b""
        self._sn = 0
        self.active = False

    def feed(self, data: bytes) -> tuple[str, bytes | str] | None:
        if not data:
            return ("error", "empty frame")
        pci = data[0] >> 4
        if pci == 0:
            self.active = False
            return ("message", data[1 : 1 + (data[0] & 0x0F)])
        if pci == 1:
            self._expect = ((data[0] & 0x0F) << 8) | data[1]
            self._buf, self._sn, self.active = data[2:8], 1, True
            return None
        if pci == 2:
            if not self.active:
                return ("error", "unexpected CF")
            got = data[0] & 0x0F
            if got != (self._sn & 0x0F):
                self.active = False
                return ("error", f"sequence: got {got} want {self._sn & 0x0F}")
            self._buf += data[1:8]
            self._sn += 1
            if len(self._buf) >= self._expect:
                self.active = False
                return ("message", self._buf[: self._expect])
            return None
        return None  # pci 3 = flow control：被动分析时跳过


def reassemble(frames: Iterable[bytes]) -> list[bytes]:
    r, out = Reassembler(), []
    for f in frames:
        res = r.feed(f)
        if res is None:
            continue
        kind, value = res
        if kind == "error":
            raise IsoTpError(str(value))
        out.append(value)
    return out
