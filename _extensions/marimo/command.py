#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from textwrap import dedent

try:
    from marimo._internal.sandbox import PyProjectReader, construct_uv_flags
except ImportError:
    from marimo._cli.sandbox import construct_uv_flags  # type: ignore[no-redef]
    from marimo._utils.inline_script_metadata import (
        PyProjectReader,  # type: ignore[no-redef]
    )


def extract_command(header: str) -> list[str]:
    if not header.startswith("#"):
        header = "\n# ".join(["# /// script", *header.splitlines(), "///"])
    pyproject = PyProjectReader.from_script(header)
    with tempfile.NamedTemporaryFile(
        mode="w", delete=False, suffix=".txt"
    ) as temp_file:
        flags = construct_uv_flags(pyproject, temp_file, [], [])
        temp_file.flush()
    return ["run"] + flags  # type: ignore[no-any-return]


if __name__ == "__main__":
    assert len(sys.argv) == 1, f"Unexpected call format got {sys.argv}"

    header = dedent(sys.stdin.read())

    command = extract_command(header)
    sys.stdout.write(json.dumps(command))
