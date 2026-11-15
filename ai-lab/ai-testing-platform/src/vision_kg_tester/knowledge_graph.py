"""Knowledge graph mock with accuracy/completeness/consistency/timeliness validation."""

from __future__ import annotations

import time
from dataclasses import dataclass, field


class KGError(Exception):
    pass


class ConsistencyError(KGError):
    pass


@dataclass
class Triple:
    subject: str
    predicate: str
    object: str
    confidence: float = 1.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class ValidationReport:
    is_valid: bool
    accuracy_score: float
    completeness_score: float
    consistency_violations: list[str]
    stale_triples: list[Triple]
    details: dict


SINGLE_VALUE_PREDICATES = {"age", "birthdate", "capital"}
MUTUALLY_EXCLUSIVE_TYPES = [{"Person", "Organization"}]


class KnowledgeGraph:
    def __init__(self, ttl_seconds: float = 86400.0):
        self.ttl_seconds = ttl_seconds
        self._triples: list[Triple] = []

    def add_triple(self, triple: Triple) -> None:
        self._triples.append(triple)

    def add_triples(self, triples: list[Triple]) -> None:
        for t in triples:
            self.add_triple(t)

    def get_triples(self, subject: str | None = None, predicate: str | None = None) -> list[Triple]:
        result = self._triples
        if subject is not None:
            result = [t for t in result if t.subject == subject]
        if predicate is not None:
            result = [t for t in result if t.predicate == predicate]
        return result

    def remove_triple(self, subject: str, predicate: str, object: str) -> bool:
        for i, t in enumerate(self._triples):
            if t.subject == subject and t.predicate == predicate and t.object == object:
                del self._triples[i]
                return True
        return False

    def validate_accuracy(self, expected: list[Triple]) -> float:
        if not expected:
            return 1.0
        expected_set = {(t.subject, t.predicate, t.object) for t in expected}
        actual_set = {(t.subject, t.predicate, t.object) for t in self._triples}
        return len(actual_set & expected_set) / len(expected_set)

    def validate_completeness(self, expected_entities: set[str]) -> float:
        if not expected_entities:
            return 1.0
        actual_entities = {t.subject for t in self._triples} | {t.object for t in self._triples}
        return len(actual_entities & expected_entities) / len(expected_entities)

    def check_consistency(self) -> list[str]:
        violations: list[str] = []
        seen_single: dict[tuple[str, str], str] = {}
        entity_types: dict[str, set[str]] = {}
        for t in self._triples:
            if t.predicate in SINGLE_VALUE_PREDICATES:
                key = (t.subject, t.predicate)
                if key in seen_single and seen_single[key] != t.object:
                    violations.append(
                        f"single-value conflict: {t.subject}.{t.predicate} = {seen_single[key]} vs {t.object}"
                    )
                else:
                    seen_single[key] = t.object
            if t.predicate == "type":
                entity_types.setdefault(t.subject, set()).add(t.object)
            if t.subject == t.object:
                violations.append(f"reflexive error: {t.subject} -{t.predicate}-> {t.object}")
        for subject, types in entity_types.items():
            for pair in MUTUALLY_EXCLUSIVE_TYPES:
                if pair.issubset(types):
                    violations.append(f"type conflict: {subject} cannot be both {sorted(pair)}")
        return violations

    def check_timeliness(self) -> list[Triple]:
        now = time.time()
        return [t for t in self._triples if now - t.timestamp > self.ttl_seconds]

    def full_validation(
        self,
        expected_triples: list[Triple],
        expected_entities: set[str],
    ) -> ValidationReport:
        accuracy = self.validate_accuracy(expected_triples)
        completeness = self.validate_completeness(expected_entities)
        violations = self.check_consistency()
        stale = self.check_timeliness()
        return ValidationReport(
            is_valid=(not violations and accuracy == 1.0),
            accuracy_score=accuracy,
            completeness_score=completeness,
            consistency_violations=violations,
            stale_triples=stale,
            details={"total_triples": len(self._triples)},
        )
