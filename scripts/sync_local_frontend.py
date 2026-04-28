#!/usr/bin/env python3

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse


def _is_absolute_url(value: str) -> bool:
    parsed = urlparse(value)
    return bool(parsed.scheme and parsed.netloc)


def _debug_endpoint_path(value: str) -> Path | None:
    if not value or _is_absolute_url(value):
        return None

    normalized = value.strip()
    if not normalized:
        return None

    # Quarto pages should only point at a site-local directory here.
    relative = Path(normalized.lstrip("/"))
    if any(part in {"", ".", ".."} for part in relative.parts):
        return None
    return relative


def _local_frontend_root(project_dir: Path) -> Path:
    override = os.environ.get("QUARTO_MARIMO_LOCAL_FRONTEND_ROOT")
    if override:
        return Path(override).expanduser().resolve()
    return (project_dir.parent / "marimo" / "frontend").resolve()


def _log(message: str) -> None:
    quiet = os.environ.get("QUARTO_PROJECT_SCRIPT_QUIET") == "1"
    if not quiet:
        sys.stdout.write(f"{message}\n")


def main() -> int:
    endpoint = os.environ.get("QUARTO_MARIMO_DEBUG_ENDPOINT", "")
    output_dir = os.environ.get("QUARTO_PROJECT_OUTPUT_DIR", "_site")
    project_dir = Path.cwd()

    target_path = _debug_endpoint_path(endpoint)
    if target_path is None:
        return 0

    frontend_root = _local_frontend_root(project_dir)
    source_dist = frontend_root / "dist"
    if not source_dist.exists():
        sys.stderr.write(
            f"warning: local marimo frontend dist not found at {source_dist}\n"
        )
        return 0

    dest_root = project_dir / output_dir / target_path
    dest_dist = dest_root / "dist"
    shutil.rmtree(dest_dist, ignore_errors=True)
    dest_root.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_dist, dest_dist)
    _log(f"[quarto-marimo] synced local frontend to {dest_dist}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
