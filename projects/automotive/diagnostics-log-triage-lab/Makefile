.PHONY: install lint format test integration demo serve ci clean

PY ?= python

install:
	$(PY) -m pip install -r requirements.txt

lint:
	black --check src/ tests/
	isort --check-only src/ tests/
	flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203
	ruff check src/ tests/
	ruff format --check src/ tests/

format:
	black src/ tests/
	isort src/ tests/

test:
	DLT_LLM=off pytest tests/unit/ --cov=src --cov-report=term-missing --cov-fail-under=85

integration:
	DLT_LLM=off pytest tests/integration/ -m integration

demo:
	DLT_LLM=off $(PY) -m src.cli demo --seed 42 --out out/

serve:
	uvicorn src.api:app --port 3030

ci: lint test integration demo

clean:
	rm -rf out/ .pytest_cache .coverage htmlcov
