"""TC-LLM-*：可选 Claude 后端（DLT-10）。所有用例不发网络请求。"""

from types import SimpleNamespace

import anthropic
import httpx
import pytest

from src.generator import generate
from src.llm import ClaudeBackend, HypothesisModel, NullBackend, TriageSummary, get_backend, summarize_incidents
from src.pipeline import run


class FakeMessages:
    def __init__(self, response=None, error=None):
        self.response, self.error, self.calls = response, error, []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


def fake_client(**kw):
    msgs = FakeMessages(**kw)
    return SimpleNamespace(beta=SimpleNamespace(messages=msgs)), msgs


@pytest.fixture(scope="module")
def result():
    return run(generate(seed=42, scenario="dev").lines, backend=NullBackend())


def ok_response(evidence):
    parsed = TriageSummary(
        summary="ECU 读未知 DID 被拒",
        hypotheses=[HypothesisModel(text="诊断脚本使用了未发布的 DID", evidence_event_ids=evidence)],
    )
    return SimpleNamespace(stop_reason="end_turn", parsed_output=parsed)


def test_null_backend_without_key(monkeypatch):  # TC-LLM-01
    monkeypatch.delenv("DLT_LLM", raising=False)
    assert isinstance(get_backend(), NullBackend)


def test_off_switch_with_key(monkeypatch):  # TC-LLM-06
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setenv("DLT_LLM", "off")
    assert isinstance(get_backend(), NullBackend)


def test_key_enables_claude(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.delenv("DLT_LLM", raising=False)
    assert isinstance(get_backend(), ClaudeBackend)


def test_claude_backend_with_fake_client(result):  # TC-LLM-02
    inc = result.incidents[0]
    client, msgs = fake_client(response=ok_response(inc.evidence[:1]))
    out = ClaudeBackend(client=client).summarize(inc, result.events)
    assert out.summary == "ECU 读未知 DID 被拒" and out.note is None
    assert out.hypotheses[0].evidence_event_ids == inc.evidence[:1]
    call = msgs.calls[0]
    assert call["model"] == "claude-opus-5-5" and call["output_format"] is TriageSummary
    assert call["fallbacks"] == "default" and call["betas"] == ["server-side-fallback-2026-07-01"]
    assert call["output_config"] == {"effort": "low"}
    assert inc.evidence[0] in call["messages"][0]["content"]


def test_unknown_evidence_ids_dropped(result):
    inc = result.incidents[0]
    client, _ = fake_client(response=ok_response(["E99999", inc.evidence[0]]))
    out = ClaudeBackend(client=client).summarize(inc, result.events)
    assert out.hypotheses[0].evidence_event_ids == [inc.evidence[0]]


def test_fallback_on_api_error(result):  # TC-LLM-03
    err = anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.invalid"))
    client, _ = fake_client(error=err)
    inc = result.incidents[0]
    out = ClaudeBackend(client=client).summarize(inc, result.events)
    assert out.note == "fallback: APIConnectionError"
    assert out.summary == NullBackend().summarize(inc, result.events).summary


@pytest.mark.parametrize(
    "resp",
    [
        SimpleNamespace(stop_reason="refusal", parsed_output=None),
        SimpleNamespace(stop_reason="max_tokens", parsed_output=None),
    ],
)
def test_fallback_on_refusal(result, resp):  # TC-LLM-05
    client, _ = fake_client(response=resp)
    out = ClaudeBackend(client=client).summarize(result.incidents[0], result.events)
    assert out.note.startswith("fallback:")


def test_summarize_capped_at_10(result):  # TC-LLM-07
    assert len(result.incidents) > 10
    client, msgs = fake_client(response=ok_response([]))
    incs = summarize_incidents(result.incidents, result.events, ClaudeBackend(client=client))
    assert len(msgs.calls) == 10
    assert sum(i.summary is not None for i in incs) == 10


def _strip(r):
    return [(i.incident_id, i.priority, i.cluster_id, i.count, i.evidence) for i in r.incidents]


def test_llm_does_not_change_results(result):  # TC-LLM-04（Metrics 相等在 test_metrics 中断言）
    client, _ = fake_client(response=ok_response([]))
    with_llm = run(generate(seed=42, scenario="dev").lines, backend=ClaudeBackend(client=client))
    assert _strip(with_llm) == _strip(result)
    assert [c.event_ids for c in with_llm.clusters] == [c.event_ids for c in result.clusters]


def test_null_backend_deterministic(result):
    inc = result.incidents[0]
    a, b = NullBackend().summarize(inc, result.events), NullBackend().summarize(inc, result.events)
    assert a == b and a.summary and a.hypotheses


def test_pipeline_default_backend_is_null(result):
    assert all(i.summary_note is None and i.summary for i in result.incidents[:10])
