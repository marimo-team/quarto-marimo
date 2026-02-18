.PHONY: build test test-ts test-py lint render clean

VERSION := $(shell grep '^version:' _extensions/marimo/_extension.yml | sed 's/.*: *//')

build:
	quarto call build-ts-extension
	mv _extensions/marimo/marimo-engine.js _extensions/marimo/marimo-engine-v$(VERSION).js
	git checkout -- _extensions/marimo/marimo-engine.js

test: test-ts test-py

test-ts:
	deno test --no-check --allow-read --allow-write --allow-env

test-py:
	uv run --with pytest pytest tests/python -v

lint:
	ruff check
	uv tool run mypy _extensions/marimo/ || echo "TODO: Fix local typing"

render:
	quarto render tutorials/intro.qmd --to html

clean:
	rm -rf _site .quarto _extensions/marimo/marimo-engine-v*.js
