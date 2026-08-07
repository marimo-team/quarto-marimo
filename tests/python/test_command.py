from __future__ import annotations

from pathlib import Path

from _extensions.marimo.python.command import extract_command


def test_extract_command_projects_document_dependencies_to_uv() -> None:
    command = extract_command('dependencies = ["polars==1.0"]')
    requirements_path = Path(command[command.index("--with-requirements") + 1])
    try:
        requirements = requirements_path.read_text().splitlines()
    finally:
        requirements_path.unlink()

    assert command[0] == "run"
    assert "polars==1.0" in requirements
    assert any(requirement.startswith("marimo") for requirement in requirements)


def test_extract_command_wraps_comment_leading_toml() -> None:
    command = extract_command('# dependency rationale\ndependencies = ["polars==1.0"]')
    requirements_path = Path(command[command.index("--with-requirements") + 1])
    try:
        requirements = requirements_path.read_text().splitlines()
    finally:
        requirements_path.unlink()

    assert "polars==1.0" in requirements
