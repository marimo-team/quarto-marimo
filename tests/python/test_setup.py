from __future__ import annotations

import os
import subprocess
import tarfile
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize(
    ("archive_root", "marker"),
    [("", "flat"), ("quarto-1.9.37", "nested")],
)
def test_setup_normalizes_quarto_archive_layout(
    tmp_path: Path,
    archive_root: str,
    marker: str,
) -> None:
    source = tmp_path / "source" / archive_root / "bin"
    source.mkdir(parents=True)
    quarto = source / "quarto"
    quarto.write_text(f"#!/bin/sh\necho {marker}\n", encoding="utf-8")
    quarto.chmod(0o755)

    archive = tmp_path / "quarto-fixture.tar.gz"
    with tarfile.open(archive, "w:gz") as bundle:
        bundle.add(tmp_path / "source", arcname=".")

    install = tmp_path / "install"
    subprocess.run(
        [
            "make",
            f"QUARTO_DIR={install}",
            "QUARTO_PKG=quarto-fixture.tar.gz",
            f"QUARTO_DOWNLOAD_URL={archive.as_uri()}",
            "setup",
        ],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

    installed = install / "bin" / "quarto"
    assert installed.read_text(encoding="utf-8") == quarto.read_text(encoding="utf-8")
    assert os.access(installed, os.X_OK)
