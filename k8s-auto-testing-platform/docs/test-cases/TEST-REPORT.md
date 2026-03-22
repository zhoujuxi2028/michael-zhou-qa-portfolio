# K8S Auto Testing Platform - Test Report Guide

## Overview

This document describes the enhanced test reporting system for the K8S Auto Testing Platform. The system generates comprehensive HTML reports with metrics, executive summaries, and detailed test results.

## Report Types

### 1. pytest-html Report (`test-report.html`)

Standard pytest HTML report with:
- Test results with pass/fail/skip status
- Test duration for each test
- Error messages and tracebacks
- Environment information

### 2. Executive Summary (`executive-summary.html`)

Enhanced custom report featuring:
- Visual dashboard with key metrics
- Pass rate progress bar
- Results grouped by category (deployment, service, HPA, chaos)
- Test duration breakdown
- Color-coded status indicators

### 3. JSON Report (`test-results.json`)

Machine-readable format containing:
- Complete test summary
- Individual test results
- Category breakdown
- Timing information

### 4. JUnit XML (`junit-results.xml`)

Standard JUnit format for CI/CD integration:
- Compatible with GitHub Actions
- Jenkins integration ready
- Azure DevOps compatible

## Generating Reports

### Quick Start

```bash
# Generate report with all tests
./scripts/generate-report.sh

# Run specific test markers
./scripts/generate-report.sh -m smoke
./scripts/generate-report.sh -m "not slow"
./scripts/generate-report.sh -m hpa

# Generate from existing JUnit XML (no test run)
./scripts/generate-report.sh --no-run
```

### Using Python Directly

```bash
# Run tests and generate all reports
python tools/report_generator.py

# Specify test path and markers
python tools/report_generator.py --test-path tests/ -m integration

# Parse existing JUnit XML
python tools/report_generator.py --junit-xml reports/junit-results.xml
```

### Pytest Direct

```bash
# Standard pytest with HTML report
pytest tests/ -v \
    --html=reports/test-report.html \
    --self-contained-html \
    --junitxml=reports/junit-results.xml
```

## Report Metrics

### Summary Metrics

| Metric | Description |
|--------|-------------|
| Total Tests | Total number of test cases executed |
| Passed | Tests that completed successfully |
| Failed | Tests that had assertion failures |
| Skipped | Tests that were skipped (markers, conditions) |
| Errors | Tests that had unexpected errors |
| Pass Rate | Percentage of passed tests |
| Duration | Total test execution time |

### Category Breakdown

Tests are automatically categorized by their module:
- `test_deployment` - Deployment verification tests
- `test_service` - Service connectivity tests
- `test_hpa` - HPA scaling tests
- `test_chaos` - Chaos engineering tests

## CI/CD Integration

### GitHub Actions

Reports are automatically generated and uploaded as artifacts:

```yaml
- name: Run tests with coverage
  run: |
    pytest tests/ -v \
      --html=reports/test-report.html \
      --self-contained-html \
      --junitxml=reports/junit-results.xml

- name: Generate enhanced report
  if: always()
  run: |
    python tools/report_generator.py \
      --junit-xml reports/junit-results.xml

- name: Upload test reports
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: test-reports
    path: reports/
```

### Viewing Reports

After CI/CD run:
1. Go to the workflow run in GitHub Actions
2. Download the `test-reports` artifact
3. Extract and open `executive-summary.html` in a browser

## Sample Report Output

### Executive Summary Preview

```
========================================
K8S Auto Testing Platform - Test Report
========================================

Status: PASSED
Duration: 2m 35s

Summary:
  Total:   25
  Passed:  23
  Failed:   0
  Skipped:  2
  Pass Rate: 92.0%

Categories:
  test_deployment:  8 passed, 0 failed
  test_service:     5 passed, 0 failed
  test_hpa:         6 passed, 2 skipped
  test_chaos:       4 passed, 0 failed
```

## Customization

### Adding Custom Metrics

Edit `tools/report_generator.py` to add custom metrics:

```python
def generate_executive_summary(self) -> Dict:
    summary = {
        # Add custom metrics here
        "custom_metric": self.calculate_custom_metric(),
        ...
    }
    return summary
```

### Custom Report Templates

Modify `_render_html_template()` in `report_generator.py` to customize the HTML output.

## Best Practices

1. **Always generate reports** - Include report generation in all CI/CD pipelines
2. **Archive reports** - Keep historical reports for trend analysis
3. **Use markers** - Filter tests for faster feedback during development
4. **Review failures** - Check failed tests immediately in the HTML report
5. **Track metrics** - Monitor pass rate trends over time

## Troubleshooting

### No JUnit XML Generated

```bash
# Ensure pytest-html is installed
pip install pytest-html

# Verify pytest configuration
pytest --co -q  # List collected tests
```

### Report Not Opening

```bash
# Manually open the report
open reports/executive-summary.html  # macOS
xdg-open reports/executive-summary.html  # Linux
start reports/executive-summary.html  # Windows
```

### Empty Report

Check that tests are being discovered:
```bash
pytest tests/ --collect-only
```
