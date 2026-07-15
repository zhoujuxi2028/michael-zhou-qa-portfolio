import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


class LLMEvaluatorError(Exception):
    pass


@dataclass
class LLMIO:
    input: str
    actual_output: str
    expected_output: Optional[str] = None
    context: Optional[list[str]] = None


@dataclass
class MetricResult:
    name: str
    score: float
    threshold: float
    passed: bool = True
    reason: str = ""

    def __post_init__(self):
        self.passed = self.score >= self.threshold


@dataclass
class EvaluationReport:
    io: LLMIO
    results: list[MetricResult] = field(default_factory=list)
    overall_pass: bool = True
    summary: str = ""

    def __post_init__(self):
        self.overall_pass = all(r.passed for r in self.results) if self.results else True

    def add_result(self, result: MetricResult):
        self.results.append(result)
        self.overall_pass = self.overall_pass and result.passed


class BaseLLMEvaluator(ABC):
    def __init__(self, model=None, api_key=None, base_url=None):
        self._model = model
        self._api_key = api_key
        self._base_url = base_url
        self._model_instance = None

    def _get_model(self):
        if self._model_instance is None:
            from deepeval.models import GPTModel

            self._model_instance = self._model or GPTModel(
                model=os.getenv("LLM_MODEL", "deepseek-chat"),
                api_key=self._api_key or os.getenv("OPENAI_API_KEY"),
                base_url=self._base_url or os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com"),
            )
        return self._model_instance

    def _has_api_key(self) -> bool:
        return bool(self._api_key or os.getenv("OPENAI_API_KEY"))

    @abstractmethod
    def evaluate(self, io: LLMIO) -> list[MetricResult]: ...
