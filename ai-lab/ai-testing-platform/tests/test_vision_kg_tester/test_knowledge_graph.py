"""TC-KG-*: KnowledgeGraph unit tests."""

from unittest.mock import patch

import pytest

from src.vision_kg_tester import KnowledgeGraph, Triple


@pytest.mark.knowledge_graph
@pytest.mark.kg_accuracy
class TestAccuracy:
    def test_all_correct(self, graph):
        """TC-KG-ACC-001: added triples validate as fully accurate."""
        t = Triple("Alice", "age", "30")
        graph.add_triple(t)
        assert graph.validate_accuracy([t]) == 1.0

    def test_partial_correct(self, graph):
        """TC-KG-ACC-002: partial match yields 0 < score < 1."""
        graph.add_triple(Triple("Alice", "age", "30"))
        expected = [Triple("Alice", "age", "30"), Triple("Bob", "age", "40")]
        score = graph.validate_accuracy(expected)
        assert 0 < score < 1

    def test_fully_wrong(self, graph):
        """TC-KG-ACC-003: no match yields 0.0."""
        graph.add_triple(Triple("Alice", "age", "30"))
        assert graph.validate_accuracy([Triple("Bob", "age", "40")]) == 0.0

    def test_entity_extraction_precision(self, graph):
        """TC-KG-ACC-004: subjects/objects present in expected set."""
        graph.add_triple(Triple("Alice", "age", "30"))
        for t in graph.get_triples():
            assert t.subject in {"Alice"} or t.subject in {"30"}


@pytest.mark.knowledge_graph
@pytest.mark.kg_completeness
class TestCompleteness:
    def test_full_coverage(self, graph):
        """TC-KG-CPL-001: full coverage returns 1.0."""
        graph.add_triples([Triple("Alice", "age", "30"), Triple("Bob", "age", "40")])
        assert graph.validate_completeness({"Alice", "Bob"}) == 1.0

    def test_partial_coverage(self, graph):
        """TC-KG-CPL-002: missing entities yield 0 < score < 1."""
        graph.add_triple(Triple("Alice", "age", "30"))
        score = graph.validate_completeness({"Alice", "Bob"})
        assert 0 < score < 1

    def test_empty_graph(self, graph):
        """TC-KG-CPL-003: empty graph yields 0.0."""
        assert graph.validate_completeness({"Alice"}) == 0.0

    def test_empty_expected(self, graph):
        """TC-KG-CPL-004: empty expected set is trivially complete."""
        graph.add_triple(Triple("Alice", "age", "30"))
        assert graph.validate_completeness(set()) == 1.0


@pytest.mark.knowledge_graph
@pytest.mark.kg_consistency
class TestConsistency:
    def test_no_violations(self, graph):
        """TC-KG-CON-001: clean graph has no violations."""
        graph.add_triple(Triple("Alice", "age", "30"))
        assert graph.check_consistency() == []

    def test_single_value_conflict(self, graph):
        """TC-KG-CON-002: single-value predicate conflict detected."""
        graph.add_triples([Triple("Alice", "age", "30"), Triple("Alice", "age", "31")])
        assert any("single-value" in v for v in graph.check_consistency())

    def test_type_conflict(self, graph):
        """TC-KG-CON-003: type mutual exclusion conflict detected."""
        graph.add_triples([Triple("X", "type", "Person"), Triple("X", "type", "Organization")])
        assert any("type conflict" in v for v in graph.check_consistency())

    def test_reflexive(self, graph):
        """TC-KG-CON-004: reflexive triple detected."""
        graph.add_triple(Triple("X", "knows", "X"))
        assert any("reflexive" in v for v in graph.check_consistency())

    def test_multiple_violations(self, graph):
        """TC-KG-CON-005: multiple conflicts all detected."""
        graph.add_triples(
            [
                Triple("Alice", "age", "30"),
                Triple("Alice", "age", "31"),
                Triple("X", "knows", "X"),
            ]
        )
        assert len(graph.check_consistency()) == 2


@pytest.mark.knowledge_graph
@pytest.mark.kg_timeliness
class TestTimeliness:
    def test_fresh_triples_not_stale(self, graph):
        """TC-KG-TTL-001: newly added triples are not stale."""
        graph.add_triple(Triple("Alice", "age", "30"))
        assert graph.check_timeliness() == []

    def test_stale_triple_detected(self, graph):
        """TC-KG-TTL-002: expired triples are detected."""
        graph.add_triple(Triple("Alice", "age", "30", timestamp=0.0))
        with patch("time.time", return_value=86400.0 + 1.0):
            assert len(graph.check_timeliness()) == 1

    def test_re_add_updates_timestamp(self, graph):
        """TC-KG-TTL-003: re-adding a triple with a new timestamp updates it."""
        graph.add_triple(Triple("Alice", "age", "30", timestamp=0.0))
        graph.add_triple(Triple("Alice", "age", "30", timestamp=100.0))
        latest = max(t.timestamp for t in graph.get_triples("Alice", "age"))
        assert latest == 100.0

    def test_custom_ttl(self):
        """TC-KG-TTL-004: custom TTL takes effect."""
        kg = KnowledgeGraph(ttl_seconds=1.0)
        kg.add_triple(Triple("Alice", "age", "30", timestamp=0.0))
        with patch("time.time", return_value=5.0):
            assert len(kg.check_timeliness()) == 1


@pytest.mark.knowledge_graph
class TestFullValidation:
    def test_full_report(self, graph):
        """TC-KG-VAL-001: full validation returns four-dimension report."""
        t = Triple("Alice", "age", "30")
        graph.add_triple(t)
        report = graph.full_validation([t], {"Alice"})
        assert report.accuracy_score == 1.0
        assert report.completeness_score == 1.0
        assert report.consistency_violations == []
        assert report.stale_triples == []

    def test_healthy_graph_valid(self, graph):
        """TC-KG-VAL-002: healthy graph is valid."""
        t = Triple("Alice", "age", "30")
        graph.add_triple(t)
        assert graph.full_validation([t], {"Alice"}).is_valid is True

    def test_conflict_invalid(self, graph):
        """TC-KG-VAL-003: conflicting graph is invalid."""
        graph.add_triples([Triple("Alice", "age", "30"), Triple("Alice", "age", "31")])
        assert graph.full_validation([], set()).is_valid is False
