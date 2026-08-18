import { assertEquals } from "@std/assert";

import marimoEngineDiscovery from "../../src/engine/index.ts";

Deno.test("claims native class and dot language forms", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("python", "marimo"), 2);
  assertEquals(marimoEngineDiscovery.claimsLanguage("sql", "marimo"), 2);
  assertEquals(marimoEngineDiscovery.claimsLanguage("markdown", "marimo"), 2);
  assertEquals(marimoEngineDiscovery.claimsLanguage("python.marimo"), 1);
  assertEquals(marimoEngineDiscovery.claimsLanguage("sql.marimo"), 1);
  assertEquals(marimoEngineDiscovery.claimsLanguage("markdown.marimo"), 1);
  assertEquals(marimoEngineDiscovery.claimsLanguage("marimo"), 1);
});

Deno.test("leaves ordinary languages to other engines", () => {
  assertEquals(marimoEngineDiscovery.claimsLanguage("python"), false);
  assertEquals(marimoEngineDiscovery.claimsLanguage("r", "marimo"), false);
});

Deno.test("claims files containing marimo fences", () => {
  for (
    const source of [
      "```{markdown .marimo}\n# Reactive heading\n```",
      "```python {.marimo}\nvalue = 1\n```",
      "```{marimo}\nvalue = 1\n```",
      "```{.marimo}\nvalue = 1\n```",
    ]
  ) {
    withTempFile(".qmd", source, (file) => {
      assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), true);
    });
  }
});

Deno.test("requires marimo to be a complete class name", () => {
  withTempFile(
    ".qmd",
    "```{python .marimo-example}\nvalue = 1\n```",
    (file) => {
      assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), false);
    },
  );
});

Deno.test("ignores marimo examples nested in an outer code fence", () => {
  const source = "````markdown\n```{python .marimo}\nvalue = 1\n```\n````";
  withTempFile(".qmd", source, (file) => {
    assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), false);
  });
});

Deno.test("ignores four-space-indented marimo examples", () => {
  const source = "    ```{python .marimo}\n    value = 1\n    ```";
  withTempFile(".qmd", source, (file) => {
    assertEquals(marimoEngineDiscovery.claimsFile(file, ".qmd"), false);
  });
});

Deno.test("does not claim unsupported file types", () => {
  withTempFile(".py", "```{python .marimo}\nvalue = 1\n```", (file) => {
    assertEquals(marimoEngineDiscovery.claimsFile(file, ".py"), false);
  });
});

function withTempFile(
  extension: string,
  contents: string,
  inspect: (file: string) => void,
): void {
  const directory = Deno.makeTempDirSync();
  const file = `${directory}/test${extension}`;
  try {
    Deno.writeTextFileSync(file, contents);
    inspect(file);
  } finally {
    Deno.removeSync(directory, { recursive: true });
  }
}
