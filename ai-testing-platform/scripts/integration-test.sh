#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== LLM Evaluator Integration Tests ==="
echo "Project: $PROJECT_DIR"
echo ""

# ---- Prerequisite Check ----
if [ -z "${OPENAI_API_KEY:-}" ]; then
    echo "ERROR: OPENAI_API_KEY not set."
    echo "Usage: export OPENAI_API_KEY=sk-xxx"
    echo "       bash scripts/integration-test.sh"
    exit 1
fi
echo "✓ API key configured: ${OPENAI_API_KEY:0:8}..."
echo ""

cd "$PROJECT_DIR"

# ---- Activate venv ----
if [ -d venv ]; then
    source venv/bin/activate
fi

# ---- Run Integration Tests ----
echo "=== Running unit tests (no API key required) ==="
python -m pytest tests/ -m "not integration" -v --tb=short --no-header -q
UNIT_EXIT=$?
echo ""

echo "=== Running LLM integration tests (API key required) ==="
python -m pytest tests/integration/ -m integration -v --tb=short --no-header
INT_EXIT=$?
echo ""

# ---- Summary ----
echo "=== Results ==="
echo "Unit tests (no LLM): $([ $UNIT_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "LLM integration:     $([ $INT_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL')"

if [ $UNIT_EXIT -ne 0 ] || [ $INT_EXIT -ne 0 ]; then
    exit 1
fi
echo ""
echo "All tests PASSED."
