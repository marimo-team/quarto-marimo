from __future__ import annotations

import pytest
from quarto_marimo.protocol import (
    CompiledMarimoCell,
    CompiledMarimoOutput,
    MarimoCellRequest,
)
from quarto_marimo.static import render_static_cell


@pytest.mark.parametrize(
    ("mimetype", "data", "html", "expected_type", "expected_value"),
    [
        ("text/plain", "hello", "<p>hello</p>", "plain", "hello"),
        (
            "image/png",
            "data:image/png;base64,abc",
            "",
            "figure",
            "data:image/png;base64,abc",
        ),
        ("image/jpeg", "/9j/", "", "figure", "data:image/jpeg;base64,/9j/"),
        (
            "text/html",
            "<strong>hello</strong>",
            "<strong>stale</strong>",
            "html",
            "<strong>hello</strong>",
        ),
        (
            "image/svg+xml",
            '<svg xmlns="http://www.w3.org/2000/svg"><text>hello</text></svg>',
            "",
            "html",
            '<svg xmlns="http://www.w3.org/2000/svg"><text>hello</text></svg>',
        ),
    ],
)
def test_static_cell_projects_compiled_output_mimetype(
    mimetype: str,
    data: str,
    html: str,
    expected_type: str,
    expected_value: str,
) -> None:
    request = MarimoCellRequest(index=0, source="value", options={})
    cell = CompiledMarimoCell(
        index=0,
        html=html,
        options={
            "language": "python",
            "render": {"include": True, "source": False, "output": True},
            "execution": {"enabled": True},
        },
        output=CompiledMarimoOutput(
            mimetype=mimetype,
            data=data,
            html=html,
        ),
    )

    result = render_static_cell(request, cell)

    assert result["type"] == expected_type
    assert result["value"] == expected_value


def test_static_cell_projects_rich_mimebundle_html():
    request = MarimoCellRequest(index=0, source="value", options={})
    cell = CompiledMarimoCell(
        index=0,
        html="",
        options={
            "language": "python",
            "render": {"include": True, "source": False, "output": True},
            "execution": {"enabled": True},
        },
        output=CompiledMarimoOutput(
            mimetype="application/vnd.marimo+mimebundle",
            data={"text/html": "<strong>rich</strong>", "text/plain": "plain"},
            html="",
        ),
    )

    result = render_static_cell(request, cell)

    assert result["type"] == "html"
    assert result["value"] == "<strong>rich</strong>"


@pytest.mark.parametrize(
    ("mimetype", "data", "expected"),
    [
        (
            "application/vnd.marimo+error",
            [
                {
                    "type": "exception",
                    "exception_type": "ZeroDivisionError",
                    "msg": "division by zero",
                }
            ],
            "ZeroDivisionError: division by zero",
        ),
        (
            "application/vnd.marimo+traceback",
            [{"type": "cycle", "edges_with_vars": []}],
            "This cell is in a cycle",
        ),
        (
            "application/vnd.marimo+error",
            [{"type": "multiple-defs", "name": "value", "cells": ["1", "2"]}],
            "The variable 'value' was defined by another cell",
        ),
    ],
)
def test_static_cell_formats_structured_execution_errors(
    mimetype: str,
    data: list[dict[str, object]],
    expected: str,
):
    request = MarimoCellRequest(index=0, source="1 / 0", options={})
    cell = CompiledMarimoCell(
        index=0,
        html="",
        options={
            "language": "python",
            "render": {"include": True, "source": False, "output": True},
            "execution": {"enabled": True},
        },
        output=CompiledMarimoOutput(
            mimetype=mimetype,
            data=data,
            html="",
        ),
    )

    result = render_static_cell(request, cell)

    assert result["type"] == "blockquote"
    assert result["value"] == expected
