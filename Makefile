.PHONY: build browser-build engine-build docs-prepare clean-python-cache test test-ts test-py lint preview render ci clean setup

VERSION := $(shell grep '^version:' _extensions/marimo/_extension.yml | sed 's/.*: *//')
ENGINE_ARTIFACT := dist/marimo-engine-v$(VERSION).js
ENGINE_CACHE := _extensions/marimo/marimo-engine-v$(VERSION).js

QUARTO_VERSION ?= 1.9.37
QUARTO_DIR := .quarto-dev/$(QUARTO_VERSION)
QUARTO_DOWNLOAD_URL ?= https://github.com/quarto-dev/quarto-cli/releases/download/v$(QUARTO_VERSION)/$(QUARTO_PKG)

ifeq ($(shell uname -s),Darwin)
  QUARTO_PKG := quarto-$(QUARTO_VERSION)-macos.tar.gz
else ifeq ($(shell uname -m),aarch64)
  QUARTO_PKG := quarto-$(QUARTO_VERSION)-linux-arm64.tar.gz
else
  QUARTO_PKG := quarto-$(QUARTO_VERSION)-linux-amd64.tar.gz
endif

export PATH := $(shell pwd)/$(QUARTO_DIR)/bin:$(PATH)
export PYTHONDONTWRITEBYTECODE := 1

ifdef PIXI_PROJECT_ROOT
  PYTHON := python
  DENO := deno
  RUFF := ruff
  MYPY := mypy
  PYTEST := pytest
else
  PYTHON := uv run python
  DENO := uv run deno
  RUFF := uv run ruff
  MYPY := uv tool run --with marimo mypy
  PYTEST := uv run --with pytest pytest
endif

# macOS archives are flat. Linux archives wrap the tree in a versioned directory.
$(QUARTO_DIR)/bin/quarto:
	@set -eu; \
	stage=$$(mktemp -d); \
	trap 'rm -rf "$$stage"' EXIT; \
	archive="$$stage/$(QUARTO_PKG)"; \
	unpacked="$$stage/unpacked"; \
	mkdir -p "$$unpacked"; \
	curl -fSL -o "$$archive" "$(QUARTO_DOWNLOAD_URL)"; \
	tar xzf "$$archive" -C "$$unpacked"; \
	if [ -x "$$unpacked/bin/quarto" ]; then \
		root="$$unpacked"; \
	elif [ -x "$$unpacked/quarto-$(QUARTO_VERSION)/bin/quarto" ]; then \
		root="$$unpacked/quarto-$(QUARTO_VERSION)"; \
	else \
		echo "Unsupported Quarto archive layout: missing bin/quarto" >&2; \
		exit 1; \
	fi; \
	mkdir -p "$(QUARTO_DIR)"; \
	cp -R "$$root/." "$(QUARTO_DIR)"

setup: $(QUARTO_DIR)/bin/quarto

build:
	rm -rf dist _extensions/marimo/assets
	rm -f _extensions/marimo/marimo-engine-v*.js
	$(MAKE) browser-build
	$(MAKE) engine-build

browser-build:
	$(PYTHON) scripts/build_browser.py

engine-build:
	quarto call build-ts-extension src/engine/index.ts
	mv dist/marimo-engine.js $(ENGINE_ARTIFACT)
	cp $(ENGINE_ARTIFACT) $(ENGINE_CACHE)

docs-prepare: build
	$(MAKE) clean-python-cache
	rm -rf docs/_extensions
	cd docs && quarto add .. --no-prompt

clean-python-cache:
	find _extensions/marimo -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete
	find _extensions/marimo -type d -name __pycache__ -empty -delete

test: test-ts test-py

test-ts:
	$(DENO) test --allow-read --allow-write --allow-env --allow-run tests

test-py:
	$(PYTEST) tests/python -v

lint:
	$(RUFF) check _extensions/marimo/python scripts tests/python
	$(MYPY) _extensions/marimo/python
	$(DENO) fmt --check deno.json _extensions/marimo/marimo-engine.js src tests
	$(DENO) lint _extensions/marimo/marimo-engine.js src tests
	$(DENO) check _extensions/marimo/marimo-engine.js src/engine/index.ts src/browser/index.ts

preview: docs-prepare
	cd docs && quarto preview

render: docs-prepare
	cd docs && quarto render

ci: setup
	$(QUARTO_DIR)/bin/quarto install tinytex --no-prompt
	$(MAKE) render

clean:
	rm -rf dist docs/_site docs/.quarto docs/_extensions
	rm -rf _extensions/marimo/assets
	rm -f _extensions/marimo/marimo-engine-v*.js
	$(MAKE) clean-python-cache
