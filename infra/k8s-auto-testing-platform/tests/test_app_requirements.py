"""Guard: every third-party import in app/main.py is pinned in app/requirements.txt.

Issue #926: prometheus_client was only in the project-level requirements.txt,
so the container image crashed with ModuleNotFoundError (CrashLoopBackOff).
"""

import ast
import re
import sys
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parent.parent / "app"


def _normalize(name):
    return re.sub(r"[-_.]+", "_", name).lower()


def _third_party_imports(source):
    names = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            names.add(node.module.split(".")[0])
    return {n for n in names if n not in sys.stdlib_module_names}


def _pinned_dists(requirements):
    dists = set()
    for line in requirements.splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            dists.add(_normalize(re.split(r"[\[=<>!~;\s]", line, maxsplit=1)[0]))
    return dists


@pytest.mark.unit
def test_app_imports_are_in_app_requirements():
    imports = _third_party_imports((APP_DIR / "main.py").read_text())
    pinned = _pinned_dists((APP_DIR / "requirements.txt").read_text())

    missing = sorted(i for i in imports if _normalize(i) not in pinned)

    assert not missing, f"app/requirements.txt is missing: {missing}"
