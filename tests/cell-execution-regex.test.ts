/*
 * cell-execution-regex.test.ts
 *
 * Tests for marimo cell syntax regex
 */

import { assert, assertEquals } from "jsr:@std/assert";
import { MARIMO_CELL_REGEX } from "../lib/cell-execution-regex.ts";

function assertMatch(
  line: string,
  expectedLanguage: string,
  description: string,
): void {
  const match = line.match(MARIMO_CELL_REGEX);
  assert(match !== null, `${description}: should match but didn't`);
  assertEquals(
    match[2],
    expectedLanguage,
    `${description}: expected language "${expectedLanguage}" but got "${match[2]}"`,
  );
}

function assertNoMatch(line: string, description: string): void {
  const match = line.match(MARIMO_CELL_REGEX);
  assert(match === null, `${description}: should NOT match but did`);
}

// === Positive cases ===

Deno.test("{python .marimo} basic", () => {
  assertMatch("```{python .marimo}", "python", "{python .marimo} basic");
});

Deno.test("{python .marimo} with space", () => {
  assertMatch("```{python .marimo}", "python", "{python .marimo} with space");
});

Deno.test("{python .marimo} with attributes", () => {
  assertMatch(
    "```{python .marimo echo=FALSE}",
    "python",
    "{python .marimo} with attributes",
  );
});

Deno.test("{python .marimo} with extra class", () => {
  assertMatch(
    "```{python .marimo .foo}",
    "python",
    "{python .marimo} with extra class",
  );
});

Deno.test("{python .marimo} with extra class and attributes", () => {
  assertMatch(
    "```{python .marimo .foo qux=2}",
    "python",
    "{python .marimo} with extra class and attributes",
  );
});

Deno.test("{python .marimo} with leading whitespace", () => {
  assertMatch(
    "  ```{python .marimo}",
    "python",
    "{python .marimo} with leading whitespace",
  );
});

Deno.test("{python .marimo} with trailing whitespace", () => {
  assertMatch(
    "```{python .marimo}  ",
    "python",
    "{python .marimo} with trailing whitespace",
  );
});

Deno.test("{python.marimo} basic", () => {
  assertMatch("```{python.marimo}", "python.marimo", "{python.marimo} basic");
});

Deno.test("{python.marimo} with attributes", () => {
  assertMatch(
    "```{python.marimo echo=FALSE}",
    "python.marimo",
    "{python.marimo} with attributes",
  );
});

Deno.test("{python.marimo} with leading whitespace", () => {
  assertMatch(
    "  ```{python.marimo}",
    "python.marimo",
    "{python.marimo} with leading whitespace",
  );
});

Deno.test("{python.marimo} with trailing whitespace", () => {
  assertMatch(
    "```{python.marimo}  ",
    "python.marimo",
    "{python.marimo} with trailing whitespace",
  );
});

Deno.test("python {.marimo} legacy basic", () => {
  assertMatch(
    "```python {.marimo}",
    "python",
    "python {.marimo} legacy basic",
  );
});

Deno.test("python {.marimo} legacy with attributes", () => {
  assertMatch(
    "```python {.marimo echo=FALSE}",
    "python",
    "python {.marimo} legacy with attributes",
  );
});

Deno.test("python {.marimo} legacy with leading whitespace", () => {
  assertMatch(
    "  ```python {.marimo}",
    "python",
    "python {.marimo} legacy with leading whitespace",
  );
});

Deno.test("four backticks {python .marimo}", () => {
  assertMatch(
    "````{python .marimo}",
    "python",
    "four backticks {python .marimo}",
  );
});

Deno.test("four backticks {python.marimo}", () => {
  assertMatch(
    "````{python.marimo}",
    "python.marimo",
    "four backticks {python.marimo}",
  );
});

Deno.test("five backticks {python .marimo}", () => {
  assertMatch(
    "`````{python .marimo}",
    "python",
    "five backticks {python .marimo}",
  );
});

// === Negative cases ===

Deno.test("regular {python} without marimo", () => {
  assertNoMatch("```{python}", "regular {python} without marimo");
});

Deno.test("regular {python} with attributes", () => {
  assertNoMatch(
    "```{python echo=FALSE}",
    "regular {python} with attributes",
  );
});

Deno.test("bare python without braces", () => {
  assertNoMatch("```python", "bare python without braces");
});

Deno.test("{r .marimo} wrong language", () => {
  assertNoMatch("```{r .marimo}", "{r .marimo} wrong language");
});

Deno.test("{julia .marimo} wrong language", () => {
  assertNoMatch("```{julia .marimo}", "{julia .marimo} wrong language");
});

Deno.test("{javascript.marimo} wrong language", () => {
  assertNoMatch(
    "```{javascript.marimo}",
    "{javascript.marimo} wrong language",
  );
});

Deno.test("{pythonmarimo} no dot separator", () => {
  assertNoMatch("```{pythonmarimo}", "{pythonmarimo} no dot separator");
});

Deno.test("{python marimo} space but no dot", () => {
  assertNoMatch("```{python marimo}", "{python marimo} space but no dot");
});

Deno.test("{python.marimo unclosed brace", () => {
  assertNoMatch("```{python.marimo", "{python.marimo unclosed brace");
});

Deno.test("{.marimo} no language", () => {
  assertNoMatch("```{.marimo}", "{.marimo} no language");
});

Deno.test("only two backticks", () => {
  assertNoMatch("``{python .marimo}", "only two backticks");
});

Deno.test("no backticks at all", () => {
  assertNoMatch("{python .marimo}", "no backticks at all");
});
