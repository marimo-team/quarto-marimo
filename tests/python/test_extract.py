from __future__ import annotations

from unittest.mock import MagicMock
from xml.etree.ElementTree import Element

from extract import app_config_from_root, default_config, extract_and_strip_quarto_config, get_mime_render


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
        config, code = extract_and_strip_quarto_config("")
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
        root = Element("root", attrib={"marimo-version": "0.14.0"})
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
        result = get_mime_render(global_options, stub, {"include": False}, mime_sensitive=False)
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
