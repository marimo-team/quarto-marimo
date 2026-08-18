# Contributing to quarto-marimo

The repository contains an installable Quarto extension, its TypeScript build
sources, and a standalone documentation site that consumes the local extension.

## Setup

Install [Pixi](https://pixi.sh) 0.68 or newer, then create the development
environment:

```bash
pixi install --locked
pixi run setup
```

The setup task installs the repository's pinned Quarto release. Pixi provides
Python, marimo, Deno, Pandoc, Ruff, mypy, and pytest.

## Commands

| Command | Result |
| --- | --- |
| `pixi run build` | Build and stage the versioned engine, browser, and style artifacts |
| `pixi run test` | Run the TypeScript and Python test suites |
| `pixi run lint` | Run Python and TypeScript linting and type checks |
| `pixi run render` | Install the local extension into `docs` and render the site |
| `pixi run serve` | Install the local extension into `docs` and start Quarto preview |
| `make clean` | Delete generated artifacts, caches, and rendered documentation |

Format Python and TypeScript source with:

```bash
pixi run ruff format
pixi run deno fmt deno.json src tests
```

## Repository structure

```text
quarto-marimo/
├── _extensions/marimo/          # Installable Quarto extension
│   ├── _extension.yml
│   ├── marimo-engine.js          # Stable release loader
│   └── python/                   # Shipped Python runtime
│       ├── command.py            # Resolve dependencies into uv arguments
│       ├── extract.py            # Compiler subprocess entry point
│       └── quarto_marimo/
│           ├── authoring.py      # Normalize Quarto cells and options
│           ├── cli.py            # Parse and compile one document
│           ├── compiler.py       # Vendored marimo page compiler
│           ├── document.py       # Collect one page compilation request
│           ├── protocol.py       # Page protocol models and validation
│           └── static.py         # Project output into Quarto records
├── src/
│   ├── engine/                   # Quarto engine source
│   ├── browser/                  # Quarto browser adapter
│   └── island-element.ts         # Shared element-name contract
├── docs/                         # Quarto documentation project
├── tests/
│   ├── engine/
│   ├── browser/
│   └── python/
├── types/quarto-types.d.ts       # Vendored Quarto engine types
├── scripts/                      # Build and release automation
└── dist/                         # Generated release artifacts
```

`_extensions/marimo/python/quarto_marimo/compiler.py` matches mdx-marimo's
[`packages/islands-compiler/compiler.py`](https://github.com/marimo-team/mdx-marimo/blob/main/packages/islands-compiler/compiler.py).
Quarto-specific collection, process execution, Pandoc projection, and browser
registration surround that compiler.

The stable loader resolves the version from `_extension.yml`. `make build`
writes versioned artifacts to `dist` and stages an ignored local cache under
`_extensions/marimo`. Tagged builds publish the same three artifacts to the
matching GitHub release.

## Pull requests

Run the full local gate before requesting review:

```bash
pixi run lint
pixi run test
pixi run render
```

## Releases

From a clean `main` checkout, run:

```bash
./scripts/release.sh patch
# or
./scripts/release.sh minor
```

The script validates the repository, updates `_extension.yml` and the Python
package version, and creates the release commit. It prompts before pushing the
commit or creating and pushing the tag. The publish workflow builds and
attaches the versioned engine, browser, and style artifacts.
