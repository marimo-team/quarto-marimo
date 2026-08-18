from __future__ import annotations

import pytest
from quarto_marimo.cli import convert_markdown

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
