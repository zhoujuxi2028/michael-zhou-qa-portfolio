import pytest


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    """所有测试默认不调用 Claude 后端。"""
    monkeypatch.setenv("DLT_LLM", "off")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
