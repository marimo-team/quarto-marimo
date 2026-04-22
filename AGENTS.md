# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
# Run all tests (TypeScript + Python)
make test

# TypeScript tests only
deno test --no-check --allow-read --allow-write --allow-env

# Single TypeScript test file
deno test --no-check --allow-read --allow-write --allow-env tests/cell-execution-regex.test.ts

# Python tests only
uv run --with pytest pytest tests/python -v

# Single Python test
uv run --with pytest pytest tests/python/test_extract.py::test_function_name -v

# Lint (ruff + mypy)
make lint

# Verify TypeScript compiles (does NOT update the committed marimo-engine.js)
make build

# Smoke test a render
quarto render tutorials/intro.qmd --to html
```

## Architecture

This is a Quarto [engine extension](https://quarto.org/docs/extensions/engines.html) that executes marimo cells inside `.qmd` documents. It has two components that work together:

### TypeScript engine (`src/marimo-engine.ts` → `_extensions/marimo/marimo-engine.js`)

Do not edit `marimo-engine.js` by hand — it is the compiled output. Rebuild with `make build` (or `quarto call build-ts-extension`), but note that `make build` builds a versioned artifact and then restores the committed `.js` via `git checkout`. The committed `.js` is what Quarto actually loads.

The engine is registered with Quarto and claims any `.qmd`/`.md` file containing `` {python .marimo} `` blocks (`claimsFile`, `claimsLanguage`). On `execute`, it:

1. Calls `command.py` to build `uv run` flags from the document's `pyproject` YAML front matter (inline script metadata format).
2. Calls `extract.py` passing the full markdown via stdin.
3. Receives a JSON result containing a `header` (marimo islands JS/CSS) and `outputs` (one per marimo cell).
4. Splits the document into chunks, replaces each marimo cell with its rendered output.
5. For HTML: injects the islands header into `<head>` via `include-in-header`.
6. For PDF/LaTeX/typst (`mime_sensitive=true`): outputs are static figures or plain text instead of interactive islands.

### Python engine (`_extensions/marimo/extract.py`)

Called as a subprocess by the TS engine. Uses marimo's internal `MarimoIslandGenerator` to execute cells and `MarimoIslandStub` to render them. The `MarimoPandocParser` subclasses marimo's markdown parser to intercept the parsed AST and emit either interactive islands or MIME-appropriate static output.

`__version__` in this file is the extension's version source of truth (also mirrored in `_extension.yml`).

### Dependency resolver (`_extensions/marimo/command.py`)

Called by the TS engine before `extract.py` to construct the `uv run` flags. Reads the document's `pyproject` YAML block (inline script metadata) to determine which packages to install into the sandbox.

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `QUARTO_MARIMO_VERSION` | Override the marimo JS version loaded by islands (default: installed version). Use to bisect regressions. |
| `QUARTO_MARIMO_DEBUG_ENDPOINT` | Override the islands runtime location. Leave unset for CDN, use `/marimo-frontend` for a site-local copied bundle, or an absolute URL for an already-running local server. |
| `QUARTO_MARIMO_LOCAL_FRONTEND_ROOT` | Override the local `marimo/frontend` checkout used by `scripts/sync_local_frontend.py` when `QUARTO_MARIMO_DEBUG_ENDPOINT` is a relative site path. |
| `MARIMO_NO_JS` | Set to `true` for non-JS output formats (PDF etc.); disables interactive islands |

For local preview/debugging against a sibling `marimo` checkout, prefer
`QUARTO_MARIMO_DEBUG_ENDPOINT=/marimo-frontend`. `_quarto.yml` runs
`scripts/sync_local_frontend.py` after render so `_site/marimo-frontend/dist`
matches the runtime path referenced by the generated pages.

## Document-level Options

These go in `.qmd` YAML front matter (or `_quarto.yml` for global defaults):

- `external-env: true` — skip `uv` sandbox, use the ambient Python environment
- `pyproject: |` — inline script metadata block for declaring dependencies
- `eval: false` — disable cell execution globally

Cell-level execution options (`#| key: value` inside code blocks): `eval`, `echo`, `output`, `warning`, `error`, `include`, `editor`.

## Release

```bash
./scripts/release.sh patch   # 0.0.x
./scripts/release.sh minor   # 0.x.0
```

Bumps version in `_extension.yml`, `extract.py`, and `marimo-engine.js`, then commits and tags. The publish GitHub Action fires on tags and creates the GitHub Release.
