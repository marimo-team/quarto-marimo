/*
 * claims-language.test.ts
 *
 * Tests for marimoEngineDiscovery properties and claimsLanguage.
 */

import { assertEquals } from "jsr:@std/assert";

// Import the engine discovery object directly
import marimoEngineDiscovery from "../src/marimo-engine.ts";

// Initialize with a mock QuartoAPI so the engine is usable
marimoEngineDiscovery.init({
  console: {
    info: () => {},
    warning: () => {},
    error: () => {},
    withSpinner: async (_opts, fn) => { await fn(); },
  },
  system: {
    pandoc: async () => ({ success: true, stdout: "", stderr: "" }),
  },
  mappedString: {
    fromFile: (file: string) => ({ value: "" }),
  },
  markdownRegex: {
    extractYaml: () => ({}),
    partition: () => ({}),
    breakQuartoMd: async () => ({ cells: [] }),
  },
});

// === claimsLanguage ===

Deno.test("claimsLanguage: python + marimo returns 2", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("python", "marimo"), 2);
});

Deno.test("claimsLanguage: python.marimo returns 1", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("python.marimo"), 1);
});

Deno.test("claimsLanguage: plain python returns false", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("python"), false);
});

Deno.test("claimsLanguage: python + other returns false", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("python", "other"), false);
});

Deno.test("claimsLanguage: r + marimo returns false", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("r", "marimo"), false);
});

Deno.test("claimsLanguage: julia returns false", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("julia"), false);
});

// === Other discovery properties ===

Deno.test("defaultExt is .qmd", () => {
  assertEquals(marimoEngineDiscovery.defaultExt, ".qmd");
});

Deno.test("validExtensions returns [.qmd, .md]", () => {
  assertEquals(marimoEngineDiscovery.validExtensions(), [".qmd", ".md"]);
});

Deno.test("claimsFile always returns false", () => {
  assertEquals(marimoEngineDiscovery.claimsFile("test.qmd", ".qmd"), false);
  assertEquals(marimoEngineDiscovery.claimsFile("test.py", ".py"), false);
});

Deno.test("name is marimo", () => {
  assertEquals(marimoEngineDiscovery.name, "marimo");
});
