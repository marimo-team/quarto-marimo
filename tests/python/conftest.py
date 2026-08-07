from __future__ import annotations

import gc
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from collections.abc import Iterator

repo_root = Path(__file__).resolve().parents[2]
for path in (repo_root, repo_root / "_extensions/marimo/python"):
    value = str(path)
    if value not in sys.path:
        sys.path.insert(0, value)


@pytest.fixture(autouse=True)
def release_compiler_sessions() -> Iterator[None]:
    yield
    # Production compiles each document in a fresh subprocess. Tests reuse one
    # process, so collect marimo's closed multiprocessing session cycles here.
    gc.collect()
