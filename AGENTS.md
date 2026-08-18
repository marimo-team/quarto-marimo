# AGENTS.md

Guidance for coding agents working on the Quarto engine extension for reactive
marimo cells. Read this before changing engine discovery, page compilation,
browser mounting, generated assets, or release automation.

## Commands

Use Pixi 0.68 or newer. Pixi provides Python, marimo, Deno, Pandoc, Ruff, mypy,
and pytest. The Makefile installs Quarto 1.9.37 under `.quarto-dev`.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Install | `pixi install --locked` | Create the locked development environment |
| Set up Quarto | `pixi run setup` | Install the pinned Quarto release |
| Lint and type-check | `pixi run lint` | Ruff, mypy, Deno formatting, linting, and type checks pass |
| Tests | `pixi run test` | TypeScript and Python tests pass |
| Build | `pixi run build` | Create the versioned engine, browser, and CSS artifacts |
| Render docs | `pixi run render` | Install the local extension and render the documentation site |
| Preview docs | `pixi run serve` | Install the local extension and start Quarto preview |
| Refresh tutorials | `pixi run refresh` | Export the installed marimo tutorials as Quarto Markdown |
| Clean | `make clean` | Delete build artifacts, extension caches, and rendered docs |

Run focused tests with:

```bash
pixi run deno test --allow-read --allow-write --allow-env --allow-run tests/engine/process.test.ts
pixi run pytest tests/python/test_document.py -v
```

`make test-ts` and `make test-py` run each full suite separately. Use
`pixi run lint && pixi run test && pixi run render` as the pull request gate.

## Architecture

- `src/engine` is the Quarto adapter. It claims `.qmd` and `.md` files with
  `.marimo` fences, reads document metadata, runs the Python compiler, projects
  each result back into Quarto Markdown, and adds browser assets for HTML.
- `_extensions/marimo/python/command.py` converts the document `pyproject`
  front matter into `uv run` arguments with marimo's sandbox utilities.
- `_extensions/marimo/python/quarto_marimo` owns document collection, compiler
  invocation, protocol models, and MIME-aware static output. `extract.py` is
  the subprocess entry point loaded by the TypeScript engine.
- `src/browser` registers `marimo-quarto-island` through the published
  `@marimo-team/mdx-marimo` bridge and supplies Quarto theme detection.
- `_extensions/marimo/marimo-engine.js` is the committed release loader. It
  reads the extension version, caches matching release artifacts, and imports
  the versioned engine.

The execution flow is:

```text
.qmd source
  -> Quarto engine
  -> Python document collector
  -> marimo page compiler
  -> compiled page protocol
  -> Quarto projection
  -> interactive islands or static output
```

## Dependency rule

The Quarto adapters depend on host-neutral contracts from
`@marimo-team/mdx-marimo`. The shared bridge must never depend on Quarto syntax,
Quarto engine types, Pandoc output, or Quarto theme classes.

- Keep fence discovery, front matter, `#|` options, process orchestration,
  Pandoc projection, and theme detection in this repository.
- Keep payload projection, custom element lifecycle, app retention, runtime
  assets, and shared styles in the mdx-marimo bridge.
- Keep `_extensions/marimo/python/quarto_marimo/compiler.py` aligned with
  [`packages/islands-compiler/compiler.py`](https://github.com/marimo-team/mdx-marimo/blob/main/packages/islands-compiler/compiler.py).
  Quarto-specific collection and static projection belong in the surrounding
  Python modules.
- Keep `src/browser` focused on element registration and host theme resolution.

## Conventions

- TypeScript source lives under `src`. Quarto engine types live in
  `types/quarto-types.d.ts`. TypeScript tests are grouped by `tests/engine` and
  `tests/browser`.
- Shipped Python lives under `_extensions/marimo/python`. Python tests live in
  `tests/python` and use absolute `quarto_marimo` imports.
- Format Python with `pixi run ruff format`. Format TypeScript with
  `pixi run deno fmt deno.json src tests`.
- Test through engine discovery, subprocess payloads, protocol records,
  projected Markdown, registered elements, and rendered documents. Avoid
  assertions against generated formatting or private helper structure.
- Keep comments for protocol constraints, lifecycle ordering, subprocess
  behavior, generated artifacts, and host compatibility rules.

## Runtime invariants

- Compile one source document into one `MarimoPageRequest` and one shared
  marimo app.
- Preserve one compiled result for every authored `.marimo` cell, in source
  order. A projection count mismatch fails the render.
- For interactive HTML, the engine projects protocol payloads into custom
  elements and injects the browser adapter once through `include-in-header`.
- Static formats project each compiled MIME result into Quarto Markdown,
  figures, raw HTML, or error blocks.
- Derive page identity from metadata, defaults, setup cells, and authored cells
  so temporary filenames do not change app identity.
- Keep protocol version 2 aligned across the vendored compiler, Python models,
  TypeScript guards, bridge projection, and tests.

## Environment variables

| Variable | Behavior |
| --- | --- |
| `QUARTO_MARIMO_VERSION` | Select the marimo runtime version compiled into interactive output. Use it to bisect runtime regressions. |
| `QUARTO_MARIMO_DEBUG_ENDPOINT` | Load marimo runtime assets from an absolute development server URL. |
| `QUARTO_MARIMO_TIMEOUT_SECONDS` | Set the compiler subprocess timeout. The default is 300 seconds. |
| `MARIMO_NO_JS` | Marks static compilation for marimo. The Python entry point sets it from the requested output mode. |

## Authoring options

The engine claims Python, SQL, and Markdown fences with the `.marimo` class,
including both `` ```python {.marimo} `` and `` ```{python .marimo} `` forms.

Document front matter supports:

- `external-env: true` to run compilation in the active Python environment.
- `pyproject: |` to declare dependencies for the `uv` sandbox.
- `eval: false` to disable cell execution for the document.
- `header: |` to add a Python setup cell before authored cells.

Cell `#|` options include `eval`, `echo`, `output`, `server-output`, `error`,
`include`, `editor`, `hide-code`, `hide-output`, `disabled`, `unparsable`,
`name`, and `column`. SQL cells also accept `query` and `engine`.

## Generated artifacts

`make build` creates three versioned release artifacts:

- `dist/marimo-engine-v<version>.js`
- `dist/browser-v<version>.js`
- `dist/islands-bridge-v<version>.css`

The build also stages ignored copies under `_extensions/marimo` for local
renders. Change engine behavior in `src/engine`, browser behavior in
`src/browser`, and bridge behavior in mdx-marimo. Edit the committed
`marimo-engine.js` loader when its download or cache contract changes.

`pixi run refresh` regenerates `docs/tutorials` from the installed marimo
tutorials with `marimo export md --flavor qmd`. Review generated tutorial
changes before committing them.

## Release

Run the release script from a clean `main` checkout:

```bash
./scripts/release.sh patch
./scripts/release.sh minor
```

The script runs tests, linting, and the build. It keeps the version in
`_extensions/marimo/_extension.yml` aligned with `extract.py`, creates a release
commit, and offers to push the commit and tag. The publish workflow builds the
three versioned artifacts and attaches them to the matching GitHub release.
