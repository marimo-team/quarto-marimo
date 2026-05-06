from __future__ import annotations

import re
from unittest.mock import MagicMock
from urllib.parse import unquote
from xml.etree.ElementTree import Element

from _extensions.marimo.extract import (
    app_config_from_root,
    convert_from_md_to_pandoc_export,
    default_config,
    extract_and_strip_quarto_config,
    get_mime_render,
    pyproject_to_script_metadata,
    sql_code_to_python,
)


class TestExtractAndStripQuartoConfig:
    def test_basic_config(self):
        block = "#| echo: false\n#| eval: true\nprint('hello')"
        config, code = extract_and_strip_quarto_config(block)
        assert config["echo"] is False
        assert config["eval"] is True
        assert code == "print('hello')"

    def test_no_config(self):
        block = "print('hello')\nprint('world')"
        config, code = extract_and_strip_quarto_config(block)
        assert config == {}
        assert code == block

    def test_empty_string(self):
        config, _code = extract_and_strip_quarto_config("")
        assert config == {}

    def test_config_with_blank_lines(self):
        block = "#| echo: false\n\nprint('hello')"
        config, code = extract_and_strip_quarto_config(block)
        assert config["echo"] is False
        # Blank line is skipped, then non-config line stops parsing
        assert "print('hello')" in code

    def test_string_value(self):
        block = '#| fig-cap: "My Figure"\nx = 1'
        config, code = extract_and_strip_quarto_config(block)
        assert config["fig-cap"] == "My Figure"
        assert code == "x = 1"


class TestAppConfigFromRoot:
    def test_title_maps_to_app_title(self):
        root = Element("root", attrib={"title": "My Notebook"})
        config = app_config_from_root(root)
        assert config["app_title"] == "My Notebook"

    def test_marimo_layout_maps_to_layout_file(self):
        root = Element("root", attrib={"marimo-layout": "grid.json"})
        config = app_config_from_root(root)
        assert config["layout_file"] == "grid.json"

    def test_marimo_version_stripped(self):
        root = Element("root", attrib={"marimo-version": "0.23.1"})
        config = app_config_from_root(root)
        assert "marimo-version" not in config

    def test_other_attrs_passed_through(self):
        root = Element("root", attrib={"custom-key": "value"})
        config = app_config_from_root(root)
        assert config["custom-key"] == "value"

    def test_empty_root(self):
        root = Element("root")
        config = app_config_from_root(root)
        assert config == {}


class TestPyprojectToScriptMetadata:
    def test_empty_string(self):
        assert pyproject_to_script_metadata("") == ""

    def test_wraps_plain_pyproject(self):
        metadata = pyproject_to_script_metadata(
            'requires-python = ">=3.11"\ndependencies = ["marimo", "wigglystuff"]'
        )
        assert metadata.startswith("# /// script\n")
        assert '# requires-python = ">=3.11"' in metadata
        assert '# dependencies = ["marimo", "wigglystuff"]' in metadata
        assert metadata.endswith("# ///\n")

    def test_preserves_existing_script_metadata(self):
        metadata = pyproject_to_script_metadata(
            "# /// script\n# dependencies = []\n# ///"
        )
        assert metadata == "# /// script\n# dependencies = []\n# ///\n"


class TestSqlCodeToPython:
    def test_without_query_renders_sql_expression(self):
        result = sql_code_to_python("SELECT * FROM df;", None)

        assert result == 'mo.sql(fr"""\nSELECT * FROM df;\n""")'

    def test_with_query_assigns_result(self):
        result = sql_code_to_python("SELECT * FROM df;", "filtered")

        assert result == 'filtered = mo.sql(fr"""\nSELECT * FROM df;\n""")'

    def test_invalid_query_falls_back_to_expression(self):
        result = sql_code_to_python("SELECT * FROM df;", "not-valid")

        assert result == 'mo.sql(fr"""\nSELECT * FROM df;\n""")'

    def test_keyword_query_falls_back_to_expression(self):
        result = sql_code_to_python("SELECT * FROM df;", "class")

        assert result == 'mo.sql(fr"""\nSELECT * FROM df;\n""")'


class TestConvertFromMdToPandocExport:
    def _extract_notebook_code(self, header: str) -> str:
        notebook_match = re.search(r"<marimo-code hidden>(.*?)</marimo-code>", header)
        assert notebook_match is not None
        return unquote(notebook_match.group(1))

    def _convert_without_eval(self, markdown: str) -> dict:
        original_eval = default_config["eval"]
        default_config["eval"] = False
        try:
            return convert_from_md_to_pandoc_export(markdown, mime_sensitive=False)
        finally:
            default_config["eval"] = original_eval

    def test_injects_pyproject_into_exported_notebook(self):
        markdown = """---
title: External dependencies
pyproject: |
  requires-python = ">=3.11"
  dependencies = [
    "marimo>=0.23.1",
    "wigglystuff",
  ]
---

```{python .marimo}
import marimo as mo
widget = mo.ui.slider(1, 10)
widget
```
"""
        result = convert_from_md_to_pandoc_export(markdown, mime_sensitive=False)
        header = result["header"]
        html = result["outputs"][0]["value"]
        assert "__MARIMO_EXPORT_CONTEXT__" in header
        assert "<marimo-code hidden>" in header
        assert "<marimo-cell-code hidden>" in html
        notebook_code = self._extract_notebook_code(header)
        assert notebook_code.startswith("# /// script\n")
        assert '# requires-python = ">=3.11"' in notebook_code
        assert "app = marimo.App(" in notebook_code
        match = re.search(r"<marimo-cell-code hidden>(.*?)</marimo-cell-code>", html)
        assert match is not None
        hidden_code = unquote(match.group(1))
        assert (
            hidden_code == "import marimo as mo\nwidget = mo.ui.slider(1, 10)\nwidget"
        )

    def test_converts_sql_marimo_cell_with_query(self):
        markdown = """---
eval: false
---

```sql {.marimo query="result"}
SELECT * FROM df;
```
"""
        result = self._convert_without_eval(markdown)

        notebook_code = self._extract_notebook_code(result["header"])
        assert 'result = mo.sql(fr"""' in notebook_code
        assert "SELECT * FROM df;" in notebook_code
        assert result["count"] == 1

    def test_converts_dot_joined_sql_marimo_cell(self):
        markdown = """---
eval: false
---

```{sql.marimo query="result"}
SELECT * FROM df;
```
"""
        result = self._convert_without_eval(markdown)

        notebook_code = self._extract_notebook_code(result["header"])
        assert 'result = mo.sql(fr"""' in notebook_code
        assert "SELECT * FROM df;" in notebook_code
        assert result["count"] == 1


class TestGetMimeRender:
    def _make_stub(self, code="x = 1", output=None):
        stub = MagicMock()
        stub.code = code
        stub.output = output
        return stub

    def test_eval_false_echo_false_returns_empty(self):
        """When eval=false and echo=false (defaults), return empty HTML."""
        stub = self._make_stub()
        global_options = {**default_config, "eval": False}
        result = get_mime_render(global_options, stub, {}, mime_sensitive=False)
        assert result["value"] == ""
        assert result["type"] == "html"

    def test_eval_false_echo_true_shows_code(self):
        """When eval=false but echo=true, should call stub.render with display_code=True."""
        stub = self._make_stub()
        stub.render.return_value = "<div>code</div>"
        global_options = {**default_config, "eval": False, "echo": True}
        result = get_mime_render(global_options, stub, {}, mime_sensitive=False)
        stub.render.assert_called_once()
        assert result["display_code"] is True

    def test_include_false_returns_empty(self):
        """When include=false, return empty HTML."""
        stub = self._make_stub()
        global_options = {**default_config}
        result = get_mime_render(
            global_options, stub, {"include": False}, mime_sensitive=False
        )
        assert result["value"] == ""

    def test_none_stub_returns_empty(self):
        """When stub is None, return empty HTML."""
        global_options = {**default_config}
        result = get_mime_render(global_options, None, {}, mime_sensitive=False)
        assert result["value"] == ""

    def test_eval_true_calls_render(self):
        """Normal case: eval=true should call stub.render."""
        stub = self._make_stub()
        stub.render.return_value = "<div>output</div>"
        global_options = {**default_config}
        result = get_mime_render(global_options, stub, {}, mime_sensitive=False)
        stub.render.assert_called_once()
        assert result["value"] == "<div>output</div>"
