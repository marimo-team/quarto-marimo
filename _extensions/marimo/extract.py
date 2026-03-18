#!/usr/bin/env python3

import asyncio
import json
import os
import re
import sys
from collections.abc import Callable
from typing import Any, Optional

# Native to python
from xml.etree.ElementTree import Element

import marimo
from marimo import App, MarimoIslandGenerator

try:
    from marimo._convert.markdown.to_ir import (
        MARIMO_MD,
        MarimoMdParser as MarimoParser,
        SafeWrap as SafeWrapGeneric,
    )
except ImportError:
    from marimo._convert.markdown.markdown import (  # type: ignore[no-redef]
        MARIMO_MD,
        MarimoMdParser as MarimoParser,
        SafeWrap as SafeWrapGeneric,
    )

from marimo._islands import MarimoIslandStub

SafeWrap = SafeWrapGeneric[App]

__version__ = "0.4.4"

# See https://quarto.org/docs/computations/execution-options.html
default_config = {
    "eval": True,
    "echo": False,
    "output": True,
    "warning": True,
    "error": True,
    "include": True,
    # Particular to marimo
    "editor": False,
}


def extract_and_strip_quarto_config(block: str) -> tuple[dict[str, Any], str]:
    pattern = r"^\s*\#\|\s*(.*?)\s*:\s*(.*?)(?=\n|\Z)"
    config: dict[str, Any] = {}
    lines = block.split("\n")
    if not lines:
        return config, block

    split_index = 0
    for i, line in enumerate(lines):
        split_index = i
        line = line.strip()
        if not line:
            continue
        source_match = re.search(pattern, line)
        if not source_match:
            break
        key, value = source_match.groups()
        config[key] = json.loads(value)
    return config, "\n".join(lines[split_index:])


def get_mime_render(
    global_options: dict[str, Any],
    stub: Optional[MarimoIslandStub],
    config: dict[str, bool],
    mime_sensitive: bool,
) -> dict[str, Any]:
    # Local supersede global supersedes default options
    config = {**global_options, **config}
    if not config["include"] or stub is None:
        return {"type": "html", "value": ""}

    eval_enabled = config["eval"]
    show_output = config["output"] and eval_enabled
    output = stub.output
    render_options = {
        "display_code": config["echo"],
        "reactive": eval_enabled and not mime_sensitive,
        "code": stub.code,
    }

    if output:
        mimetype = output.mimetype
        if show_output and mime_sensitive:
            if mimetype.startswith("image"):
                return {"type": "figure", "value": f"{output.data}", **render_options}
            # Handle mimebundle - extract image data if present
            if mimetype == "application/vnd.marimo+mimebundle":
                try:
                    bundle = (
                        json.loads(output.data)
                        if isinstance(output.data, str)
                        else output.data
                    )
                    # Look for image data in the bundle
                    for key in ["image/png", "image/jpeg", "image/svg+xml"]:
                        if key in bundle:
                            return {
                                "type": "figure",
                                "value": bundle[key],
                                **render_options,
                            }
                    # Fall back to text if no image
                    if "text/plain" in bundle:
                        return {
                            "type": "para",
                            "value": bundle["text/plain"],
                            **render_options,
                        }
                except (json.JSONDecodeError, TypeError):
                    pass  # Fall through to default handling
            if mimetype.startswith("text/plain") or mimetype.startswith(
                "text/markdown"
            ):
                return {"type": "para", "value": f"{output.data}", **render_options}
            if mimetype == "application/vnd.marimo+error":
                if config["error"]:
                    return {
                        "type": "blockquote",
                        "value": f"{output.data}",
                        **render_options,
                    }
                # Suppress errors otherwise
                return {"type": "para", "value": "", **render_options}

        elif mimetype == "application/vnd.marimo+error":
            if config["warning"]:
                sys.stderr.write(
                    "Warning: Only the `disabled` codeblock attribute is utilized"
                    " for pandoc export. Be sure to set desired code attributes "
                    "in quarto form."
                )
            if not config["error"]:
                return {"type": "html", "value": ""}

    # Nothing to display (e.g. eval=false with echo=false)
    if not config["echo"] and not show_output:
        return {"type": "html", "value": "", **render_options}

    # HTML as catch all default
    return {
        "type": "html",
        "value": stub.render(
            display_code=config["echo"],
            display_output=show_output,
            is_reactive=bool(render_options["reactive"]),
            as_raw=mime_sensitive,
        ),
        **render_options,
    }


def app_config_from_root(root: Element) -> dict[str, Any]:
    # Extract meta data from root attributes.
    config_keys = {"title": "app_title", "marimo-layout": "layout_file"}
    config = {
        config_keys[key]: value for key, value in root.items() if key in config_keys
    }
    # Try to pass on other attributes as is
    config.update({k: v for k, v in root.items() if k not in config_keys})
    # Remove values particular to markdown saves.
    config.pop("marimo-version", None)
    return config


def build_export_with_mime_context(
    mime_sensitive: bool,
) -> Callable[[Element], SafeWrap]:  # type: ignore[valid-type]
    def tree_to_pandoc_export(root: Element) -> SafeWrap:  # type: ignore[valid-type]
        global_options = {**default_config, **app_config_from_root(root)}
        app = MarimoIslandGenerator()

        has_attrs: bool = False
        stubs: list[tuple[dict[str, bool], Optional[MarimoIslandStub]]] = []
        for child in root:
            # only process code cells
            if child.tag == MARIMO_MD:
                continue
            # We only care about the disabled attribute.
            if child.attrib.get("disabled") == "true":
                # Don't even add to generator
                stubs.append(({"include": False}, None))
                continue
            # Check to see id attrs are defined on the tag
            has_attrs = has_attrs | bool(child.attrib.items())

            code = str(child.text)
            config, code = extract_and_strip_quarto_config(code)

            try:
                stub = app.add_code(
                    code,
                    is_raw=True,
                )
            except Exception:
                stubs.append((config, None))
                continue

            assert isinstance(stub, MarimoIslandStub), "Unexpected error, please report"

            stubs.append(
                (
                    config,
                    stub,
                )
            )

        if has_attrs and global_options.get("warning", True):
            pass

        if global_options.get("eval", True):
            _ = asyncio.run(app.build())
        dev_server = os.environ.get("QUARTO_MARIMO_DEBUG_ENDPOINT", False)
        version_override = os.environ.get("QUARTO_MARIMO_VERSION", marimo.__version__)
        header = app.render_head(
            _development_url=dev_server, version_override=version_override
        )

        return SafeWrap(  # type: ignore[no-any-return]
            {
                "header": header,
                "outputs": [
                    get_mime_render(global_options, stub, config, mime_sensitive)
                    for config, stub in stubs
                ],
                "count": len(stubs),
            }  # type: ignore[arg-type]
        )

    return tree_to_pandoc_export


class MarimoPandocParser(MarimoParser):  # type: ignore[misc]
    """Parses Markdown to marimo notebook string."""

    # TODO: Could upstream generic for keys- but this is fine.
    output_formats = {  # type: ignore[assignment, misc]
        "marimo-pandoc-export": build_export_with_mime_context(mime_sensitive=False),  # type: ignore[dict-item]
        "marimo-pandoc-export-with-mime": build_export_with_mime_context(
            mime_sensitive=True
        ),  # type: ignore[dict-item]
    }


def convert_from_md_to_pandoc_export(text: str, mime_sensitive: bool) -> dict[str, Any]:
    if not text:
        return {"header": "", "outputs": []}
    if mime_sensitive:
        parser = MarimoPandocParser(output_format="marimo-pandoc-export-with-mime")  # type: ignore[arg-type]
    else:
        parser = MarimoPandocParser(output_format="marimo-pandoc-export")  # type: ignore[arg-type]
    return parser.convert(text)  # type: ignore[arg-type, return-value, no-any-return]


if __name__ == "__main__":
    assert len(sys.argv) in (3, 4), f"Unexpected call format got {sys.argv}"
    _, reference_file, mime_sensitive = sys.argv[:3]
    global_eval = sys.argv[3].lower() == "yes" if len(sys.argv) == 4 else True

    file = sys.stdin.read()
    if not file:
        with open(reference_file) as f:
            file = f.read()
    no_js = mime_sensitive.lower() == "yes"
    os.environ["MARIMO_NO_JS"] = str(no_js).lower()

    if not global_eval:
        default_config["eval"] = False

    conversion = convert_from_md_to_pandoc_export(file, no_js)
    sys.stdout.write(json.dumps(conversion))
