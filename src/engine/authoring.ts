import type { QuartoMdCell } from "@quarto/types";

export const MARIMO_CELL_REGEX =
  /^\s{0,3}(`{3,})\s*(?=(?:\{)?\.?((?:python|sql|markdown)(?:\.marimo)?|marimo)(?=[\s}]))(?:(?:python|sql|markdown)\s+\{(?=(?:\.marimo(?=[\s}])|[^}]*\s\.marimo(?=[\s}])))[^}]*\}|\{(?:(?:python|sql|markdown)\.marimo(?=[\s}])|(?:python|sql|markdown)(?=\s)(?=[^}]*\s\.marimo(?=[\s}]))|\.?marimo(?=[\s}]))[^}]*\})\s*$/;

const MARKDOWN_FENCE_REGEX = /^\s{0,3}(`{3,}|~{3,})/;
const MARKDOWN_FENCE_CLOSE_REGEX = /^\s{0,3}(`{3,}|~{3,})\s*$/;

export function containsMarimoFence(markdown: string): boolean {
  let enclosingFence: string | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    if (enclosingFence) {
      const closingFence = line.match(MARKDOWN_FENCE_CLOSE_REGEX)?.[1];
      if (
        closingFence?.[0] === enclosingFence[0] &&
        closingFence.length >= enclosingFence.length
      ) {
        enclosingFence = undefined;
      }
      continue;
    }
    if (MARIMO_CELL_REGEX.test(line)) return true;
    enclosingFence = line.match(MARKDOWN_FENCE_REGEX)?.[1];
  }
  return false;
}

export function isMarimoCell(cell: QuartoMdCell): boolean {
  if (typeof cell.cell_type !== "object" || !("language" in cell.cell_type)) {
    return false;
  }
  const language = cell.cell_type.language;
  if (
    language !== "python" &&
    language !== "sql" &&
    language !== "markdown" &&
    language !== "marimo" &&
    language !== "python.marimo" &&
    language !== "sql.marimo" &&
    language !== "markdown.marimo"
  ) {
    return false;
  }
  const firstLine = cell.sourceVerbatim.value.split("\n", 1)[0] ?? "";
  return MARIMO_CELL_REGEX.test(firstLine);
}
