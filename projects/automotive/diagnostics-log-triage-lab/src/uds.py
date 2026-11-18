"""UDS（ISO 14229）模拟 ECU + trace 中请求 / 响应配对（DLT-04，architecture §4.4）。"""

from __future__ import annotations

from collections.abc import Iterable

from src.isotp import Reassembler
from src.models import SUBFUNCTION_SIDS, CanFrame, UdsExchange, bus_id

TESTER_ID = 0x7E0
ECU_ID = 0x7E8
P2_MS = 50
P2_STAR_10MS = 500  # 5000 ms

NRC_NAMES = {
    0x11: "serviceNotSupported",
    0x12: "subFunctionNotSupported",
    0x13: "incorrectMessageLengthOrInvalidFormat",
    0x22: "conditionsNotCorrect",
    0x24: "requestSequenceError",
    0x31: "requestOutOfRange",
    0x33: "securityAccessDenied",
    0x35: "invalidKey",
    0x36: "exceededNumberOfAttempts",
    0x78: "requestCorrectlyReceivedResponsePending",
    0x7F: "serviceNotSupportedInActiveSession",
}

DIDS = {
    0xF190: b"WVWZZZ1KZAW000001",  # 合成 VIN
    0xF187: b"LAB-ECU-0001",
    0xF19A: b"\x00\x00",
}


def nrc(sid: int, code: int) -> bytes:
    return bytes([0x7F, sid, code])


def is_pending(resp: bytes) -> bool:
    return len(resp) >= 3 and resp[0] == 0x7F and resp[2] == 0x78


def is_response_to(resp: bytes, sid: int) -> bool:
    return bool(resp) and (resp[0] == sid + 0x40 or (resp[0] == 0x7F and len(resp) >= 2 and resp[1] == sid))


class SimulatedEcu:
    """最小会话 / 安全状态机：default → extended (10 03) → unlocked (27 01/02)。"""

    MAX_ATTEMPTS = 3

    def __init__(self, dtc_count: int = 4) -> None:
        self.session = "default"
        self.unlocked = False
        self._seed: bytes | None = None
        self._attempts = 0
        self.dids = dict(DIDS)
        self.dtcs = [bytes([0xC1, 0x00, i, 0x2F]) for i in range(1, dtc_count + 1)]

    @staticmethod
    def key_for(seed: bytes) -> bytes:
        return bytes(b ^ 0x5A for b in seed)

    def handle(self, req: bytes) -> bytes | None:
        if not req:
            return None
        sid = req[0]
        handler = {
            0x10: self._session,
            0x22: self._read_did,
            0x27: self._security,
            0x2E: self._write_did,
            0x19: self._read_dtc,
            0x3E: self._tester_present,
        }.get(sid)
        if handler is None:
            return nrc(sid, 0x11)
        resp = handler(req)
        if resp is not None and resp[0] != 0x7F and len(req) > 1 and sid in SUBFUNCTION_SIDS and req[1] & 0x80:
            return None  # suppressPosRspMsgIndicationBit
        return resp

    def _session(self, req: bytes) -> bytes:
        if len(req) != 2:
            return nrc(0x10, 0x13)
        sub = req[1] & 0x7F
        if sub not in (0x01, 0x03):
            return nrc(0x10, 0x12)
        self.session = "extended" if sub == 0x03 else "default"
        self.unlocked = False
        return bytes([0x50, sub]) + P2_MS.to_bytes(2, "big") + P2_STAR_10MS.to_bytes(2, "big")

    def _read_did(self, req: bytes) -> bytes:
        if len(req) != 3:
            return nrc(0x22, 0x13)
        did = int.from_bytes(req[1:3], "big")
        if did not in self.dids:
            return nrc(0x22, 0x31)
        return b"\x62" + req[1:3] + self.dids[did]

    def _security(self, req: bytes) -> bytes:
        if self.session != "extended":
            return nrc(0x27, 0x7F)
        if self._attempts >= self.MAX_ATTEMPTS:
            return nrc(0x27, 0x36)
        sub = req[1] if len(req) > 1 else 0
        if sub == 0x01:
            self._seed = bytes([0x3C, 0x7A])
            return b"\x67\x01" + self._seed
        if sub == 0x02:
            if self._seed is None:
                return nrc(0x27, 0x24)
            seed, self._seed = self._seed, None
            if req[2:] == self.key_for(seed):
                self.unlocked, self._attempts = True, 0
                return b"\x67\x02"
            self._attempts += 1
            return nrc(0x27, 0x36 if self._attempts >= self.MAX_ATTEMPTS else 0x35)
        return nrc(0x27, 0x12)

    def _write_did(self, req: bytes) -> bytes:
        if self.session != "extended":
            return nrc(0x2E, 0x22)
        if not self.unlocked:
            return nrc(0x2E, 0x33)
        if len(req) < 4:
            return nrc(0x2E, 0x13)
        did = int.from_bytes(req[1:3], "big")
        if did not in self.dids:
            return nrc(0x2E, 0x31)
        self.dids[did] = req[3:]
        return b"\x6e" + req[1:3]

    def _read_dtc(self, req: bytes) -> bytes:
        if len(req) < 2 or (req[1] & 0x7F) != 0x02:
            return nrc(0x19, 0x12)
        return b"\x59\x02\xff" + b"".join(self.dtcs)

    def _tester_present(self, req: bytes) -> bytes:
        if len(req) != 2:
            return nrc(0x3E, 0x13)
        if req[1] & 0x7F != 0x00:
            return nrc(0x3E, 0x12)
        return b"\x7e\x00"


def pair_exchanges(frames: Iterable[CanFrame], tester_id: int = TESTER_ID, ecu_id: int = ECU_ID) -> list[UdsExchange]:
    """按时间顺序配对。UDS 一次只有一个未完成请求；新请求到来时旧请求保持无响应（超时候选）。"""
    req_rx, resp_rx = Reassembler(), Reassembler()
    exchanges: list[UdsExchange] = []
    open_ex: UdsExchange | None = None
    req_start: tuple[float, int] | None = None

    for f in sorted(frames, key=lambda fr: (fr.ts, fr.line_no)):
        if f.is_error or f.is_remote or f.is_extended or f.can_id not in (tester_id, ecu_id):
            continue
        if f.can_id == tester_id:
            if f.data and f.data[0] >> 4 == 1:
                req_start = (f.ts, f.line_no)
            res = req_rx.feed(f.data)
            if res is None or res[0] != "message":
                continue
            ts, ln = req_start if req_start and f.data[0] >> 4 == 2 else (f.ts, f.line_no)
            req_start = None
            open_ex = UdsExchange(req_ts=ts, req_id=bus_id(tester_id), request=res[1], line_span=(ln, f.line_no))
            exchanges.append(open_ex)
            continue

        res = resp_rx.feed(f.data)
        if open_ex is None or res is None:
            continue
        kind, value = res
        if kind == "error":
            open_ex.isotp_error = True
            open_ex.line_span = (open_ex.line_span[0], f.line_no)
            open_ex = None
            continue
        if not is_response_to(value, open_ex.sid):
            continue
        open_ex.responses.append((f.ts, value))
        open_ex.line_span = (open_ex.line_span[0], f.line_no)
        if not is_pending(value):
            open_ex = None
    return exchanges
