"""TC-VIS-*: ImageClassifier unit tests."""

import pytest

from src.vision_kg_tester import ClassificationError, ImageClassifier


@pytest.mark.vision
@pytest.mark.vision_accuracy
class TestAccuracy:
    def test_correct_label(self, classifier):
        """TC-VIS-ACC-001: cat.jpg returns label cat."""
        assert classifier.classify("cat.jpg").label == "cat"

    def test_confidence_range(self, classifier):
        """TC-VIS-ACC-002: confidence within [0, 1]."""
        for img in ["cat.jpg", "dog.jpg", "car.jpg"]:
            assert 0.0 <= classifier.classify(img).confidence <= 1.0

    def test_precision(self, classifier):
        """TC-VIS-ACC-003: evaluation precision >= 0.8."""
        report = classifier.evaluate(["cat.jpg", "dog.jpg", "car.jpg"], ["cat", "dog", "car"])
        assert report.precision >= 0.8

    def test_recall(self, classifier):
        """TC-VIS-ACC-004: evaluation recall >= 0.8."""
        report = classifier.evaluate(["cat.jpg", "dog.jpg", "car.jpg"], ["cat", "dog", "car"])
        assert report.recall >= 0.8

    def test_f1_formula(self, classifier):
        """TC-VIS-ACC-005: f1 equals 2*P*R/(P+R)."""
        report = classifier.evaluate(["cat.jpg", "dog.jpg"], ["cat", "bird"])
        p, r = report.precision, report.recall
        assert report.f1_score == pytest.approx(2 * p * r / (p + r), abs=0.001)


@pytest.mark.vision
@pytest.mark.vision_threshold
class TestThreshold:
    def test_high_confidence_reliable(self, classifier):
        """TC-VIS-THR-001: high confidence is reliable."""
        assert classifier.classify("cat.jpg").is_reliable is True

    def test_low_confidence_not_reliable(self):
        """TC-VIS-THR-002: low confidence is not reliable."""
        c = ImageClassifier(threshold=0.9)
        assert c.classify("dog.jpg").is_reliable is False

    def test_boundary_value(self):
        """TC-VIS-THR-003: confidence == threshold is reliable."""
        c = ImageClassifier(threshold=0.88)
        assert c.classify("dog.jpg").is_reliable is True

    def test_custom_threshold(self):
        """TC-VIS-THR-004: custom threshold takes effect."""
        c = ImageClassifier(threshold=0.9)
        assert c.classify("blur_cat.jpg").is_reliable is False


@pytest.mark.vision
@pytest.mark.vision_robustness
class TestRobustness:
    def test_blur_label(self, classifier):
        """TC-VIS-ROB-001: blurred image still returns correct label."""
        assert classifier.classify("blur_cat.jpg").label == "cat"

    def test_blur_confidence_degraded(self, classifier):
        """TC-VIS-ROB-002: blur confidence degrades but stays reliable."""
        c = classifier.classify("blur_cat.jpg").confidence
        assert 0.5 < c < 0.9

    def test_low_contrast(self, classifier):
        """TC-VIS-ROB-003: low-contrast image handled without error."""
        assert classifier.classify("dark_dog.jpg").label == "dog"

    def test_rotated(self, classifier):
        """TC-VIS-ROB-004: rotated image handled."""
        assert classifier.classify("rot_car.jpg").label == "car"

    def test_degradation_bounded(self, classifier):
        """TC-VIS-ROB-005: degradation delta <= 0.20."""
        pairs = [("cat.jpg", "blur_cat.jpg"), ("dog.jpg", "dark_dog.jpg"), ("car.jpg", "rot_car.jpg")]
        for normal, degraded in pairs:
            delta = classifier.classify(normal).confidence - classifier.classify(degraded).confidence
            assert delta <= 0.20


@pytest.mark.vision
@pytest.mark.vision_batch
class TestBatch:
    def test_repeat_consistent(self, classifier):
        """TC-VIS-BAT-001: repeated classification is consistent."""
        a = classifier.classify("cat.jpg")
        b = classifier.classify("cat.jpg")
        assert (a.label, a.confidence) == (b.label, b.confidence)

    def test_batch_matches_individual(self, classifier):
        """TC-VIS-BAT-002: batch result equals individual results."""
        imgs = ["cat.jpg", "dog.jpg"]
        batch = classifier.classify_batch(imgs)
        individual = [classifier.classify(i) for i in imgs]
        assert [(r.label, r.confidence) for r in batch] == [(r.label, r.confidence) for r in individual]

    def test_empty_batch(self, classifier):
        """TC-VIS-BAT-003: empty list returns empty list."""
        assert classifier.classify_batch([]) == []


@pytest.mark.vision
class TestErrors:
    def test_unknown_image(self, classifier):
        """TC-VIS-ERR-001: unknown image raises ClassificationError."""
        with pytest.raises(ClassificationError):
            classifier.classify("unknown.jpg")

    def test_empty_path(self, classifier):
        """TC-VIS-ERR-002: empty path raises ClassificationError."""
        with pytest.raises(ClassificationError):
            classifier.classify("")
