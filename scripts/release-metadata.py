"""Prepare a stable release version or read the coordinated current version."""

import json
import re
import sys
from pathlib import Path

primary = Path("_extensions/marimo/_extension.yml")
secondary = Path("_extensions/marimo/python/extract.py")
text = primary.read_text(encoding="utf-8")
versions = re.findall("^version: (\\S+)$", text, re.MULTILINE)
if len(versions) != 1:
    raise ValueError("Expected one extension version")
current = versions[0]
if (
    f'__version__ = "{current}"'
    not in secondary.read_text(encoding="utf-8").splitlines()
):
    raise ValueError("Extension versions must match")
version = current
if len(sys.argv) == 2:
    request = sys.argv[1]
    if request in ("patch", "minor", "major"):
        parts = [int(part) for part in current.split(".")]
        index = {"major": 0, "minor": 1, "patch": 2}[request]
        parts[index] += 1
        parts[index + 1 :] = [0] * (2 - index)
        version = ".".join(map(str, parts))
    else:
        version = request
    if not re.fullmatch("(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)", version):
        raise ValueError("Expected a stable X.Y.Z version")
    if tuple(map(int, version.split("."))) <= tuple(map(int, current.split("."))):
        raise ValueError("The release version must increase")
    primary.write_text(
        text.replace(f"version: {current}", f"version: {version}"), encoding="utf-8"
    )
    secondary.write_text(
        secondary.read_text(encoding="utf-8").replace(
            f'__version__ = "{current}"', f'__version__ = "{version}"'
        ),
        encoding="utf-8",
    )
sys.stdout.write(json.dumps({"version": version}) + "\n")
