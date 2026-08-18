<p align="center">
  <a href="https://marimo-team.github.io/quarto-marimo/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://marimo-team.github.io/quarto-marimo/assets/quarto-marimo-lockup-stacked-dark.svg">
      <img alt="quarto-marimo" src="https://marimo-team.github.io/quarto-marimo/assets/quarto-marimo-lockup-stacked-light.svg" width="320">
    </picture>
  </a>
</p>

<p align="center"><strong>Make Quarto documents reactive with marimo.</strong></p>

[Quarto](https://quarto.org/) turns Markdown into websites, books,
presentations, and other publication formats. `quarto-marimo` adds reactive
Python, SQL, and Markdown cells to those publications.

The extension compiles each document's `.marimo` cells into one marimo app.
Quarto places each result at its authored position and publishes the surrounding
document.

Requires Quarto 1.9.20 or newer, Python 3.10 or newer, and marimo 0.23.16 or
newer.

## Quick start

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and
[Quarto](https://quarto.org/docs/get-started/), then add the extension:

```bash
quarto add marimo-team/quarto-marimo
```

Create `index.qmd`:

````markdown
---
title: Reactive Quarto page
engine: marimo
format: html
---

```python {.marimo}
import marimo as mo

slider = mo.ui.slider(1, 10, 1, label="Items")
slider
```

The next cell reacts to the same shared app:

```python {.marimo}
mo.md(f"The slider is set to **{slider.value}**.")
```
````

Preview the document:

```bash
quarto preview
```

HTML output remains interactive in the browser. Formats such as PDF receive the
server-rendered cell output.

## Cell options

Use Quarto `#|` options at the start of a marimo cell:

Both `python {.marimo}` and `{python .marimo}` fence forms are supported.

````markdown
```python {.marimo}
#| echo: true
#| output: true

value = 2
value
```
````

| Option          | Default | Behavior                                           |
| --------------- | ------- | -------------------------------------------------- |
| `eval`          | `true`  | Execute the cell                                   |
| `echo`          | `false` | Render the authored source                         |
| `output`        | `true`  | Render the cell output                             |
| `server-output` | `true`  | Include build-time output before browser hydration |
| `error`         | `true`  | Render execution errors. `false` stops the build   |
| `include`       | `true`  | Include the cell in the document                   |
| `editor`        | `false` | Render the marimo editor for the Python cell       |
| `hide-code`     | `false` | Hide source and the editor                         |
| `hide-output`   | `false` | Hide rendered output                               |
| `disabled`      | `false` | Disable the cell and its dependents                |
| `unparsable`    | `false` | Preserve source as a non-reactive cell             |
| `name`          | `_`     | Set the marimo cell name                           |
| `column`        | none    | Set the marimo layout column                       |

SQL cells use the same `.marimo` class:

````markdown
```{sql .marimo}
#| echo: true
#| query: result

SELECT 1 AS value
```
````

SQL cells also accept `query` and `engine`. Use `{markdown .marimo}` when a
Markdown cell should join the page app.

## Python environment

Set `pyproject` in the document YAML to declare browser and build dependencies:

```yaml
pyproject: |
  requires-python = ">=3.10"
  dependencies = ["pandas"]
```

Set `external-env: true` to execute with the active Python environment during
the Quarto build.

Set `header` to Python source that runs as a setup cell before the authored
cells:

```yaml
header: |
  import polars as pl
```

`QUARTO_MARIMO_VERSION` selects the marimo runtime version embedded in HTML
output.

## Upgrading from 0.4

Replace the Lua filter configuration with the engine:

```yaml
engine: marimo
```

Remove `filters: marimo-team/marimo` from the document or project YAML.

## Development

Build the browser adapter and Quarto engine:

```bash
make build
```

Run the checks:

```bash
make lint
make test
make render
```
