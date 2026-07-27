from unittest.mock import MagicMock, patch

import pytest
from pathlib import Path
from src.code_scanner.scanner import CodeScanner, ScanError


@pytest.mark.scanner
class TestCountLines:
    def test_counts_non_empty_lines(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        source = simple_py.read_text()
        assert scanner._count_lines(source) == 4

    def test_empty_file_returns_zero(self, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner._count_lines("") == 0

    def test_nonexistent_path_raises(self, tmp_path):
        with pytest.raises(ScanError, match="does not exist"):
            CodeScanner(tmp_path / "nonexistent", tmp_path)


@pytest.mark.scanner
class TestCountDependencies:
    def test_counts_import_statements(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        source = simple_py.read_text()
        assert scanner._count_dependencies(source) == 2

    def test_from_import_counts_as_one(self, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        source = "from os import path, getcwd\nimport re\n"
        assert scanner._count_dependencies(source) == 2

    def test_no_imports_returns_zero(self, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner._count_dependencies("x = 1\n") == 0


@pytest.mark.scanner
class TestCyclomaticComplexity:
    def test_simple_function_has_low_complexity(self, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        source = "def greet(name):\n    return f'Hello {name}'\n"
        cc = scanner._get_cyclomatic_complexity(source)
        assert 1.0 <= cc <= 2.0

    def test_branchy_function_has_higher_complexity(self, tmp_path):
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
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner._get_cyclomatic_complexity("x = 42\n") == 1.0


@pytest.mark.scanner
class TestGitMetrics:
    def test_last_modified_days_from_git_timestamp(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        import time
        ten_days_ago = str(int(time.time()) - 10 * 86400)
        mock_result = MagicMock(stdout=ten_days_ago, returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            days = scanner._get_last_modified_days(simple_py)
        assert 9 <= days <= 11

    def test_last_modified_days_fallback_on_no_git(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="", returncode=128)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            days = scanner._get_last_modified_days(simple_py)
        assert days == 0

    def test_code_churn_counts_commits(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="abc123 fix\ndef456 feat\nghi789 docs\n", returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            churn = scanner._get_code_churn(simple_py)
        assert churn == 3

    def test_code_churn_zero_on_no_commits(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="", returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            churn = scanner._get_code_churn(simple_py)
        assert churn == 0


@pytest.mark.scanner
class TestBugHistory:
    def test_counts_fix_commits_in_past_year(self, simple_py, tmp_path):
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
        assert count == 3

    def test_no_bug_commits_returns_zero(self, simple_py, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        mock_result = MagicMock(stdout="abc123 feat: initial impl\n", returncode=0)
        with patch("src.code_scanner.scanner.subprocess.run", return_value=mock_result):
            count = scanner._get_bug_history(simple_py)
        assert count == 0


@pytest.mark.scanner
class TestScanOrchestration:
    def _patch_git(self, mock_run):
        mock_run.return_value = MagicMock(stdout="", returncode=0)

    def test_scan_file_returns_module_metrics(self, simple_py, tmp_path):
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
        assert "sub/b.py" in names

    def test_scan_empty_directory_returns_empty_list(self, tmp_path):
        scanner = CodeScanner(tmp_path, tmp_path)
        assert scanner.scan() == []
