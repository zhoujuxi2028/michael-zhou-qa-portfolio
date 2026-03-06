# Migration Guide: Flat Structure to src/ Layout

## Summary

The selenium-tests project has been refactored from a flat directory structure to a standardized src/ layout following Python best practices.

## Changes

### Directory Structure

**Before:**
```
selenium-tests/
├── config/
├── helpers/
├── pages/
├── tests/
├── logs/
├── reports/
└── screenshots/
```

**After:**
```
selenium-tests/
├── src/
│   ├── core/
│   │   ├── config/          # Configuration management
│   │   ├── logging/         # Logging system
│   │   └── debugging/       # Debug helpers
│   ├── frameworks/
│   │   └── pages/           # Page Object Models
│   └── tests/
│       └── ui_tests/        # UI test cases
└── outputs/
    ├── logs/
    ├── reports/
    ├── screenshots/
    └── videos/
```

### Import Changes

| Old Import | New Import |
|------------|------------|
| `from config.test_config import TestConfig` | `from core.config.test_config import TestConfig` |
| `from helpers.logger import get_logger` | `from core.logging.test_logger import get_logger` |
| `from helpers.debug_helper import DebugHelper` | `from core.debugging.debug_helper import DebugHelper` |
| `from pages.login_page import LoginPage` | `from frameworks.pages.login_page import LoginPage` |
| `from pages.system_update_page import SystemUpdatePage` | `from frameworks.pages.system_update_page import SystemUpdatePage` |

### Configuration Changes

#### pytest.ini
- `testpaths = tests` → `testpaths = src/tests`
- `log_file = logs/pytest.log` → `log_file = outputs/logs/pytest.log`
- All report paths updated to use `outputs/reports/`

#### PROJECT_ROOT Calculation (test_config.py)
- Old: `Path(__file__).parent.parent`
- New: `Path(__file__).resolve().parents[3]`

## Setup Instructions

### 1. Install Package in Editable Mode

```bash
cd /path/to/selenium-tests
pip install -e .
```

This makes the package available for import without needing sys.path manipulation.

### 2. Run Tests

```bash
# Run all tests
pytest src/tests/

# Run with specific browser
pytest src/tests/ --browser firefox

# Run specific test category
pytest src/tests/ -m smoke
pytest src/tests/ -m P0
```

### 3. Verify Installation

```bash
# Check package is installed
pip show iwsva-selenium-tests

# Test imports work
python -c "from core.config.test_config import TestConfig; print('✓ Success')"
```

## Benefits

✅ **Standard Python package structure** - Follows PEP recommendations
✅ **No sys.path manipulation** - Cleaner, more maintainable code
✅ **Better IDE support** - Import auto-completion and navigation
✅ **Installable package** - Can be distributed and installed
✅ **Unified outputs** - All test artifacts in one place
✅ **Clear separation** - Source code vs. test data vs. outputs

## Breaking Changes

### 1. Import Paths
All import statements have changed. Update any custom scripts that import from this project.

### 2. Test Discovery Path
pytest now looks for tests in `src/tests/` instead of `tests/`.

### 3. Output Paths
All test artifacts (logs, reports, screenshots) now go to `outputs/` directory.

### 4. Package Installation Required
The project must be installed (`pip install -e .`) before tests can run.

## Rollback Instructions

If you need to revert to the old structure:

```bash
# Switch to main branch (old structure)
git checkout main

# Uninstall package
pip uninstall -y iwsva-selenium-tests

# Run tests the old way
pytest tests/
```

## Migration Timeline

- **Phase 0**: Baseline established (git SHA: baseline commit)
- **Phase 1-2**: Directory structure and package setup
- **Phase 3-5**: Source code migration (config, helpers, pages)
- **Phase 6**: Tests migration and sys.path removal (critical)
- **Phase 7**: Configuration file updates
- **Phase 8**: Cleanup and verification
- **Phase 9**: Merge to main

## Questions?

For issues or questions about the migration:
1. Check the plan file: `/home/michael/.claude/plans/humming-soaring-quiche.md`
2. Review commit history: `git log --oneline refactor/standardized-structure`
3. Consult CLAUDE.md for project structure details

---

**Refactored by**: Claude Sonnet 4.5
**Date**: 2026-02-11
**Branch**: refactor/standardized-structure
**Version**: 1.1.0
