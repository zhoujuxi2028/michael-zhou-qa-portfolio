"""Image recognition mock classifier + evaluation (no real model)."""

from __future__ import annotations

from dataclasses import dataclass, field


class ClassificationError(Exception):
    pass


@dataclass
class ClassificationResult:
    image_path: str
    label: str
    confidence: float
    is_reliable: bool
    metadata: dict = field(default_factory=dict)


@dataclass
class BatchClassificationReport:
    results: list[ClassificationResult]
    precision: float
    recall: float
    f1_score: float
    total: int
    reliable_count: int


SAMPLE_IMAGES = {
    "cat.jpg": {"label": "cat", "confidence": 0.95},
    "dog.jpg": {"label": "dog", "confidence": 0.88},
    "car.jpg": {"label": "car", "confidence": 0.91},
    "blur_cat.jpg": {"label": "cat", "confidence": 0.78},
    "dark_dog.jpg": {"label": "dog", "confidence": 0.72},
    "rot_car.jpg": {"label": "car", "confidence": 0.75},
}


class ImageClassifier:
    DEFAULT_THRESHOLD = 0.5

    def __init__(self, threshold: float = DEFAULT_THRESHOLD):
        self.threshold = threshold

    def classify(self, image_path: str) -> ClassificationResult:
        if not image_path:
            raise ClassificationError("image_path must not be empty")
        entry = SAMPLE_IMAGES.get(image_path)
        if entry is None:
            raise ClassificationError(f"Unknown image: {image_path}")
        confidence = entry["confidence"]
        return ClassificationResult(
            image_path=image_path,
            label=entry["label"],
            confidence=confidence,
            is_reliable=confidence >= self.threshold,
        )

    def classify_batch(self, image_paths: list[str]) -> list[ClassificationResult]:
        return [self.classify(p) for p in image_paths]

    def evaluate(self, image_paths: list[str], ground_truth: list[str]) -> BatchClassificationReport:
        results = self.classify_batch(image_paths)
        total = len(results)
        tp = sum(1 for r, gt in zip(results, ground_truth) if r.label == gt)
        precision = tp / total if total else 0.0
        recall = tp / total if total else 0.0
        f1 = 0.0
        if precision + recall > 0:
            f1 = 2 * precision * recall / (precision + recall)
        reliable_count = sum(1 for r in results if r.is_reliable)
        return BatchClassificationReport(
            results=results,
            precision=round(precision, 4),
            recall=round(recall, 4),
            f1_score=round(f1, 4),
            total=total,
            reliable_count=reliable_count,
        )
