import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";

import type {
  CompiledMarimoCell,
  CompiledMarimoPage,
} from "@marimo-team/mdx-marimo/bridge/protocol";

import {
  projectInteractivePage,
  projectStaticPage,
  validateProjectionCount,
} from "../../src/engine/projection.ts";

const options = {
  language: "python" as const,
  render: {
    source: false,
    output: true,
    include: true,
    editor: false,
    error: true,
    serverOutput: true,
  },
  execution: { enabled: true },
  marimo: { disabled: false, unparsable: false },
};

function cell(index: number): CompiledMarimoCell {
  return {
    index,
    html: `<marimo-island data-cell-id="${index}"></marimo-island>`,
    options,
    output: {
      mimetype: "text/plain",
      data: `output ${index}`,
      html: `<p>output ${index}</p>`,
    },
  };
}

function page(): CompiledMarimoPage {
  return {
    protocolVersion: 2,
    app: {
      id: "marimo-page",
      runtimeCellCount: 2,
      assets: { moduleScripts: [], links: [] },
    },
    cells: [cell(0), cell(1)],
    diagnostics: [],
  };
}

Deno.test("projects one app carrier followed by cell references", () => {
  const projected = projectInteractivePage(page());
  const first = decodePayload(projected[0]);
  const second = decodePayload(projected[1]);

  assertEquals(first.app?.id, "marimo-page");
  assertEquals(first.cell.index, 0);
  assertEquals(second.appId, "marimo-page");
  assertEquals(second.cell.index, 1);
  assertEquals("output" in first.cell, false);
  assertEquals("output" in second.cell, false);
});

Deno.test("preserves verbatim source and plain-text output", async () => {
  const projected = await projectStaticPage(
    [
      {
        type: "plain",
        value: "# Result\n*literal*",
        displayCode: true,
        code: 'value = "```"',
        language: "python",
      },
    ],
    (html) => Promise.resolve(html),
  );

  assertStringIncludes(projected[0], '````python\nvalue = "```"\n````');
  assertStringIncludes(projected[0], "```\n# Result\n*literal*\n```");
});

Deno.test("keeps multiline static errors in one blockquote", async () => {
  const [projected] = await projectStaticPage(
    [{
      type: "blockquote",
      value: "First line\nSecond line",
      displayCode: false,
      code: "",
      language: "python",
    }],
    (html) => Promise.resolve(html),
  );

  assertStringIncludes(projected, "> First line\n> Second line");
});

Deno.test("preserves Markdown characters in figure destinations", async () => {
  const [projected] = await projectStaticPage(
    [{
      type: "figure",
      value: "plots/result (final).png",
      displayCode: false,
      code: "",
      language: "python",
    }],
    (html) => Promise.resolve(html),
  );

  assertStringIncludes(
    projected,
    "![Generated Figure](<plots/result (final).png>)",
  );
});

Deno.test("uses a raw HTML fence longer than its content", async () => {
  const [projected] = await projectStaticPage(
    [{
      type: "html",
      value: "<table><tr><td>```</td></tr></table>",
      displayCode: false,
      code: "",
      language: "python",
    }],
    (html) => Promise.resolve(html),
  );

  assertStringIncludes(
    projected,
    "````{=html}\n<table><tr><td>```</td></tr></table>\n````",
  );
});

Deno.test("rejects mismatched compiler and source cell counts", () => {
  assertThrows(
    () => validateProjectionCount(["one"], 2),
    Error,
    "returned 1 cells for 2 source blocks",
  );
});

function decodePayload(markdown: string): {
  app?: { id: string };
  appId?: string;
  cell: { index: number; output?: unknown };
} {
  const match = markdown.match(/data-marimo-payload="([^"]+)"/);
  if (!match) throw new Error("missing marimo payload");
  const base64 = match[1].replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
