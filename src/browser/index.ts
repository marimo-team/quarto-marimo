import { defineMarimoIslandElement } from "@marimo-team/mdx-marimo/bridge/element";
import { MARIMO_ELEMENT_NAME } from "../island-element.ts";

defineMarimoIslandElement({
  name: MARIMO_ELEMENT_NAME,
  host: "quarto",
  themeResolver: resolveQuartoTheme,
});

function resolveQuartoTheme(
  host: HTMLElement,
): "light" | "dark" | undefined {
  let element: Element | null = host;
  while (element) {
    if (element.classList.contains("quarto-dark")) return "dark";
    if (element.classList.contains("quarto-light")) return "light";
    element = element.parentElement;
  }
  return undefined;
}
