import { assert, assertEquals } from "@std/assert";
import { parseHTML } from "linkedom";
import type { MarimoIslandElement } from "@marimo-team/mdx-marimo/bridge/element";

Deno.test("browser adapter mounts the host element and follows Quarto theme", async () => {
  const { document, window } = parseHTML(
    "<html><head></head><body class='quarto-light'></body></html>",
  );
  const browser = window as Window & typeof globalThis;
  browser.matchMedia = () =>
    ({
      addEventListener: () => {},
      matches: false,
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
  Object.assign(globalThis, {
    customElements: browser.customElements,
    document,
    getComputedStyle: () => ({ colorScheme: "light" }),
    HTMLElement: browser.HTMLElement,
    HTMLTemplateElement: browser.HTMLTemplateElement,
    MutationObserver: browser.MutationObserver,
    Node: browser.Node,
    NodeFilter: { SHOW_ELEMENT: 1 },
    ShadowRoot: browser.ShadowRoot,
    window: browser,
  });

  await import("../../src/browser/index.ts");
  const island = document.createElement(
    "marimo-quarto-island",
  ) as MarimoIslandElement;
  document.body.append(island);
  island.payload = staticPayload();
  await Promise.resolve();

  assert(customElements.get("marimo-quarto-island"));
  assertEquals(island.textContent?.trim(), "Static output");
  assertEquals(island.dataset.marimoTheme, "light");

  document.body.classList.replace("quarto-light", "quarto-dark");
  await Promise.resolve();
  assertEquals(island.dataset.marimoTheme, "dark");
});

function staticPayload() {
  return {
    protocolVersion: 2 as const,
    app: null,
    cell: {
      index: 0,
      html: "<p>Static output</p>",
      options: {
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
      },
    },
  };
}
