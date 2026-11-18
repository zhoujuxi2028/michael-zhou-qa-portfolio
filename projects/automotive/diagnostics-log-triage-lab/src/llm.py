"""可选 LLM 摘要后端（DLT-10，architecture §5）。

只写 Incident.summary / hypotheses / summary_note，不参与 priority、聚类或任何指标。
默认 NullBackend；设置 ANTHROPIC_API_KEY 且 DLT_LLM != off 时启用 ClaudeBackend。
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field, replace
from typing import Protocol

import anthropic
from pydantic import BaseModel

from src.models import Event, Hypothesis, Incident

SUMMARIZE_TOP = 10
MAX_EVENTS_IN_PROMPT = 20

SYSTEM_PROMPT = (
    "你是汽车诊断日志分析助手。输入是合成实验室数据中的一条已聚类 Incident 及其证据事件。"
    "用一两句中文概括问题，并给出至多 3 条根因假设；每条假设只能引用输入中出现的 event_id 作为证据。"
    "不要编造输入中没有的信号、ECU 或时间。"
)

HINTS = {
    "CAN_CYCLE_LOSS": "发送节点负载过高或总线拥塞导致周期报文丢失",
    "CAN_DLC_MISMATCH": "发送端软件版本与 DBC 定义不一致",
    "CAN_SIGNAL_OUT_OF_RANGE": "传感器或信号缩放配置异常",
    "CAN_ERROR_FRAME": "物理层干扰、终端电阻或节点 bus-off",
    "CAN_COUNTER_JUMP": "发送端任务调度异常导致 alive counter 不连续",
    "UDS_NRC": "诊断请求参数与 ECU 当前支持范围不一致",
    "UDS_P2_TIMEOUT": "ECU 未在 P2/P2* 时限内响应，可能处理阻塞或网关丢包",
    "UDS_PENDING_LOOP": "ECU 长时间 responsePending，后台任务未完成",
    "UDS_SECURITY_FAIL": "安全访问 key 算法或密钥配置不匹配",
    "ISOTP_SEQUENCE_ERROR": "多帧传输中 CF 丢失或乱序",
}


class HypothesisModel(BaseModel):
    text: str
    evidence_event_ids: list[str]


class TriageSummary(BaseModel):
    summary: str
    hypotheses: list[HypothesisModel]


@dataclass(frozen=True)
class SummaryResult:
    summary: str
    hypotheses: list[Hypothesis] = field(default_factory=list)
    note: str | None = None

    def with_note(self, note: str) -> SummaryResult:
        return replace(self, note=note)


class SummaryBackend(Protocol):
    def summarize(self, incident: Incident, events: list[Event]) -> SummaryResult: ...


class NullBackend:
    """确定性摘要：模板句 + 按 kind 的固定根因提示。"""

    def summarize(self, incident: Incident, events: list[Event]) -> SummaryResult:
        sig = f" {incident.signature}" if incident.signature else ""
        text = (
            f"{incident.kind} @ {incident.bus_id}{sig}：{incident.count} 次，"
            f"{incident.first_ts:.3f}–{incident.last_ts:.3f}，{incident.priority}"
        )
        hyp = Hypothesis(HINTS.get(incident.kind, "未知"), incident.evidence[:3])
        return SummaryResult(text, [hyp])


def _render(incident: Incident, events: list[Event]) -> str:
    by_id = {e.event_id: e for e in events}
    header = (
        f"incident_id={incident.incident_id} kind={incident.kind} bus_id={incident.bus_id} "
        f"signature={incident.signature or '-'} priority={incident.priority} count={incident.count}"
    )
    lines = [header, "evidence:"]
    for eid in incident.evidence[:MAX_EVENTS_IN_PROMPT]:
        e = by_id.get(eid)
        if e is not None:
            lines.append(f"- {eid} ts={e.ts:.6f} {e.message}")
    return "\n".join(lines)


class ClaudeBackend:
    MODEL = "claude-opus-5-5"

    def __init__(self, client=None) -> None:
        self._client = client or anthropic.Anthropic(timeout=30, max_retries=1)

    def summarize(self, incident: Incident, events: list[Event]) -> SummaryResult:
        try:
            resp = self._client.beta.messages.parse(
                model=self.MODEL,
                max_tokens=2000,
                output_config={"effort": "low"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": _render(incident, events)}],
                output_format=TriageSummary,
            )
        except (anthropic.APIConnectionError, anthropic.APIStatusError) as e:
            return NullBackend().summarize(incident, events).with_note(f"fallback: {type(e).__name__}")
        if resp.stop_reason == "refusal" or resp.parsed_output is None:
            return NullBackend().summarize(incident, events).with_note(f"fallback: {resp.stop_reason}")
        allowed = set(incident.evidence)
        hyps = [
            Hypothesis(h.text, [x for x in h.evidence_event_ids if x in allowed]) for h in resp.parsed_output.hypotheses
        ]
        return SummaryResult(resp.parsed_output.summary, hyps)


def get_backend() -> SummaryBackend:
    if os.getenv("DLT_LLM", "").lower() == "off" or not os.getenv("ANTHROPIC_API_KEY"):
        return NullBackend()
    return ClaudeBackend()


def summarize_incidents(
    incidents: list[Incident], events: list[Event], backend: SummaryBackend, top: int = SUMMARIZE_TOP
) -> list[Incident]:
    out = []
    for i, inc in enumerate(incidents):
        if i < top:
            res = backend.summarize(inc, events)
            inc = replace(inc, summary=res.summary, hypotheses=res.hypotheses, summary_note=res.note)
        out.append(inc)
    return out
