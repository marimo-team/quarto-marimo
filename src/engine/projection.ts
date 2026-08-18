import {
  type CompiledMarimoPage,
  encodePageCellPayload,
  type MarimoPageSerializedCellPayload,
  projectPageCellPayloads,
} from "@marimo-team/mdx-marimo/bridge/protocol";

import type { StaticMarimoOutput } from "./process.ts";
import { MARIMO_ELEMENT_NAME } from "../island-element.ts";

export function projectInteractivePage(page: CompiledMarimoPage): string[] {
  return projectPageCellPayloads(page).map((payload) =>
    payload ? rawHtml(renderIsland(payload)) : ""
  );
}

export async function projectStaticPage(
  outputs: StaticMarimoOutput[],
  htmlToMarkdown: (html: string) => Promise<string>,
): Promise<string[]> {
  return await Promise.all(
    outputs.map((output) => renderStaticOutput(output, htmlToMarkdown)),
  );
}

export function validateProjectionCount(
  projected: readonly unknown[],
  actualCellCount: number,
): void {
  if (projected.length !== actualCellCount) {
    throw new Error(
      `marimo compiler returned ${projected.length} cells for ${actualCellCount} source blocks`,
    );
  }
}

function renderIsland(payload: MarimoPageSerializedCellPayload): string {
  return [
    `<${MARIMO_ELEMENT_NAME}`,
    ` data-marimo-payload="${encodePageCellPayload(payload)}"`,
    ' data-marimo-payload-encoding="base64url"',
    ' data-marimo-theme-mode="auto"',
    `></${MARIMO_ELEMENT_NAME}>`,
  ].join("");
}

async function renderStaticOutput(
  output: StaticMarimoOutput,
  htmlToMarkdown: (html: string) => Promise<string>,
): Promise<string> {
  let result = "";
  if (output.displayCode && output.code) {
    result += fencedCode(output.code, output.language);
  }
  if (!output.value) return result;

  switch (output.type) {
    case "figure":
      return `${result}![Generated Figure](<${output.value}>)\n\n`;
    case "para":
      return `${result}${output.value}\n\n`;
    case "plain":
      return `${result}${fencedCode(output.value)}`;
    case "blockquote":
      return `${result}> ${output.value.replace(/\r?\n/g, "\n> ")}\n\n`;
    case "html":
      if (/<table[\s>]/i.test(output.value)) {
        return `${result}${rawHtml(output.value)}`;
      }
      return `${result}${await htmlToMarkdown(output.value)}\n\n`;
  }
}

function fencedCode(value: string, language = ""): string {
  const longestRun = Math.max(
    0,
    ...Array.from(value.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${language}\n${value}\n${fence}\n\n`;
}

function rawHtml(value: string): string {
  return fencedCode(value, "{=html}");
}
