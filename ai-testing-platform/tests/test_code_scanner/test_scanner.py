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
