from __future__ import annotations

import ast
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from src.defect_predictor.predictor import ModuleMetrics

EXCLUDE_DIRS = {
    "venv",
    "__pycache__",
    ".git",
    ".eggs",
    "node_modules",
    ".ruff_cache",
    ".pytest_cache",
    ".mypy_cache",
    ".coverage",
}


class ScanError(Exception):
    pass


class CodeScanner:
    def __init__(self, base_path: str | Path, git_root: str | Path | None = None, exclude_dirs: set[str] | None = None):
        self.base_path = Path(base_path).resolve()
        self.git_root = Path(git_root).resolve() if git_root else self.base_path
        self.exclude_dirs = exclude_dirs or EXCLUDE_DIRS
        if not self.base_path.exists():
            raise ScanError(f"Path does not exist: {self.base_path}")

    def scan(self) -> list[ModuleMetrics]:
        py_files = sorted(self._iter_py_files())
        return [self.scan_file(f) for f in py_files]

    def _iter_py_files(self) -> list[Path]:
        result = []
        for f in self.base_path.rglob("*.py"):
            if not any(parent.name in self.exclude_dirs for parent in f.relative_to(self.base_path).parents):
                result.append(f)
        return result

    def scan_file(self, file_path: Path) -> ModuleMetrics:
        try:
            source = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            source = file_path.read_text(encoding="latin-1")
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
        return sum(1 for line in source.splitlines() if line.strip())

    def _count_dependencies(self, source: str) -> int:
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return 0
        return sum(1 for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom)))

    def _get_cyclomatic_complexity(self, source: str) -> float:
        from radon.complexity import cc_visit

        try:
            blocks = cc_visit(source)
        except Exception:
            return 1.0
        if not blocks:
            return 1.0
        return round(sum(b.complexity for b in blocks) / len(blocks), 1)

    def _get_last_modified_days(self, file_path: Path) -> int:
        try:
            result = subprocess.run(
                ["git", "log", "-1", "--format=%at", "--", str(file_path)],
                capture_output=True,
                text=True,
                cwd=str(self.git_root),
                timeout=10,
            )
            ts = result.stdout.strip()
            if not ts or result.returncode != 0:
                return 0
            modified_dt = datetime.fromtimestamp(int(ts), tz=timezone.utc)
            now = datetime.now(tz=timezone.utc)
            return max(0, (now - modified_dt).days)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return 0

    def _get_code_churn(self, file_path: Path) -> int:
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "--since=30 days ago", "--", str(file_path)],
                capture_output=True,
                text=True,
                cwd=str(self.git_root),
                timeout=10,
            )
            if result.returncode != 0:
                return 0
            return sum(1 for line in result.stdout.splitlines() if line.strip())
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return 0

    def _get_bug_history(self, file_path: Path) -> int:
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "--since=365 days ago", "--", str(file_path)],
                capture_output=True,
                text=True,
                cwd=str(self.git_root),
                timeout=10,
            )
            if result.returncode != 0:
                return 0
            pattern = re.compile(r"\b(fix|bug|defect|error|hotfix)\b", re.IGNORECASE)
            return sum(1 for line in result.stdout.splitlines() if pattern.search(line))
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return 0
