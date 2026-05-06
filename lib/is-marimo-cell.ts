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
  // Handle {python.marimo}/{sql.marimo} syntax.
  if (lang === "python.marimo" || lang === "sql.marimo") {
    return true;
  }
  // Handle class syntax and legacy language-outside-braces syntax.
  if (lang === "python" || lang === "sql") {
    const firstLine = cell.sourceVerbatim.value.split('\n')[0] || '';
    return /\.marimo/.test(firstLine);
  }
  return false;
}
