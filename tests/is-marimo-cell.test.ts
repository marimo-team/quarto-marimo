/*
 * is-marimo-cell.test.ts
 *
 * Tests for isMarimoCell detection logic.
 */

import { assertEquals } from "jsr:@std/assert";
import { isMarimoCell } from "../lib/is-marimo-cell.ts";
import type { QuartoMdCell } from "../tests/mocks/quarto-types.ts";

function makeCell(language: string, source: string): QuartoMdCell {
  return {
    cell_type: { language },
    sourceVerbatim: { value: source },
  };
}

Deno.test("python.marimo language returns true", () => {
  const cell = makeCell("python.marimo", "import marimo as mo");
  assertEquals(isMarimoCell(cell), true);
});

Deno.test("{python .marimo} class syntax returns true", () => {
  const cell = makeCell("python", "```{python .marimo}\nimport marimo");
  assertEquals(isMarimoCell(cell), true);
});

Deno.test("python {.marimo} legacy syntax returns true", () => {
  const cell = makeCell("python", "```python {.marimo}\nimport marimo");
  assertEquals(isMarimoCell(cell), true);
});

Deno.test("plain python without .marimo returns false", () => {
  const cell = makeCell("python", "print('hello')");
  assertEquals(isMarimoCell(cell), false);
});

Deno.test("other languages return false", () => {
  const cell = makeCell("r", "library(ggplot2)");
  assertEquals(isMarimoCell(cell), false);
});

Deno.test("string cell_type returns false", () => {
  const cell: QuartoMdCell = {
    cell_type: "markdown",
    sourceVerbatim: { value: "# heading" },
  };
  assertEquals(isMarimoCell(cell), false);
});

Deno.test("cell_type object without language returns false", () => {
  const cell: QuartoMdCell = {
    cell_type: {} as { language: string },
    sourceVerbatim: { value: "" },
  };
  assertEquals(isMarimoCell(cell), false);
});
