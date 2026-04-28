from __future__ import annotations

import sys
from pathlib import Path

# Add the repo root so tests can import extension modules via _extensions.marimo.*
_repo_root = str(Path(__file__).resolve().parent.parent.parent)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
