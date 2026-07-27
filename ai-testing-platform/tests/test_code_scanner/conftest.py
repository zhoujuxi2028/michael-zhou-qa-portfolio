import pytest
from pathlib import Path
from src.code_scanner.scanner import CodeScanner


@pytest.fixture
def simple_py(tmp_path) -> Path:
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
