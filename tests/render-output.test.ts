/*
 * render-output.test.ts
 *
 * Tests for renderOutput markdown generation.
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { renderOutput } from "../lib/render-output.ts";
import type { MarimoOutput } from "../lib/render-output.ts";

function makeOutput(
  overrides: Partial<MarimoOutput> = {},
): MarimoOutput {
  return {
    type: "html",
    value: "",
    display_code: false,
    reactive: false,
    code: "",
    ...overrides,
  };
}

// === mimeSensitive=false (HTML output) ===

Deno.test("HTML output wraps value in raw HTML block", async () => {
  const output = makeOutput({ value: "<div>hello</div>" });
  const result = await renderOutput(output, false);
  assertStringIncludes(result, "```{=html}");
  assertStringIncludes(result, "<div>hello</div>");
  assertStringIncludes(result, "```");
});

Deno.test("HTML output with empty value returns empty string", async () => {
  const output = makeOutput({ value: "" });
  const result = await renderOutput(output, false);
  assertEquals(result, "");
});

Deno.test("HTML output with display_code prepends python block", async () => {
  const output = makeOutput({
    value: "<p>result</p>",
    display_code: true,
    code: "print('hello')",
  });
  const result = await renderOutput(output, false);
  assertStringIncludes(result, "```python\nprint('hello')\n```");
  assertStringIncludes(result, "```{=html}");
});

// === mimeSensitive=true (PDF/LaTeX output) ===

Deno.test("figure type renders as markdown image", async () => {
  const output = makeOutput({ type: "figure", value: "image.png" });
  const result = await renderOutput(output, true);
  assertEquals(result, "![Generated Figure](image.png)\n\n");
});

Deno.test("para type renders as plain text", async () => {
  const output = makeOutput({ type: "para", value: "some text" });
  const result = await renderOutput(output, true);
  assertEquals(result, "some text\n\n");
});

Deno.test("blockquote type renders with > prefix", async () => {
  const output = makeOutput({ type: "blockquote", value: "quoted text" });
  const result = await renderOutput(output, true);
  assertEquals(result, "> quoted text\n\n");
});

Deno.test("html type with table uses raw HTML block", async () => {
  const output = makeOutput({
    type: "html",
    value: "<table><tr><td>data</td></tr></table>",
  });
  const result = await renderOutput(output, true);
  assertStringIncludes(result, "```{=html}");
  assertStringIncludes(result, "<table>");
});

Deno.test("html type without table calls htmlToMarkdown converter", async () => {
  const output = makeOutput({
    type: "html",
    value: "<p>paragraph</p>",
  });
  const mockConverter = async (html: string): Promise<string> =>
    `converted: ${html}`;
  const result = await renderOutput(output, true, mockConverter);
  assertStringIncludes(result, "converted: <p>paragraph</p>");
});

Deno.test("html type without table uses identity when no converter", async () => {
  const output = makeOutput({
    type: "html",
    value: "<p>paragraph</p>",
  });
  const result = await renderOutput(output, true);
  assertStringIncludes(result, "<p>paragraph</p>");
});

Deno.test("mimeSensitive display_code prepends python block", async () => {
  const output = makeOutput({
    type: "para",
    value: "result",
    display_code: true,
    code: "x = 1",
  });
  const result = await renderOutput(output, true);
  assertStringIncludes(result, "```python\nx = 1\n```");
  assertStringIncludes(result, "result\n\n");
});

Deno.test("empty value for each mimeSensitive type returns empty", async () => {
  for (const type of ["figure", "para", "blockquote", "html"] as const) {
    const output = makeOutput({ type, value: "" });
    const result = await renderOutput(output, true);
    assertEquals(result, "", `type=${type} with empty value should be empty`);
  }
});
