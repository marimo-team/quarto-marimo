# Contributing to quarto-marimo

Thank you for your interest in contributing!

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Quarto](https://quarto.org) ≥ 1.9.20 | Required to render `.qmd` files |
| [pixi](https://pixi.sh) | Manages the full dev environment (Python + system deps) |
| [uv](https://docs.astral.sh/uv/) | Fast Python package runner (used for Python-only tasks) |
| [Deno](https://deno.com) | Runs TypeScript tests |

Install pixi, then run:

```bash
pixi install
```

This installs all Python and system dependencies (marimo, pandoc, stylua, mypy, pytest, etc.) into an isolated environment.

## Development workflow

### Make targets

| Command | What it does |
|---------|-------------|
| `make build` | Compile `src/marimo-engine.ts` → `_extensions/marimo/marimo-engine.js` |
| `make test` | Run all TypeScript + Python tests |
| `make test-ts` | Run only TypeScript tests (via Deno) |
| `make test-py` | Run only Python tests (via uv + pytest) |
| `make lint` | Run ruff + mypy |
| `make render` | Render the documentation site |
| `make preview` | Serve the site locally with live reload |
| `make clean` | Remove build artifacts |

### Linting and formatting

```bash
# Lint + type-check
make lint

# Auto-fix formatting
uv run ruff format
uv run ruff check --fix
```

### Running tests

```bash
# All tests
make test

# TypeScript only
deno test --no-check --allow-read --allow-write --allow-env

# Python only
uv run --with pytest pytest tests/python -v
```

### Pre-commit hooks

Install once, then hooks run automatically on `git commit`:

```bash
pip install pre-commit
pre-commit install
```

Run manually against all files:

```bash
pre-commit run --all-files
```

## Project structure

```
quarto-marimo/
├── _extensions/marimo/       # Installed Quarto extension
│   ├── _extension.yml        # Extension metadata + version
│   ├── extract.py            # Main Python engine (version source of truth)
│   ├── command.py            # CLI entry point
│   ├── marimo-engine.js      # Compiled JS engine (do not edit by hand)
│   └── marimo-deprecated.lua # Backward-compat Lua filter
├── src/
│   └── marimo-engine.ts      # TypeScript source → compiled to marimo-engine.js
├── tests/
│   ├── *.test.ts             # TypeScript unit tests
│   └── python/               # Python unit tests
├── tutorials/                # Example .qmd files
└── scripts/
    ├── release.sh            # Release automation
    └── export.sh             # Export marimo tutorials to .qmd
```

## Submitting a pull request

1. Fork the repo and create a branch from `main`.
2. Make your changes, add tests for new behavior.
3. Ensure `make lint` and `make test` pass.
4. Open a PR — the template will guide you through the checklist.

Every bug fix should include a regression test that fails before the fix and passes after.

## Release process

Releases are for maintainers only.

```bash
# Patch release (0.0.x)
./scripts/release.sh patch

# Minor release (0.x.0)
./scripts/release.sh minor
```

The script will:
1. Verify you are on `main` with a clean working directory
2. Run the full test suite and linting
3. Build the engine bundle
4. Bump the version in `_extension.yml`, `extract.py`, and `marimo-engine.js`
5. Commit and optionally push + tag

After tagging, the [publish workflow](https://github.com/marimo-team/quarto-marimo/actions/workflows/publish.yml) creates a GitHub Release automatically.
