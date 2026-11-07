# Code Scanner (REQ-AI-003) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `CodeScanner` that auto-collects `ModuleMetrics` from real Python files, driving the existing `DefectPredictor` engine without manual data entry.

**Architecture:** `CodeScanner` traverses `.py` files in a given directory and collects 7 metrics per file using stdlib `ast` (lines, imports), `radon` (cyclomatic complexity), and `subprocess` git commands (churn, staleness, bug history). A CLI script `scan_and_predict.py` wires `CodeScanner` + `DefectPredictor` together and prints a ranked risk table. Tests mock subprocess calls; AST and radon tests use real temp files.

**Tech Stack:** Python stdlib (`ast`, `pathlib`, `subprocess`, `datetime`), `radon==6.0.1` (CC analysis), `pytest` + `unittest.mock` (tests), `argparse` (CLI)

---

## File Structure

```
Create: src/code_scanner/__init__.py
Create: src/code_scanner/scanner.py
Create: tests/test_code_scanner/__init__.py
Create: tests/test_code_scanner/conftest.py
Create: tests/test_code_scanner/test_scanner.py
Create: scripts/scan_and_predict.py
Modify: requirements.txt            ← add radon==6.0.1
Modify: pytest.ini                  ← add scanner marker
Modify: docs/ARCHITECTURE.md        ← add CodeScanner section
Modify: docs/project-management/requirements-backlog.md  ← status Proposed→Implemented
```

---

## Task 1: Setup — radon dependency + test infrastructure

**Files:**
- Modify: `requirements.txt`
- Modify: `pytest.ini`
- Create: `src/code_scanner/__init__.py`
- Create: `tests/test_code_scanner/__init__.py`
- Create: `tests/test_code_scanner/conftest.py`

- [ ] **Step 1: Add radon to requirements.txt**

Append after the `# Testing Framework` block:

```
# Code Analysis
radon==6.0.1
```

- [ ] **Step 2: Install radon**

```bash
cd ai-testing-platform
source venv/bin/activate
pip install radon==6.0.1
```

Expected: `Successfully installed radon-6.0.1`

- [ ] **Step 3: Add scanner marker to pytest.ini**

In the `markers =` block, append:

```ini
    scanner: CodeScanner unit tests
```

- [ ] **Step 4: Create module init**

`src/code_scanner/__init__.py`:
```python
from .scanner import CodeScanner, ScanError

__all__ = ["CodeScanner", "ScanError"]
```

- [ ] **Step 5: Create test package + conftest**

`tests/test_code_scanner/__init__.py`: empty file.

`tests/test_code_scanner/conftest.py`:
```python
"""Fixtures for test_code_scanner tests."""
import pytest
from pathlib import Path
from src.code_scanner.scanner import CodeScanner


@pytest.fixture
def simple_py(tmp_path) -> Path:
    """A minimal Python file with 2 imports and 5 lines of code."""
    f = tmp_path / "simple.py"
    f.write_text(
        "import os\n"
        "import sys\n"
        "\n"
        "def hello():\n"
        "    return 42\n",
        encoding="utf-8",
    )
    return f


@pytest.fixture
def scanner(tmp_path) -> CodeScanner:
    return CodeScanner(base_path=tmp_path, git_root=tmp_path)
```

- [ ] **Step 6: Verify test discovery**

```bash
pytest tests/test_code_scanner/ --collect-only 2>&1 | head -10
```

Expected: `no tests ran` (no test file yet — that's fine, just verifying discovery setup).

- [ ] **Step 7: Commit**

```bash
git add ai-testing-platform/src/code_scanner/__init__.py \
        ai-testing-platform/tests/test_code_scanner/__init__.py \
        ai-testing-platform/tests/test_code_scanner/conftest.py \
        ai-testing-platform/requirements.txt \
        ai-testing-platform/pytest.ini
git commit -m "chore(ai-testing): setup CodeScanner scaffold (REQ-AI-003)"
```

---

## Task 2: `CodeScanner` skeleton + `_count_lines`

**Files:**
- Create: `src/code_scanner/scanner.py`
- Modify: `tests/test_code_scanner/test_scanner.py`

- [ ] **Step 1: Write failing test**

`tests/test_code_scanner/test_scanner.py`:
```python
"""TC-SCN-*: CodeScanner unit tests."""
import pytest
from pathlib import Path
from src.code_scanner.scanner import CodeScanner, ScanError


@pytest.mark.scanner
class TestCountLines:
    def test_counts_non_empty_lines(self, simple_py, tmp_path):
        """TC-SCN-001: _count_lines returns count of non-empty lines."""
        scanner = CodeScanner(tmp_path, tmp_path)
        source = simple_py.read_text()
        assert scanner._count_lines(source) == 4  # blank line excluded

    def test_empty_file_returns_zero(self, tmp_path):
        """TC-SCN-002: Empty file returns 0 lines."""
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner._count_lines("") == 0

    def test_nonexistent_path_raises(self, tmp_path):
        """TC-SCN-003: ScanError raised for missing base_path."""
        with pytest.raises(ScanError, match="does not exist"):
            CodeScanner(tmp_path / "nonexistent", tmp_path)
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pytest tests/test_code_scanner/test_scanner.py -v 2>&1 | tail -15
```

Expected: `ImportError` or `ModuleNotFoundError` (scanner.py doesn't exist yet).

- [ ] **Step 3: Create scanner.py skeleton with `_count_lines`**

`src/code_scanner/scanner.py`:
```python
"""Code Scanner — auto-collects ModuleMetrics from Python source files."""
from __future__ import annotations

import ast
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from src.defect_predictor.predictor import ModuleMetrics


class ScanError(Exception):
    pass


class CodeScanner:
    def __init__(self, base_path: str | Path, git_root: str | Path | None = None):
        self.base_path = Path(base_path).resolve()
        self.git_root = Path(git_root).resolve() if git_root else self.base_path
        if not self.base_path.exists():
            raise ScanError(f"Path does not exist: {self.base_path}")

    def scan(self) -> list[ModuleMetrics]:
        """Scan all .py files under base_path and return ModuleMetrics list."""
        py_files = sorted(self.base_path.rglob("*.py"))
        return [self.scan_file(f) for f in py_files]

    def scan_file(self, file_path: Path) -> ModuleMetrics:
        """Collect all metrics for a single .py file."""
        source = file_path.read_text(encoding="utf-8")
        name = str(file_path.relative_to(self.base_path))
        return ModuleMetrics(
            name=name,
            lines_of_code=self._count_lines(source),
            dependency_count=self._count_dependencies(source),
            cyclomatic_complexity=self._get_cyclomatic_complexity(source),
            last_modified_days=self._get_last_modified_days(file_path),
            code_churn=self._get_code_churn(file_path),
            bug_history=self._get_bug_history(file_path),
            test_coverage=0.0,
        )

    def _count_lines(self, source: str) -> int:
        """Count non-empty lines in source."""
        return sum(1 for line in source.splitlines() if line.strip())

    def _count_dependencies(self, source: str) -> int:
        raise NotImplementedError

    def _get_cyclomatic_complexity(self, source: str) -> float:
        raise NotImplementedError

    def _get_last_modified_days(self, file_path: Path) -> int:
        raise NotImplementedError

    def _get_code_churn(self, file_path: Path) -> int:
        raise NotImplementedError

    def _get_bug_history(self, file_path: Path) -> int:
        raise NotImplementedError
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestCountLines -v
```

Expected: 3 PASSED.

- [ ] **Step 5: Commit**

```bash
git add ai-testing-platform/src/code_scanner/scanner.py \
        ai-testing-platform/tests/test_code_scanner/test_scanner.py
git commit -m "feat(ai-testing): CodeScanner skeleton + _count_lines"
```

---

## Task 3: `_count_dependencies`

**Files:**
- Modify: `src/code_scanner/scanner.py`
- Modify: `tests/test_code_scanner/test_scanner.py`

- [ ] **Step 1: Write failing tests**

Append to `test_scanner.py`:
```python
@pytest.mark.scanner
class TestCountDependencies:
    def test_counts_import_statements(self, simple_py, tmp_path):
        """TC-SCN-004: Counts top-level import and from-import statements."""
        scanner = CodeScanner(tmp_path, tmp_path)
        source = simple_py.read_text()
        assert scanner._count_dependencies(source) == 2  # import os, import sys

    def test_from_import_counts_as_one(self, tmp_path):
        """TC-SCN-005: `from x import a, b` counts as 1 dependency."""
        scanner = CodeScanner(tmp_path, tmp_path)
        source = "from os import path, getcwd\nimport re\n"
        assert scanner._count_dependencies(source) == 2

    def test_no_imports_returns_zero(self, tmp_path):
        """TC-SCN-006: File with no imports returns 0."""
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner._count_dependencies("x = 1\n") == 0
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestCountDependencies -v 2>&1 | tail -10
```

Expected: `NotImplementedError`.

- [ ] **Step 3: Implement `_count_dependencies`**

Replace the `_count_dependencies` stub in `scanner.py`:
```python
def _count_dependencies(self, source: str) -> int:
    """Count import statements (Import + ImportFrom) using AST."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return 0
    return sum(1 for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom)))
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestCountDependencies -v
```

Expected: 3 PASSED.

- [ ] **Step 5: Commit**

```bash
git add ai-testing-platform/src/code_scanner/scanner.py \
        ai-testing-platform/tests/test_code_scanner/test_scanner.py
git commit -m "feat(ai-testing): add _count_dependencies via AST"
```

---

## Task 4: `_get_cyclomatic_complexity`

**Files:**
- Modify: `src/code_scanner/scanner.py`
- Modify: `tests/test_code_scanner/test_scanner.py`

- [ ] **Step 1: Write failing tests**

Append to `test_scanner.py`:
```python
@pytest.mark.scanner
class TestCyclomaticComplexity:
    def test_simple_function_has_low_complexity(self, tmp_path):
        """TC-SCN-007: A function with no branches has complexity ~1."""
        scanner = CodeScanner(tmp_path, tmp_path)
        source = "def greet(name):\n    return f'Hello {name}'\n"
        cc = scanner._get_cyclomatic_complexity(source)
        assert 1.0 <= cc <= 2.0

    def test_branchy_function_has_higher_complexity(self, tmp_path):
        """TC-SCN-008: Multiple if-branches raise complexity above 3."""
        scanner = CodeScanner(tmp_path, tmp_path)
        source = (
            "def classify(x):\n"
            "    if x > 100:\n"
            "        return 'high'\n"
            "    elif x > 50:\n"
            "        return 'medium'\n"
            "    elif x > 10:\n"
            "        return 'low'\n"
            "    else:\n"
            "        return 'minimal'\n"
        )
        cc = scanner._get_cyclomatic_complexity(source)
        assert cc >= 3.0

    def test_empty_source_returns_one(self, tmp_path):
        """TC-SCN-009: File with no functions defaults to CC=1.0."""
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner._get_cyclomatic_complexity("x = 42\n") == 1.0
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestCyclomaticComplexity -v 2>&1 | tail -10
```

Expected: `NotImplementedError`.

- [ ] **Step 3: Implement `_get_cyclomatic_complexity`**

Add import at top of `scanner.py`:
```python
from radon.complexity import cc_visit
```

Replace the stub:
```python
def _get_cyclomatic_complexity(self, source: str) -> float:
    """Average cyclomatic complexity across all functions/methods via radon."""
    try:
        blocks = cc_visit(source)
    except Exception:
        return 1.0
    if not blocks:
        return 1.0
    return round(sum(b.complexity for b in blocks) / len(blocks), 1)
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestCyclomaticComplexity -v
```

Expected: 3 PASSED.

- [ ] **Step 5: Commit**

```bash
git add ai-testing-platform/src/code_scanner/scanner.py \
        ai-testing-platform/tests/test_code_scanner/test_scanner.py
git commit -m "feat(ai-testing): add _get_cyclomatic_complexity via radon"
```

---

## Task 5: `_get_last_modified_days` + `_get_code_churn`

**Files:**
- Modify: `src/code_scanner/scanner.py`
- Modify: `tests/test_code_scanner/test_scanner.py`

- [ ] **Step 1: Write failing tests**

Append to `test_scanner.py`:
```python
from unittest.mock import patch, MagicMock


@pytest.mark.scanner
class TestGitMetrics:
    def test_last_modified_days_from_git_timestamp(self, simple_py, tmp_path):
        """TC-SCN-010: Computes days since last git modification."""
        scanner = CodeScanner(tmp_path, tmp_path)
        # Mock git returning a timestamp 10 days ago
        import time
        ten_days_ago = str(int(time.time()) - 10 * 86400)
        mock_result = MagicMock(stdout=ten_days_ago, returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            days = scanner._get_last_modified_days(simple_py)
        assert 9 <= days <= 11  # allow ±1 day for timing

    def test_last_modified_days_fallback_on_no_git(self, simple_py, tmp_path):
        """TC-SCN-011: Returns 0 if git command fails (new/untracked file)."""
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="", returncode=128)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            days = scanner._get_last_modified_days(simple_py)
        assert days == 0

    def test_code_churn_counts_commits(self, simple_py, tmp_path):
        """TC-SCN-012: Counts commit lines from git log --since 30 days."""
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="abc123 fix\ndef456 feat\nghi789 docs\n", returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            churn = scanner._get_code_churn(simple_py)
        assert churn == 3

    def test_code_churn_zero_on_no_commits(self, simple_py, tmp_path):
        """TC-SCN-013: Returns 0 when no commits in the last 30 days."""
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="", returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            churn = scanner._get_code_churn(simple_py)
        assert churn == 0
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestGitMetrics -v 2>&1 | tail -15
```

Expected: `NotImplementedError`.

- [ ] **Step 3: Implement both methods in `scanner.py`**

Replace stubs:
```python
def _get_last_modified_days(self, file_path: Path) -> int:
    """Days since last git commit touching this file. Returns 0 if untracked."""
    result = subprocess.run(
        ["git", "log", "-1", "--format=%at", "--", str(file_path)],
        capture_output=True, text=True, cwd=str(self.git_root),
    )
    ts = result.stdout.strip()
    if not ts or result.returncode != 0:
        return 0
    modified_dt = datetime.fromtimestamp(int(ts), tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    return max(0, (now - modified_dt).days)

def _get_code_churn(self, file_path: Path) -> int:
    """Number of commits touching this file in the last 30 days."""
    result = subprocess.run(
        ["git", "log", "--oneline", "--since=30 days ago", "--", str(file_path)],
        capture_output=True, text=True, cwd=str(self.git_root),
    )
    if result.returncode != 0:
        return 0
    return len([l for l in result.stdout.splitlines() if l.strip()])
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestGitMetrics -v
```

Expected: 4 PASSED.

- [ ] **Step 5: Commit**

```bash
git add ai-testing-platform/src/code_scanner/scanner.py \
        ai-testing-platform/tests/test_code_scanner/test_scanner.py
git commit -m "feat(ai-testing): add git-based churn and staleness metrics"
```

---

## Task 6: `_get_bug_history`

**Files:**
- Modify: `src/code_scanner/scanner.py`
- Modify: `tests/test_code_scanner/test_scanner.py`

- [ ] **Step 1: Write failing tests**

Append to `test_scanner.py`:
```python
@pytest.mark.scanner
class TestBugHistory:
    def test_counts_fix_commits_in_past_year(self, simple_py, tmp_path):
        """TC-SCN-014: Counts commits with fix/bug keywords in last 365 days."""
        scanner = CodeScanner(tmp_path, tmp_path)
        log_output = (
            "abc123 fix: null pointer in login\n"
            "def456 feat: add dashboard\n"
            "ghi789 bug: crash on empty input\n"
            "jkl012 fix(auth): token expiry\n"
        )
        mock_result = MagicMock(stdout=log_output, returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            count = scanner._get_bug_history(simple_py)
        assert count == 3  # 3 lines contain fix or bug

    def test_no_bug_commits_returns_zero(self, simple_py, tmp_path):
        """TC-SCN-015: Returns 0 when no fix/bug commits found."""
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="abc123 feat: initial impl\n", returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            count = scanner._get_bug_history(simple_py)
        assert count == 0
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestBugHistory -v 2>&1 | tail -10
```

Expected: `NotImplementedError`.

- [ ] **Step 3: Implement `_get_bug_history` in `scanner.py`**

Add import at top:
```python
import re
```

Replace stub:
```python
def _get_bug_history(self, file_path: Path) -> int:
    """Count fix/bug-related commits touching this file in the last 365 days."""
    result = subprocess.run(
        ["git", "log", "--oneline", "--since=365 days ago", "--", str(file_path)],
        capture_output=True, text=True, cwd=str(self.git_root),
    )
    if result.returncode != 0:
        return 0
    pattern = re.compile(r"\b(fix|bug|defect|error|hotfix)\b", re.IGNORECASE)
    return sum(1 for line in result.stdout.splitlines() if pattern.search(line))
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestBugHistory -v
```

Expected: 2 PASSED.

- [ ] **Step 5: Commit**

```bash
git add ai-testing-platform/src/code_scanner/scanner.py \
        ai-testing-platform/tests/test_code_scanner/test_scanner.py
git commit -m "feat(ai-testing): add _get_bug_history via git log grep"
```

---

## Task 7: `scan_file` + `scan` orchestration

**Files:**
- Modify: `tests/test_code_scanner/test_scanner.py`

No changes needed in `scanner.py` — `scan_file` and `scan` are already implemented. This task adds integration-level unit tests for the orchestration.

- [ ] **Step 1: Write tests**

Append to `test_scanner.py`:
```python
@pytest.mark.scanner
class TestScanOrchestration:
    def _patch_git(self, mock_run):
        """Helper: mock all git calls to return stable values."""
        mock_run.return_value = MagicMock(stdout="", returncode=0)

    def test_scan_file_returns_module_metrics(self, simple_py, tmp_path):
        """TC-SCN-016: scan_file returns ModuleMetrics with correct name."""
        from src.defect_predictor.predictor import ModuleMetrics
        scanner = CodeScanner(tmp_path, tmp_path)
        with patch("src.code_scanner.scanner.subprocess.run") as mock_run:
            self._patch_git(mock_run)
            result = scanner.scan_file(simple_py)
        assert isinstance(result, ModuleMetrics)
        assert result.name == simple_py.relative_to(tmp_path).as_posix()
        assert result.lines_of_code == 4
        assert result.dependency_count == 2

    def test_scan_discovers_all_py_files(self, tmp_path):
        """TC-SCN-017: scan() finds all .py files recursively."""
        (tmp_path / "a.py").write_text("x = 1\n")
        (tmp_path / "sub").mkdir()
        (tmp_path / "sub" / "b.py").write_text("y = 2\n")
        scanner = CodeScanner(tmp_path, tmp_path)
        with patch("src.code_scanner.scanner.subprocess.run") as mock_run:
            self._patch_git(mock_run)
            results = scanner.scan()
        assert len(results) == 2
        names = {r.name for r in results}
        assert "a.py" in names
        assert str(Path("sub") / "b.py") in names

    def test_scan_empty_directory_returns_empty_list(self, tmp_path):
        """TC-SCN-018: scan() on directory with no .py files returns []."""
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner.scan() == []
```

- [ ] **Step 2: Run to verify tests PASS (all logic already implemented)**

```bash
pytest tests/test_code_scanner/test_scanner.py::TestScanOrchestration -v
```

Expected: 3 PASSED.

- [ ] **Step 3: Run full test suite (no regressions)**

```bash
pytest tests/test_code_scanner/ -v -m "scanner"
```

Expected: All PASSED, no errors.

- [ ] **Step 4: Commit**

```bash
git add ai-testing-platform/tests/test_code_scanner/test_scanner.py
git commit -m "test(ai-testing): add scan_file and scan orchestration tests"
```

---

## Task 8: CLI script `scripts/scan_and_predict.py`

**Files:**
- Create: `scripts/scan_and_predict.py`

- [ ] **Step 1: Create CLI script**

`scripts/scan_and_predict.py`:
```python
#!/usr/bin/env python3
"""Scan a Python project and print a DefectPredictor risk ranking.

Usage:
    python scripts/scan_and_predict.py --path src/
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.code_scanner.scanner import CodeScanner, ScanError
from src.defect_predictor.predictor import DefectPredictor


def main():
    parser = argparse.ArgumentParser(description="Scan Python project and predict defect risk.")
    parser.add_argument("--path", required=True, help="Directory to scan (e.g. src/)")
    parser.add_argument("--git-root", default=None, help="Git root for git-based metrics (default: --path)")
    args = parser.parse_args()

    try:
        scanner = CodeScanner(base_path=args.path, git_root=args.git_root)
    except ScanError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning: {args.path}\n")
    metrics_list = scanner.scan()

    if not metrics_list:
        print("No Python files found.")
        return

    predictor = DefectPredictor()
    ranked = predictor.rank_modules_by_risk(metrics_list)

    header = f"{'Rank':<5} {'Module':<45} {'Score':>6} {'Level':<8} {'Defects':>7}"
    print(header)
    print("-" * len(header))
    for i, report in enumerate(ranked, 1):
        print(
            f"{i:<5} {report.module_name:<45} "
            f"{report.risk_score:>6.1f} {report.risk_level.value:<8} "
            f"{report.predicted_defects:>7}"
        )

    print(f"\nTotal modules: {len(ranked)}")
    high = sum(1 for r in ranked if r.risk_level.value == "HIGH")
    print(f"HIGH risk: {high}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test CLI manually**

```bash
cd ai-testing-platform
source venv/bin/activate
python scripts/scan_and_predict.py --path src/
```

Expected output (approximate):
```
Scanning: src/

Rank  Module                                        Score  Level    Defects
----------------------------------------------------------------------
1     defect_predictor/predictor.py                 XX.X   MEDIUM         X
2     ...
```

Verify: output has correct columns, no Python errors, ≥1 row per `.py` file in `src/`.

- [ ] **Step 3: Commit**

```bash
git add ai-testing-platform/scripts/scan_and_predict.py
git commit -m "feat(ai-testing): add scan_and_predict CLI script (REQ-AI-003)"
```

---

## Task 9: Docs update

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/project-management/requirements-backlog.md`

- [ ] **Step 1: Update ARCHITECTURE.md — add CodeScanner section**

In `docs/ARCHITECTURE.md`, after the `### 2.2 DefectPredictor` section, add:

```markdown
### 2.3 CodeScanner

**职责**：自动扫描真实 Python 文件，采集 `ModuleMetrics`，驱动 `DefectPredictor` 引擎

**数据流**：
```
目录路径
   ↓ scan()
   ├─ rglob("*.py") → [file_path, ...]
   └─ scan_file(file_path)
       ├─ _count_lines(source)          → lines_of_code      (ast)
       ├─ _count_dependencies(source)   → dependency_count   (ast)
       ├─ _get_cyclomatic_complexity()  → cyclomatic_complexity (radon)
       ├─ _get_last_modified_days()     → last_modified_days (git log)
       ├─ _get_code_churn()             → code_churn         (git log --since)
       └─ _get_bug_history()            → bug_history        (git log grep)
   ↓ list[ModuleMetrics]
   → DefectPredictor.rank_modules_by_risk()
   → RiskReport[]
```

**关键数据类**：`ModuleMetrics`（复用自 `defect_predictor`）

**CLI**：`python scripts/scan_and_predict.py --path src/`
```

- [ ] **Step 2: Update requirements-backlog.md — mark REQ-AI-003 Implemented**

Change:
```
| REQ-AI-003 | DefectPredictor 真实代码扫描器（自动采集 ModuleMetrics） | `code_scanner` | Medium | Proposed | 2026-07-23 |
```
to:
```
| REQ-AI-003 | DefectPredictor 真实代码扫描器（自动采集 ModuleMetrics） | `code_scanner` | Medium | Implemented | 2026-07-23 |
```

- [ ] **Step 3: Commit**

```bash
git add ai-testing-platform/docs/ARCHITECTURE.md \
        ai-testing-platform/docs/project-management/requirements-backlog.md
git commit -m "docs(ai-testing): add CodeScanner architecture (REQ-AI-003)"
```

---

## Task 10: Full verification

- [ ] **Step 1: Run complete test suite**

```bash
cd ai-testing-platform
source venv/bin/activate
pytest tests/ -v -m "not llm and not integration" --tb=short 2>&1 | tail -20
```

Expected: All tests PASS, including the new `scanner` tests. Count should be ≥ 72 + 18 new tests.

- [ ] **Step 2: Run lint checks**

```bash
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203
```

Expected: No errors.

- [ ] **Step 3: Verify CLI produces ranked output**

```bash
python scripts/scan_and_predict.py --path src/
```

Expected: Table with ≥ 5 rows (one per .py file in src/), no Python traceback.

- [ ] **Step 4: Final commit (if any lint fixes needed)**

```bash
git add -p  # stage only lint fixes
git commit -m "style(ai-testing): lint fixes for CodeScanner"
```
