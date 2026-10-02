import { assertEquals } from "@std/assert";

import { isInteractiveFormat } from "../../src/engine/index.ts";

Deno.test("HTML-compatible format defaults to interactive", () => {
  assertEquals(isInteractiveFormat(true, {}), true);
});

Deno.test("interactive: false disables the browser runtime for HTML", () => {
  assertEquals(isInteractiveFormat(true, { interactive: false }), false);
});

Deno.test("interactive: true keeps the browser runtime for HTML", () => {
  assertEquals(isInteractiveFormat(true, { interactive: true }), true);
});

Deno.test("non-HTML formats are never interactive", () => {
  assertEquals(isInteractiveFormat(false, {}), false);
  assertEquals(isInteractiveFormat(false, { interactive: true }), false);
});
