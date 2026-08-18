#!/usr/bin/env bash

set -euo pipefail
shopt -s nullglob

MARIMO_ROOT=$(python -c 'import marimo; print(next(iter(marimo.__path__)))')
TUTORIAL_DIR=$(cd "$(dirname "$0")/../tutorials" && pwd)

for source in "$MARIMO_ROOT"/_tutorials/*.py; do
  [[ $(basename "$source") == _* ]] && continue
  marimo export md --flavor qmd "$source" -o "$TUTORIAL_DIR/$(basename "$source" .py).qmd"
done

for source in "$MARIMO_ROOT"/_tutorials/*.md; do
  [[ $(basename "$source") == _* || $(basename "$source") == README.md ]] && continue
  marimo export md --flavor qmd "$source" -o "$TUTORIAL_DIR/$(basename "$source" .md).qmd"
done
