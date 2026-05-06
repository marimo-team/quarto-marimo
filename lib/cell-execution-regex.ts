/*
 * cell-execution-regex.ts
 *
 * Regex for matching marimo cell syntax variants.
 *
 * Supports three syntaxes:
 *   ```{python.marimo}      ← pampa/dot-joined syntax
 *   ```{python .marimo}     ← preferred class syntax
 *   ```python {.marimo}     ← legacy (language outside braces)
 *   ```{sql.marimo}         ← SQL dot-joined syntax
 *   ```sql {.marimo}        ← SQL marimo cells
 *
 * Groups:
 *   1: backticks (```+)
 *   2: language ("python.marimo", "python", "sql.marimo", or "sql")
 */

// Matches all marimo cell syntaxes with language always in group 2:
//   ```{python.marimo}      → group 2: "python.marimo"
//   ```{python .marimo}     → group 2: "python"
//   ```python {.marimo}     → group 2: "python" (legacy)
//   ```{sql.marimo}         → group 2: "sql.marimo"
//   ```sql {.marimo}        → group 2: "sql" (SQL cells)
//
// Structure:
//   - Lookahead ensures .marimo appears somewhere
//   - \{? handles optional leading brace (present for braced syntax, absent for legacy)
//   - Language capture: python/sql or python.marimo/sql.marimo
//   - [^}]* consumes rest (classes, attributes) until closing brace
// Note: accepts some invalid syntax (e.g. comma-separated) that will fail pampa parsing
export const MARIMO_CELL_REGEX =
  /^\s*(```+)\s*(?=.*\.marimo)\{?((?:python|sql)(?:\.marimo)?)[^}]*\}\s*$/;
