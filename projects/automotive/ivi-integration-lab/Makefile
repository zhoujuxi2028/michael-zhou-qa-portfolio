.PHONY: install ci lint test smoke integration regression report clean

install:
	pip install -r requirements.txt

lint:
	black --check src/ tests/
	isort --check-only src/ tests/
	flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203

test:
	pytest tests/unit/ -v --cov=src --cov-report=term-missing

smoke:
	pytest tests/integration/ -m smoke -v

integration:
	pytest tests/integration/ -m integration -v

regression:
	pytest tests/integration/ -m regression -v

ci: lint test smoke integration regression

report:
	pytest tests/ --html=reports/report.html --self-contained-html

clean:
	rm -rf __pycache__ .pytest_cache htmlcov .coverage logs/ reports/
