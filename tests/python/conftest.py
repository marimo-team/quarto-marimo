from __future__ import annotations

import sys
from pathlib import Path

# Add the _extensions/marimo directory to sys.path so tests can import
# extract.py and command.py directly.
_ext_dir = str(Path(__file__).resolve().parent.parent.parent / "_extensions" / "marimo")
if _ext_dir not in sys.path:
    sys.path.insert(0, _ext_dir)
