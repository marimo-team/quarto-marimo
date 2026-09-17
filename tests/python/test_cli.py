from __future__ import annotations

import io
import json
import sys

import pytest
from quarto_marimo.cli import convert_markdown, main

MARKDOWN = """
---
title: Retained page
---

```{python .marimo}
import marimo as mo
value = mo.ui.slider(1, 5, value=3)
value
```

```{markdown .marimo}
## Reactive heading
```
"""


def test_interactive_conversion_returns_shared_page_protocol():
    result = convert_markdown(
        MARKDOWN,
        filename="page.qmd",
        interactive=True,
    )

    assert result["kind"] == "page"
    assert result["page"]["protocolVersion"] == 2
    assert len(result["page"]["cells"]) == 2
    assert "Reactive heading" in result["page"]["cells"][1]["html"]


def test_static_conversion_returns_pandoc_projection_payloads():
    result = convert_markdown(
        "```{python .marimo}\nvalue = 2\nvalue + 3\n```",
        filename="page.qmd",
        interactive=False,
    )

    assert result["kind"] == "static"
    assert result["outputs"][0]["type"] == "html"
    assert "5" in result["outputs"][0]["value"]


@pytest.mark.parametrize(
    "opener",
    ["```python {.marimo}", "```{marimo}", "```{.marimo}"],
)
def test_python_fence_forms_compile(opener: str):
    result = convert_markdown(
        f"{opener}\nvalue = 2\nvalue + 3\n```",
        filename="page.qmd",
        interactive=False,
    )

    assert result["kind"] == "static"
    assert "5" in result["outputs"][0]["value"]


def test_eval_false_preserves_source_without_executing_output():
    result = convert_markdown(
        "```{python .marimo}\n#| eval: false\n#| echo: true\n1 / 0\n```",
        filename="page.qmd",
        interactive=False,
    )

    assert result["outputs"][0]["displayCode"] is True
    assert result["outputs"][0]["value"] == ""


def test_fence_attributes_control_static_code_and_output():
    result = convert_markdown(
        """
```{python .marimo hide_code="true"}
1
```

```{python .marimo hide_output="true"}
2
```
""",
        filename="page.qmd",
        interactive=False,
    )

    assert result["outputs"][0]["displayCode"] is False
    assert result["outputs"][1]["value"] == ""


JAPANESE_MARKDOWN = """
---
title: 日本語
---

# 日本語

```{python .marimo}
import marimo as mo

mo.md("こんにちわ")
```
"""


def test_main_reads_utf8_stdin_under_a_non_utf8_locale(monkeypatch):
    # Emulate a Japanese Windows host: Python wraps stdin and stdout with cp932
    # and surrogateescape while the engine sends UTF-8 bytes (GitHub #103).
    stdin = io.TextIOWrapper(
        io.BytesIO(JAPANESE_MARKDOWN.encode("utf-8")),
        encoding="cp932",
        errors="surrogateescape",
    )
    stdout = io.TextIOWrapper(io.BytesIO(), encoding="cp932", errors="surrogateescape")
    monkeypatch.setattr(sys, "stdin", stdin)
    monkeypatch.setattr(sys, "stdout", stdout)

    assert main(["page.qmd", "static", "yes"]) == 0

    result = json.loads(stdout.buffer.getvalue().decode("utf-8"))
    assert result["kind"] == "static"
    assert "こんにちわ" in result["outputs"][0]["value"]
