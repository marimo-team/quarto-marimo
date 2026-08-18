from __future__ import annotations

from quarto_marimo.authoring import (
    cell_options_patch,
    execution_options_patch,
    extract_cell_config,
    normalize_markdown,
)


def test_cell_config_is_removed_from_authored_source():
    config, source = extract_cell_config("#| echo: true\n#| eval: false\n\nvalue = 1")

    assert config == {"echo": True, "eval": False}
    assert source == "value = 1"


def test_boolean_cell_options_ignore_comments_and_false_strings():
    config, _ = extract_cell_config(
        "#| eval: false # skip execution\n#| echo: off\n#| output: no\nvalue = 1"
    )

    options = cell_options_patch(config, {"language": "python"})

    assert options["execution"] == {"enabled": False}
    assert options["render"] == {"source": False, "output": False}


def test_cell_options_normalize_quarto_render_and_execution_controls():
    options = cell_options_patch(
        {"echo": False, "editor": True, "eval": False},
        {"language": "python"},
    )

    assert options == {
        "language": "python",
        "render": {"source": True, "editor": True},
        "execution": {"enabled": False},
    }


def test_unparsable_cells_render_source_and_disable_execution():
    options = cell_options_patch(
        {"unparsable": True},
        {"language": "python"},
    )

    assert options["marimo"] == {"unparsable": True}
    assert options["execution"] == {"enabled": False}
    assert options["render"]["source"] is True


def test_hide_code_hides_unparsable_source():
    options = cell_options_patch(
        {"unparsable": True, "echo": True, "editor": True},
        {"language": "python", "hide_code": "true"},
    )

    assert options["render"] == {"source": False, "editor": False}


def test_hide_output_suppresses_compiled_output():
    options = cell_options_patch(
        {},
        {"language": "python", "hide_output": "true"},
    )

    assert options["render"]["output"] is False


def test_disabled_cells_report_execution_as_disabled():
    options = cell_options_patch(
        {"disabled": True},
        {"language": "python"},
    )

    assert options["execution"] == {"enabled": False}


def test_column_zero_is_a_supported_cell_option():
    options = cell_options_patch({}, {"language": "python", "column": "0"})

    assert options["column"] == 0


def test_page_execution_options_are_protocol_patches():
    options = execution_options_patch(
        {"echo": True, "server-output": False, "eval": False}
    )

    assert options == {
        "render": {"source": True, "serverOutput": False},
        "execution": {"enabled": False},
    }


def test_sql_class_fence_is_normalized_for_marimo_parser():
    markdown = '```{sql .marimo query="summary"}\nSELECT 1\n```'

    assert normalize_markdown(markdown).startswith('```sql {.marimo query="summary"}')
