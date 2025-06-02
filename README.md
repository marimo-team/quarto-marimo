# marimo + quarto = :palm_tree: :heart:

## marimo

marimo is a next generation python notebook that is embeddable anywhere.
As such, it is a great fit for quarto, which has reactive and robust a publishing system.
This repo is a quarto filter that lets you use marimo in your quarto documents; just follow the setup below.

### Quick Start

**1.** Tool Installation

 - Install [uv](https://docs.astral.sh/uv/getting-started/installation/)
 - Install [Quarto](https://quarto.org/docs/get-started/) (if you have brew: `brew install quarto`)

**2.** Create a project

```bash
quarto create project
```

**3.** Add `quarto-marimo` to your project

```bash
quarto add marimo-team/quarto-marimo
```

**4.** Edit your `index.qmd`

````yaml
---
filters:
    - marimo-team/marimo
---

# Just another Quarto project

```python {.marimo}
#| echo: true
import marimo as mo
slider = mo.ui.slider(1, 10, 1, label="Look, a slider!")
slider
```

## More things

And we can respond!

```python {.marimo}
# No echo here means we do not show the code
mo.md("NaN" * slider.value + " Batman!")
```
````

**5.** Run!

```bash
quarto preview
# uvx --with marimo --from quarto-cli quarto preview
```

### Features

This plugin uses [`marimo
islands`](https://docs.marimo.io/guides/exporting/?h=islands#islands-in-action)
:palm_tree: which allows marimo content to be embedded in between other
content. In addition to base marimo support, some [Quarto execution
options](https://quarto.org/docs/computations/execution-options.html) are also
supported:

| Option | Default | Description |
|--------|---------|-------------|
eval | True | Whether this code should run
echo | False | Whether to show the code in the output
output | True | Whether to show the output
warning | True | Whether to show warnings
error | True | Whether to show errors
include | True | Whether to consider the block as part of the document
editor | False | Whether to show the editor (only for marimo)

:bulb: **Note**: You can open `.md` and `.qmd` files directly in marimo
like a normal notebook. Read more about it in the
[tutorial](https://github.com/marimo-team/marimo/blob/main/marimo/_tutorials/markdown_format.md)

:notebook: [**Check out the marimo mkdocs
extension**](https://github.com/marimo-team/mkdocs-marimo)

### Environment

By default, marimo will use `uv` to create a new virtual environment.
You can specify dependencies by [following our docs](https://docs.marimo.io/guides/package_reproducibility#markdown-file-support)
and setting the yaml `pyproject` value in your notebook.

To disable sandboxed behavior, set `external-env: true` in your notebook yaml; this requires an active virtual environment with marimo installed.

> [!NOTE]
> You can add `pyproject` or `enternal-env` to your `_quarto.yml` file for global behavior

Note, that local files are not bound to be accessible in WASM runtimes- and on
web load, dependencies are installed via [`micropip`](https://github.com/pyodide/micropip).
As such, this is mainly advised for PDF rendering, or other output formats that do not support
Javascript.

---

Credits: [holoviz-quarto](https://github.com/awesome-panel/holoviz-quarto) for ideas on layout
