from __future__ import annotations

from command import extract_command


class TestExtractCommand:
    def test_pep723_header(self):
        header = '# /// script\n# dependencies = ["marimo"]\n# ///'
        result = extract_command(header)
        assert isinstance(result, list)
        assert result[0] == "run"

    def test_plain_header_wrapped(self):
        header = '[project]\ndependencies = ["marimo"]'
        result = extract_command(header)
        assert isinstance(result, list)
        assert result[0] == "run"

    def test_empty_string(self):
        result = extract_command("")
        assert isinstance(result, list)
        assert result[0] == "run"
