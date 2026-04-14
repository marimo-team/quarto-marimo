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

function withTempFile(ext: string, contents: string, fn: (file: string) => void) {
  const dir = Deno.makeTempDirSync();
  const file = `${dir}/test${ext}`;
  try {
    Deno.writeTextFileSync(file, contents);
    fn(file);
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
}

Deno.test("claimsFile returns true for legacy marimo fences", () => {
  withTempFile(
    ".qmd",
    "```python {.marimo}\nimport marimo as mo\nslider\n```",
    (file) => {
      assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), true);
    },
  );
});

Deno.test("claimsFile returns true for braced marimo fences", () => {
  withTempFile(
    ".qmd",
    "```{python .marimo}\nimport marimo as mo\nslider\n```",
    (file) => {
      assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), true);
    },
  );
});

Deno.test("claimsFile returns false for plain python fences", () => {
  withTempFile(
    ".qmd",
    "```{python}\nprint('hello')\n```",
    (file) => {
      assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), false);
    },
  );
});

Deno.test("claimsFile returns false for unsupported extensions", () => {
  withTempFile(
    ".py",
    "```python {.marimo}\nimport marimo as mo\nslider\n```",
    (file) => {
      assertEquals(marimoEngineDiscovery.claimsFile(file, ".py"), false);
    },
  );
});

Deno.test("name is marimo", () => {
  assertEquals(marimoEngineDiscovery.name, "marimo");
});
