"""合成 CAN/CAN FD + UDS trace 生成器（DLT-01，architecture §8）。

故障类型、signature、expected_priority 全部来自手写场景文件（src/data/scenarios/*.json），
本模块不读取分流规则（RISK-01 / TC-GEN-06）。
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path

from src.can_parser import load_dbc
from src.isotp import flow_control, segment
from src.models import DATA_DIR
from src.uds import ECU_ID, TESTER_ID, SimulatedEcu

BASE_TS = 1700000000.0
SLOT_S = 1.0
CAN_GRID = 1.0  # CAN / ERR 故障槽起点
UDS_GRID = 1.6  # UDS 槽与 CAN 槽错开，便于区分
P2_STAR_S = 5.0
OUT_OF_RANGE = {"VehicleSpeed": 310.0, "ObjDistance": 260.0}


def load_scenario(name: str | Path) -> dict:
    path = Path(name)
    if not path.suffix:
        path = DATA_DIR / "scenarios" / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))


@dataclass
class Dataset:
    lines: list[str]
    labels: dict
    noise: list[dict] = field(default_factory=list)

    def write(self, out_dir: str | Path) -> None:
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        (out / "trace.log").write_text("\n".join(self.lines) + "\n", encoding="utf-8")
        (out / "labels.json").write_text(json.dumps(self.labels, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _fmt(t: float, can_id: int, payload: str) -> str:
    cid = f"{can_id:03X}" if can_id <= 0x7FF else f"{can_id:08X}"
    return f"({BASE_TS + t:.6f}) can0 {cid}#{payload}"


@dataclass
class _Periodic:
    msg: object
    period: float
    ts: list[float]
    values: list[dict]
    counter_offset: list[int]
    dropped: set[int] = field(default_factory=set)
    truncated: set[int] = field(default_factory=set)

    def index_at(self, t: float) -> int:
        return next(i for i, x in enumerate(self.ts) if x >= t)


class _Gen:
    def __init__(self, seed: int, spec: dict):
        self.rng = random.Random(seed)
        self.spec = spec
        self.duration = spec["duration_s"]
        self.db = load_dbc()
        self.rows: list[tuple[float, int, str]] = []  # (t, seq, text)
        self.labels: list[dict] = []
        self.noise: list[dict] = []
        self._seq = 0
        n_slots = int((self.duration - 2) / SLOT_S)
        self.slots = {
            key: self._shuffled([grid + k * SLOT_S for k in range(n_slots)])
            for key, grid in (("0x100", CAN_GRID), ("0x101", CAN_GRID), ("0x200", CAN_GRID), ("ERR", CAN_GRID))
        }
        self.slots["UDS"] = self._shuffled([UDS_GRID + k * SLOT_S for k in range(n_slots)])
        self.periodic = {f"0x{m.frame_id:03X}": self._periodic(m) for m in self.db.messages}

    # ---------- helpers ----------
    def _shuffled(self, xs):
        self.rng.shuffle(xs)
        return xs

    def _slot(self, key: str, max_t: float | None = None) -> float:
        pool = self.slots[key]
        for i, t in enumerate(pool):
            if max_t is None or t <= max_t:
                return pool.pop(i)
        raise ValueError(f"no free slot on {key}")

    def _emit(self, t: float, can_id: int, payload: str) -> None:
        self.rows.append((t, self._seq, _fmt(t, can_id, payload)))
        self._seq += 1

    def _label(self, f: dict, t_start: float, t_end: float, **override) -> None:
        self.labels.append(
            {
                "kind": f["kind"],
                "bus_id": f["bus_id"],
                "signature": override.get("signature", f["signature"]),
                "t_start": round(BASE_TS + t_start, 6),
                "t_end": round(BASE_TS + t_end, 6),
                "expected_priority": override.get("expected_priority", f["expected_priority"]),
            }
        )

    # ---------- periodic CAN ----------
    def _periodic(self, msg) -> _Periodic:
        period = msg.cycle_time / 1000
        n = int(self.duration / period)
        j = self.spec["jitter"]
        ts = [0.005 + i * period + self.rng.uniform(-j, j) * period for i in range(n)]
        values = []
        for i in range(n):
            v = {}
            for sig in msg.signals:
                if sig.name == "VehicleSpeed":
                    v[sig.name] = round(80 + 40 * math.sin(i / 300) + self.rng.uniform(-1, 1), 2)
                elif sig.name == "ObjDistance":
                    v[sig.name] = round(120 + 80 * math.sin(i / 150), 2)
                elif sig.name == "DoorState":
                    v[sig.name] = (i // 97) % 4
            values.append(v)
        return _Periodic(msg, period, ts, values, [0] * n)

    def _render_periodic(self) -> None:
        for p in self.periodic.values():
            offset = 0
            for i, t in enumerate(p.ts):
                offset += p.counter_offset[i]
                if i in p.dropped:
                    continue
                values = dict(p.values[i])
                if any(s.name == "AliveCounter" for s in p.msg.signals):
                    values["AliveCounter"] = (i + offset) % 16
                data = p.msg.encode(values, strict=False)
                if i in p.truncated:
                    data = data[:6]
                if p.msg.is_fd:
                    self._emit(t, p.msg.frame_id, "#1" + data.hex().upper())
                else:
                    self._emit(t, p.msg.frame_id, data.hex().upper())

    # ---------- CAN faults ----------
    def _cycle_loss(self, f: dict) -> None:
        p = self.periodic[f["bus_id"]]
        idx = p.index_at(self._slot(f["bus_id"]))
        k = f["drop"]
        p.dropped.update(range(idx, idx + k))
        self._label(f, p.ts[idx - 1], p.ts[idx + k])

    def _dlc(self, f: dict) -> None:
        p = self.periodic[f["bus_id"]]
        idx = p.index_at(self._slot(f["bus_id"]))
        p.truncated.add(idx)
        self._label(f, p.ts[idx], p.ts[idx])

    def _counter_jump(self, f: dict) -> None:
        p = self.periodic[f["bus_id"]]
        idx = p.index_at(self._slot(f["bus_id"]))
        p.counter_offset[idx] += 1
        self._label(f, p.ts[idx], p.ts[idx])

    def _signal(self, f: dict) -> None:
        p = self.periodic[f["bus_id"]]
        idx = p.index_at(self._slot(f["bus_id"]))
        name = f["signature"].split("=", 1)[1]
        hits = [idx + 2 * b for b in range(f["burst"])]
        for i in hits:
            p.values[i][name] = OUT_OF_RANGE[name]
        self._label(f, p.ts[hits[0]], p.ts[hits[-1]])

    def _error_frame(self, f: dict) -> None:
        t0 = self._slot("ERR")
        cls = int(f["signature"].split("=", 1)[1], 16)
        times = [t0 + 0.1 * b for b in range(f["burst"])]
        for t in times:
            self._emit(t, 0x20000000 | cls, "0004000000000000")
        self._label(f, times[0], times[-1])

    # ---------- UDS ----------
    def _dt(self) -> float:
        return self.rng.uniform(0.005, 0.02)

    def _uds_frames(self, t: float, can_id: int, payload: bytes, drop_first_cf: bool = False) -> float:
        frames = segment(payload)
        self._emit(t, can_id, frames[0].hex().upper())
        if len(frames) == 1:
            return t
        t += 0.001
        peer = TESTER_ID if can_id == ECU_ID else ECU_ID
        self._emit(t, peer, flow_control().hex().upper())
        for i, fr in enumerate(frames[1:]):
            t += 0.001
            if drop_first_cf and i == 0:
                continue
            self._emit(t, can_id, fr.hex().upper())
        return t

    def _exchange(self, t: float, req: bytes, responses: list[tuple[float, bytes]], drop_first_cf=False) -> float:
        """responses: (相对请求的秒数, payload)。返回最后一帧时间。"""
        end = self._uds_frames(t, TESTER_ID, req)
        for dt, payload in responses:
            end = self._uds_frames(t + dt, ECU_ID, payload, drop_first_cf=drop_first_cf)
        return end

    def _uds_nrc(self, f: dict) -> None:
        t = self._slot("UDS")
        req = bytes.fromhex(f["request"])
        dt = self._dt()
        self._exchange(t, req, [(dt, SimulatedEcu().handle(req))])
        self._label(f, t, t + dt)

    def _uds_timeout(self, f: dict) -> None:
        req = bytes.fromhex(f["request"])
        if f["mode"] == "no_response":
            t = self._slot("UDS", max_t=self.duration - 1.5)
            self._exchange(t, req, [])
            self._label(f, t, t + 0.05)
        else:  # pending_then_silence
            t = self._slot("UDS", max_t=self.duration - P2_STAR_S - 1.5)
            dt = self._dt()
            self._exchange(t, req, [(dt, bytes([0x7F, req[0], 0x78]))])
            self._label(f, t, t + dt)

    def _pending_loop(self, f: dict) -> None:
        t = self._slot("UDS")
        req = bytes.fromhex(f["request"])
        resps = [(0.01 + 0.04 * i, bytes([0x7F, req[0], 0x78])) for i in range(f["pending"])]
        final_dt = 0.01 + 0.04 * f["pending"]
        resps.append((final_dt, SimulatedEcu().handle(req)))
        self._exchange(t, req, resps)
        self._label(f, t, t + final_dt)

    def _security(self, f: dict) -> None:
        t = self._slot("UDS")
        ecu = SimulatedEcu()
        steps = [bytes.fromhex("1003")]
        attempts = 1 if f["mode"] == "wrong_key" else len(f["attempt_labels"])
        for _ in range(attempts):
            steps += [bytes.fromhex("2701"), bytes.fromhex("27020000")]
        steps.append(bytes.fromhex("1001"))
        attempt = 0
        for i, req in enumerate(steps):
            ts = t + 0.1 * i
            dt = self._dt()
            self._exchange(ts, req, [(dt, ecu.handle(req))])
            if req[:2] == b"\x27\x02":
                if f["mode"] == "wrong_key":
                    self._label(f, ts, ts + dt)
                else:
                    a = f["attempt_labels"][attempt]
                    self._label(f, ts, ts + dt, signature=a["signature"], expected_priority=a["expected_priority"])
                attempt += 1

    def _isotp(self, f: dict) -> None:
        t = self._slot("UDS")
        req = bytes.fromhex(f["request"])
        dt = self._dt()
        self._exchange(t, req, [(dt, SimulatedEcu().handle(req))], drop_first_cf=True)
        self._label(f, t, t + dt)

    # ---------- noise / background ----------
    def _uds_noise(self) -> None:
        for kind in self.spec.get("uds_noise", []):
            for _ in range(3):
                t = self._slot("UDS")
                if kind == "single_pending":
                    req = bytes.fromhex("22F187")
                    self._exchange(t, req, [(0.01, bytes.fromhex("7F2278")), (0.3, SimulatedEcu().handle(req))])
                elif kind == "suppress_no_response":
                    self._exchange(t, bytes.fromhex("3E80"), [])
                self.noise.append({"kind": kind, "t": round(BASE_TS + t, 6)})

    def _uds_background(self) -> None:
        for i, t in enumerate(sorted(self.slots["UDS"])):
            if self.rng.random() < 0.5:
                continue
            req = bytes.fromhex("3E00" if i % 3 else "22F190")
            self._exchange(t, req, [(self._dt(), SimulatedEcu().handle(req))])

    def _unknown_ids(self) -> None:
        period = self.spec.get("unknown_id_period_s", 0)
        if not period:
            return
        for k in range(int(self.duration / period)):
            self._emit(0.003 + k * period, 0x123, f"{k % 256:02X}00")

    # ---------- assemble ----------
    def run(self, seed: int) -> Dataset:
        handlers = {
            "CAN_CYCLE_LOSS": self._cycle_loss,
            "CAN_DLC_MISMATCH": self._dlc,
            "CAN_COUNTER_JUMP": self._counter_jump,
            "CAN_SIGNAL_OUT_OF_RANGE": self._signal,
            "CAN_ERROR_FRAME": self._error_frame,
            "UDS_NRC": self._uds_nrc,
            "UDS_P2_TIMEOUT": self._uds_timeout,
            "UDS_PENDING_LOOP": self._pending_loop,
            "UDS_SECURITY_FAIL": self._security,
            "ISOTP_SEQUENCE_ERROR": self._isotp,
        }
        for f in self.spec["faults"]:
            for _ in range(self.rng.randint(*f["count"])):
                handlers[f["kind"]](f)
        self._uds_noise()
        self._uds_background()
        self._unknown_ids()
        self._render_periodic()

        rows = [text for _, _, text in sorted(self.rows)]
        lines, invalid = self._inject_invalid(rows)
        faults = sorted(self.labels, key=lambda x: (x["t_start"], x["kind"], x["signature"]))
        for i, fl in enumerate(faults, start=1):
            fl["fault_id"] = f"F{i:03d}"
        meta = {
            "seed": seed,
            "profile": self.spec["profile"],
            "duration_s": self.duration,
            "total_lines": len(lines),
            "invalid_line_nos": invalid,
        }
        return Dataset(lines, {"meta": meta, "faults": faults}, sorted(self.noise, key=lambda n: n["t"]))

    def _inject_invalid(self, rows: list[str]) -> tuple[list[str], list[int]]:
        garbage = {i: "garbage" for i in self.rng.sample(range(1, len(rows)), self.spec["invalid_lines"])}
        classic = [i for i, r in enumerate(rows) if " 100#" in r]
        for i in self.rng.sample(classic, self.spec["truncated_copies"]):
            garbage.setdefault(i + 1, "truncated")
        lines, invalid = [], []
        for i, row in enumerate(rows):
            if i in garbage:
                ts = row[1:].split(")", 1)[0]
                bad = f"({ts}) can0 XYZ#00" if garbage[i] == "garbage" else rows[i - 1][:-1]
                lines.append(bad)
                invalid.append(len(lines))
            lines.append(row)
        return lines, invalid


def generate(seed: int, scenario: str | Path = "dev") -> Dataset:
    spec = load_scenario(scenario)
    return _Gen(seed, spec).run(seed)
