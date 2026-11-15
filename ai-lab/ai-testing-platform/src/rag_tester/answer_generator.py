"""Stage 7: answer generation (mock — extractive, faithfulness/hallucination check)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .context_builder import Context


@dataclass
class GeneratedAnswer:
    answer: str
    faithfulness_score: float
    relevance_score: float
    has_hallucination: bool
    metadata: dict = field(default_factory=dict)


class AnswerGenerator:
    def generate(self, query: str, context: Context, answer: str | None = None) -> GeneratedAnswer:
        if answer is None:
            sentences = [s for s in re.split(r"[.!?]\s+", context.text) if s.strip()]
            if not sentences:
                return GeneratedAnswer("", 0.0, 0.0, False, {"sentence_count": 0})
            answer = sentences[0].strip()

        context_words = {w.lower() for w in re.findall(r"\w+", context.text)}
        answer_words = re.findall(r"\w+", answer.lower())
        query_words = {w.lower() for w in re.findall(r"\w+", query)}

        in_context = sum(1 for w in answer_words if w in context_words)
        faithfulness = in_context / max(1, len(answer_words))
        overlap = sum(1 for w in answer_words if w in query_words)
        relevance = overlap / max(1, len(query_words))
        has_hallucination = any(w not in context_words for w in answer_words)

        return GeneratedAnswer(
            answer=answer,
            faithfulness_score=round(faithfulness, 4),
            relevance_score=round(relevance, 4),
            has_hallucination=has_hallucination,
            metadata={"sentence_count": len(re.split(r"[.!?]\s+", context.text))},
        )
