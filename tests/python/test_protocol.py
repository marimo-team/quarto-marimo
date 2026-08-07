from __future__ import annotations

import pytest
from quarto_marimo.protocol import (
    CompiledMarimoCell,
    CompiledMarimoOutput,
    CompiledMarimoPage,
    MarimoCellRequest,
    MarimoPageMetadata,
    MarimoPageRequest,
    MarimoPageRuntime,
)


def test_page_request_round_trips_through_protocol_v2() -> None:
    request = MarimoPageRequest(
        identity="quarto-marimo:test",
        filename="page.qmd",
        metadata=MarimoPageMetadata(),
        cells=(
            MarimoCellRequest(
                index=0,
                source="value = 1",
                options={"language": "python"},
                start_line=8,
            ),
        ),
    )
    payload = request.to_json()

    assert payload["protocolVersion"] == 2
    assert payload["cells"][0]["startLine"] == 8
    assert MarimoPageRequest.from_json(payload) == request


def test_page_request_defaults_omitted_cell_options() -> None:
    payload = {
        "protocolVersion": 2,
        "identity": "quarto-marimo:test",
        "metadata": {},
        "cells": [{"index": 0, "source": "value = 1"}],
    }

    request = MarimoPageRequest.from_json(payload)

    assert request.cells[0].options == {}


def test_compiled_output_round_trips_with_its_mime_type() -> None:
    page = CompiledMarimoPage(
        app=None,
        cells=(
            CompiledMarimoCell(
                index=0,
                html="<strong>hello</strong>",
                options={"language": "python"},
                output=CompiledMarimoOutput(
                    mimetype="text/html",
                    data="<strong>hello</strong>",
                    html="<strong>hello</strong>",
                ),
            ),
        ),
    )
    payload = page.to_json()
    del payload["diagnostics"]

    assert payload["cells"][0]["output"]["mimetype"] == "text/html"
    assert CompiledMarimoPage.from_json(payload) == page


def test_protocol_rejects_other_versions() -> None:
    payload = {
        "protocolVersion": 1,
        "identity": "quarto-marimo:test",
        "metadata": {},
        "cells": [],
    }

    with pytest.raises(ValueError, match="unsupported marimo page protocol"):
        MarimoPageRequest.from_json(payload)


def test_compiled_cell_requires_output() -> None:
    page = CompiledMarimoPage(
        app=None,
        cells=(
            CompiledMarimoCell(
                index=0,
                html="",
                options={},
                output=None,
            ),
        ),
    ).to_json()
    del page["cells"][0]["output"]

    with pytest.raises(TypeError, match="compiled marimo cell output is required"):
        CompiledMarimoPage.from_json(page)


@pytest.mark.parametrize(
    "payload",
    [
        {
            "protocolVersion": 2,
            "identity": "quarto-marimo:test",
            "metadata": {"setupCells": 0},
            "cells": [],
        },
        {
            "protocolVersion": 2,
            "identity": "quarto-marimo:test",
            "metadata": {},
            "defaults": [],
            "cells": [],
        },
        {
            "protocolVersion": 2,
            "identity": "quarto-marimo:test",
            "metadata": {},
            "filename": 0,
            "cells": [],
        },
        {
            "protocolVersion": 2,
            "identity": "quarto-marimo:test",
            "metadata": {},
            "cells": [{"index": 0, "source": "value = 1", "startLine": "8"}],
        },
    ],
)
def test_page_request_rejects_malformed_optional_fields(payload: object) -> None:
    with pytest.raises(TypeError):
        MarimoPageRequest.from_json(payload)


def test_runtime_cell_count_must_be_non_negative() -> None:
    runtime = MarimoPageRuntime(
        id="marimo-page",
        runtime_cell_count=-1,
        assets={},
    ).to_json()

    with pytest.raises(TypeError, match="non-negative integer"):
        MarimoPageRuntime.from_json(runtime)
