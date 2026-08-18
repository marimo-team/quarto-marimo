from __future__ import annotations

import asyncio

import pytest
from quarto_marimo.compiler import compile_page
from quarto_marimo.protocol import (
    CompiledMarimoPage,
    MarimoCellRequest,
    MarimoPageMetadata,
    MarimoPageRequest,
)


def request(*sources: str, pyproject: str = "") -> MarimoPageRequest:
    return MarimoPageRequest(
        identity="quarto-marimo:test-page",
        filename="page.qmd",
        metadata=MarimoPageMetadata(pyproject=pyproject),
        cells=tuple(
            MarimoCellRequest(
                index=index,
                source=source,
                options={"language": "python"},
            )
            for index, source in enumerate(sources)
        ),
    )


def test_compile_page_emits_one_runtime_for_all_cells():
    page = compile_request(
        request(
            "import marimo as mo\nslider = mo.ui.slider(1, 5, value=2)\nslider",
            "slider.value * 2",
        )
    )

    assert page.app is not None
    assert page.app.id.startswith("marimo-")
    assert page.app.runtime_cell_count == 2
    assert len(page.cells) == 2
    assert all("<marimo-island" in cell.html for cell in page.cells)
    assert page.cells[1].output is not None
    assert page.cells[1].output.mimetype == "text/html"
    assert "4" in str(page.cells[1].output.data)
    assert "4" in page.cells[1].output.html


def test_compile_page_preserves_unicode_html_output():
    page = compile_request(
        request(
            """
class Greeting:
    def _repr_html_(self):
        return "<strong>Grüße 👋</strong>"

Greeting()
"""
        )
    )

    output = page.cells[0].output
    assert output is not None
    assert output.mimetype == "text/html"
    assert output.html == "<strong>Grüße 👋</strong>"


def test_compile_page_embeds_dependency_metadata_in_notebook_source():
    page = compile_request(
        request(
            "value = 1\nvalue",
            pyproject='requires-python = ">=3.11"\ndependencies = ["polars"]',
        )
    )

    assert page.app is not None
    assert page.app.notebook_code.startswith("# /// script\n")
    assert '# dependencies = ["polars"]' in page.app.notebook_code


def test_compile_page_id_is_stable_for_same_page_identity():
    first = compile_request(request("value = 1\nvalue"))
    second = compile_request(request("value = 2\nvalue"))

    assert first.app is not None
    assert second.app is not None
    assert first.app.id == second.app.id


def test_page_defaults_and_setup_cells_share_the_runtime():
    page_request = request("seed + 1")
    page_request = MarimoPageRequest(
        identity=page_request.identity,
        filename=page_request.filename,
        metadata=MarimoPageMetadata(
            setup_cells=(
                MarimoCellRequest(
                    index=0,
                    source="seed = 4",
                    options={"language": "python"},
                ),
            )
        ),
        defaults={"render": {"source": True}},
        cells=(
            MarimoCellRequest(
                index=0,
                source="seed + 1",
                options={"language": "python"},
            ),
        ),
    )

    page = compile_request(page_request)

    assert page.app is not None
    assert page.app.runtime_cell_count == 2
    assert "<pre><code" in page.cells[0].html
    assert "5" in page.cells[0].html


def test_error_false_rejects_failed_cell():
    page_request = request("raise ValueError('broken')")
    cell = page_request.cells[0]
    page_request = MarimoPageRequest(
        identity=page_request.identity,
        filename=page_request.filename,
        metadata=page_request.metadata,
        cells=(
            MarimoCellRequest(
                index=cell.index,
                source=cell.source,
                options={
                    "language": "python",
                    "render": {"error": False},
                },
                start_line=12,
            ),
        ),
    )

    with pytest.raises(RuntimeError, match=r"page\.qmd:12"):
        compile_request(page_request)


def test_compiler_reports_effective_execution_and_unparsable_source():
    page_request = request("disabled source", "unparsable source")
    first, second = page_request.cells
    page_request = MarimoPageRequest(
        identity=page_request.identity,
        filename=page_request.filename,
        metadata=page_request.metadata,
        cells=(
            MarimoCellRequest(
                index=first.index,
                source=first.source,
                options={
                    "language": "python",
                    "marimo": {"disabled": True},
                },
            ),
            MarimoCellRequest(
                index=second.index,
                source=second.source,
                options={
                    "language": "python",
                    "marimo": {"unparsable": True},
                },
            ),
        ),
    )

    page = compile_request(page_request)

    assert page.cells[0].options["execution"]["enabled"] is False
    assert page.cells[1].options["execution"]["enabled"] is False
    assert page.cells[1].options["render"]["source"] is True
    assert "unparsable source" in page.cells[1].html


def test_compiler_uses_an_executable_setup_import():
    base_request = request("Hello")
    page_request = MarimoPageRequest(
        identity=base_request.identity,
        filename=base_request.filename,
        metadata=MarimoPageMetadata(
            setup_cells=(
                MarimoCellRequest(
                    index=-1,
                    source="import marimo as mo",
                    options={
                        "language": "python",
                        "marimo": {"disabled": True},
                    },
                ),
            )
        ),
        cells=(
            MarimoCellRequest(
                index=0,
                source="Hello",
                options={"language": "markdown"},
            ),
        ),
    )

    page = compile_request(page_request)

    assert page.cells[0].output is not None
    assert "Hello" in page.cells[0].output.html


def test_markdown_compiles_when_a_marimo_symbol_uses_the_mo_name():
    page_request = MarimoPageRequest(
        identity="quarto-marimo:test-page",
        filename="page.qmd",
        metadata=MarimoPageMetadata(),
        cells=(
            MarimoCellRequest(
                index=0,
                source="from marimo import md as mo",
                options={"language": "python"},
            ),
            MarimoCellRequest(
                index=1,
                source="Hello",
                options={"language": "markdown"},
            ),
        ),
    )

    page = compile_request(page_request)

    assert page.cells[1].output is not None
    assert "Hello" in page.cells[1].output.html


def compile_request(request: MarimoPageRequest) -> CompiledMarimoPage:
    return CompiledMarimoPage.from_json(asyncio.run(compile_page(request.to_json())))
