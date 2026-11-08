#!/bin/bash
# SID IAM Testing Platform - Test Runner
set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "  SID IAM Testing Platform"
echo "=========================================="

# Check virtual env
if [ -z "$VIRTUAL_ENV" ]; then
    echo "[WARN] Virtual environment not activated"
    echo "  Run: source venv/bin/activate"
fi

MODE="${1:-all}"

case "$MODE" in
    all)
        echo "[RUN] All 138 tests"
        pytest tests/ -v
        ;;
    auth)
        echo "[RUN] Auth domain (54 tests)"
        pytest tests/test_auth/ -v
        ;;
    data)
        echo "[RUN] Data platform domain (44 tests)"
        pytest tests/test_data/ -v
        ;;
    ai)
        echo "[RUN] AI Agent domain (40 tests)"
        pytest tests/test_ai/ -v
        ;;
    p0)
        echo "[RUN] P0 critical tests (60 tests)"
        pytest tests/ -v -m P0
        ;;
    security)
        echo "[RUN] Security tests"
        pytest tests/ -v -m security
        ;;
    coverage)
        echo "[RUN] All tests with coverage"
        pytest tests/ -v --cov=src --cov-report=term-missing --cov-report=html
        echo "[OK] HTML report: htmlcov/index.html"
        ;;
    quality)
        echo "[CHECK] Code quality"
        echo "--- black ---"
        black --check src/ tests/
        echo "--- isort ---"
        isort --check-only src/ tests/
        echo "--- flake8 ---"
        flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203
        echo "[OK] All checks passed"
        ;;
    *)
        echo "Usage: $0 {all|auth|data|ai|p0|security|coverage|quality}"
        exit 1
        ;;
esac

echo "=========================================="
echo "  Done"
echo "=========================================="
