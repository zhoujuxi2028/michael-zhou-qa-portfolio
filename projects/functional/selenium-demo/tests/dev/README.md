# Development Tests

This directory contains experimental and development test files that are not part of the main test suite.

## Purpose

- **Temporary tests**: Quick tests for debugging or exploration
- **Proof of concepts**: Testing new approaches or frameworks
- **Bug reproduction**: Isolated tests to reproduce specific issues
- **Experiments**: Trial implementations before integration

## Files

- `demo_test.py` - Demo test for showcasing test framework
- `test_login_fix.py` - Login functionality bug fix verification

## Usage

Run development tests separately from main suite:
```bash
pytest tests/dev/test_name.py -v
```

## Guidelines

1. Tests here are **not** run in CI/CD pipelines
2. Files may be deleted or refactored without notice
3. Consider moving stable tests to `src/tests/` when ready
4. Document the purpose of each test file at the top
