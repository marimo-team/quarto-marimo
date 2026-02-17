/*
 * is-marimo-cell.ts
 *
 * Detects whether a QuartoMdCell is a marimo code block.
 */

import type { QuartoMdCell } from "@quarto/types";

export function isMarimoCell(cell: QuartoMdCell): boolean {
  if (typeof cell.cell_type !== "object" || !("language" in cell.cell_type)) {
    return false;
  }
  const lang = cell.cell_type.language;
  // Handle {python.marimo} syntax (quarto parses as language "python.marimo")
  if (lang === "python.marimo") {
    return true;
  }
  // Handle {python .marimo} and legacy python {.marimo} syntax
  if (lang === "python") {
    const firstLine = cell.sourceVerbatim.value.split('\n')[0] || '';
    return /\.marimo/.test(firstLine);
  }
  return false;
}
