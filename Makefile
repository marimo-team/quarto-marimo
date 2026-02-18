.PHONY: build test test-ts test-py lint render clean setup

VERSION := $(shell grep '^version:' _extensions/marimo/_extension.yml | sed 's/.*: *//')

# Quarto pre-release (engine extensions require >=1.9.20)
QUARTO_VERSION := 1.9.20
QUARTO_DIR := .quarto-dev

ifeq ($(shell uname -s),Darwin)
  QUARTO_PKG := quarto-$(QUARTO_VERSION)-macos.tar.gz
else ifeq ($(shell uname -m),aarch64)
  QUARTO_PKG := quarto-$(QUARTO_VERSION)-linux-arm64.tar.gz
else
  QUARTO_PKG := quarto-$(QUARTO_VERSION)-linux-amd64.tar.gz
endif

export PATH := $(shell pwd)/$(QUARTO_DIR)/bin:$(PATH)

$(QUARTO_DIR)/bin/quarto:
	mkdir -p $(QUARTO_DIR)
	curl -fSL -o /tmp/$(QUARTO_PKG) \
		https://github.com/quarto-dev/quarto-cli/releases/download/v$(QUARTO_VERSION)/$(QUARTO_PKG)
	tar xzf /tmp/$(QUARTO_PKG) -C $(QUARTO_DIR)
	rm /tmp/$(QUARTO_PKG)
	@echo "Quarto $(QUARTO_VERSION) installed to $(QUARTO_DIR)/bin/quarto"

setup: $(QUARTO_DIR)/bin/quarto

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
	uv tool run --with marimo mypy _extensions/marimo/

render:
	quarto render tutorials/intro.qmd --to html

clean:
	rm -rf _site .quarto _extensions/marimo/marimo-engine-v*.js
