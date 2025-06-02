#!/usr/bin/env python3

import json
import sys
import tempfile
from textwrap import dedent

try:
    from marimo._cli.sandbox import construct_uv_flags
    from marimo._utils.inline_script_metadata import PyProjectReader
except ImportError as e:
    try:
        from marimo._cli.sandbox import (  # type: ignore[attr-defined, no-redef]
            PyProjectReader,
            construct_uv_flags,
        )
    except ImportError:
        from marimo import __version__

        raise ImportError(
            "Potential version incompatibility quartom-marimo requires marimo "
            f">=0.13.3. marimo version {__version__} is detected. "
        ) from e


def extract_command(header: str) -> list[str]:
    if not header.startswith("#"):
        header = "\n# ".join(["# /// script", *header.splitlines(), "///"])
    pyproject = PyProjectReader.from_script(header)
    with tempfile.NamedTemporaryFile(
        mode="w", delete=False, suffix=".txt"
    ) as temp_file:
        flags = construct_uv_flags(pyproject, temp_file, [], [])

    return ["run"] + flags


if __name__ == "__main__":
    assert len(sys.argv) == 1, f"Unexpected call format got {sys.argv}"

    header = dedent(sys.stdin.read())

    command = extract_command(header)
    sys.stdout.write(json.dumps(command))
