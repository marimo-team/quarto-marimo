/*
 * cell-execution-regex.test.ts
 *
 * Tests for marimo cell syntax regex
 * Run with: deno run tests/cell-execution-regex.test.ts
 */

import { MARIMO_CELL_REGEX } from "../lib/cell-execution-regex.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
}

function testMatch(
  line: string,
  expectedLanguage: string,
  description: string
): void {
  const match = line.match(MARIMO_CELL_REGEX);
  assert(match !== null, `${description}: should match but didn't`);
  // Language is always in group 2
  const actualLanguage = match[2];
  assert(
    actualLanguage === expectedLanguage,
    `${description}: expected language "${expectedLanguage}" but got "${actualLanguage}"`
  );
  console.log(`✓ ${description}`);
}

function testNoMatch(line: string, description: string): void {
  const match = line.match(MARIMO_CELL_REGEX);
  assert(match === null, `${description}: should NOT match but did`);
  console.log(`✓ ${description}`);
}

// ============================================================================
// Positive cases - should match
// ============================================================================

console.log("\n=== Positive cases ===\n");

// Preferred syntax: {python .marimo}
testMatch("```{python .marimo}", "python", "{python .marimo} basic");
testMatch("```{python .marimo}", "python", "{python .marimo} with space");
testMatch(
  "```{python .marimo echo=FALSE}",
  "python",
  "{python .marimo} with attributes"
);
testMatch(
  "```{python .marimo .foo}",
  "python",
  "{python .marimo} with extra class"
);
testMatch(
  "```{python .marimo .foo qux=2}",
  "python",
  "{python .marimo} with extra class and attributes"
);
testMatch("  ```{python .marimo}", "python", "{python .marimo} with leading whitespace");
testMatch("```{python .marimo}  ", "python", "{python .marimo} with trailing whitespace");

// Pampa/dot-joined syntax: {python.marimo}
testMatch("```{python.marimo}", "python.marimo", "{python.marimo} basic");
testMatch(
  "```{python.marimo echo=FALSE}",
  "python.marimo",
  "{python.marimo} with attributes"
);
testMatch("  ```{python.marimo}", "python.marimo", "{python.marimo} with leading whitespace");
testMatch("```{python.marimo}  ", "python.marimo", "{python.marimo} with trailing whitespace");

// Legacy syntax: python {.marimo}
testMatch("```python {.marimo}", "python", "python {.marimo} legacy basic");
testMatch(
  "```python {.marimo echo=FALSE}",
  "python",
  "python {.marimo} legacy with attributes"
);
testMatch("  ```python {.marimo}", "python", "python {.marimo} legacy with leading whitespace");

// Multiple backticks
testMatch("````{python .marimo}", "python", "four backticks {python .marimo}");
testMatch("````{python.marimo}", "python.marimo", "four backticks {python.marimo}");
testMatch("`````{python .marimo}", "python", "five backticks {python .marimo}");

// ============================================================================
// Negative cases - should NOT match
// ============================================================================

console.log("\n=== Negative cases ===\n");

// Regular python (no marimo)
testNoMatch("```{python}", "regular {python} without marimo");
testNoMatch("```{python echo=FALSE}", "regular {python} with attributes");
// Note: comma syntax like ```{python .marimo, echo=FALSE} is accepted but will fail pampa parsing
testNoMatch("```python", "bare python without braces");

// Wrong language
testNoMatch("```{r .marimo}", "{r .marimo} wrong language");
testNoMatch("```{julia .marimo}", "{julia .marimo} wrong language");
testNoMatch("```{javascript.marimo}", "{javascript.marimo} wrong language");

// Malformed
testNoMatch("```{pythonmarimo}", "{pythonmarimo} no dot separator");
testNoMatch("```{python marimo}", "{python marimo} space but no dot");
testNoMatch("```{python.marimo", "{python.marimo unclosed brace");
// Note: ```python.marimo} (unbalanced brace) is accepted by regex but will fail pampa parsing
testNoMatch("```{.marimo}", "{.marimo} no language");

// Not code fences
testNoMatch("``{python .marimo}", "only two backticks");
testNoMatch("{python .marimo}", "no backticks at all");

console.log("\n=== All tests passed! ===\n");
