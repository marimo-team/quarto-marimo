/*
 * cell-execution-regex.ts
 *
 * Regex for matching marimo cell syntax variants.
 *
 * Supports three syntaxes:
 *   ```{python.marimo}      ← pampa/dot-joined syntax
 *   ```{python .marimo}     ← preferred class syntax
 *   ```python {.marimo}     ← legacy (language outside braces)
 *
 * Groups:
 *   1: backticks (```+)
 *   2: language ("python.marimo" or "python")
 */

// Matches all marimo cell syntaxes with language always in group 2:
//   ```{python.marimo}      → group 2: "python.marimo"
//   ```{python .marimo}     → group 2: "python"
//   ```python {.marimo}     → group 2: "python" (legacy)
//
// Structure:
//   - Lookahead ensures .marimo appears somewhere
//   - \{? handles optional leading brace (present for braced syntax, absent for legacy)
//   - Language capture: python or python.marimo
//   - [^}]* consumes rest (classes, attributes) until closing brace
// Note: accepts some invalid syntax (e.g. comma-separated) that will fail pampa parsing
export const MARIMO_CELL_REGEX =
  /^\s*(```+)\s*(?=.*\.marimo)\{?(python(?:\.marimo)?)[^}]*\}\s*$/;
