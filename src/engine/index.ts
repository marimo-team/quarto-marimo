import { dirname, fromFileUrl } from "path";

import type {
  CheckConfiguration,
  DependenciesOptions,
  DependenciesResult,
  EngineProjectContext,
  ExecuteOptions,
  ExecuteResult,
  ExecutionEngineDiscovery,
  ExecutionEngineInstance,
  ExecutionTarget,
  MappedString,
  PandocIncludes,
  PostProcessOptions,
  QuartoAPI,
} from "@quarto/types";

import {
  containsMarimoFence,
  isMarimoCell,
  MARIMO_CELL_REGEX,
} from "./authoring.ts";
import { writeBrowserHeader } from "./browser-assets.ts";
import {
  projectInteractivePage,
  projectStaticPage,
  validateProjectionCount,
} from "./projection.ts";
import { runMarimoCompiler } from "./process.ts";

let quarto: QuartoAPI;

const marimoEngineDiscovery: ExecutionEngineDiscovery = {
  init: (quartoAPI: QuartoAPI) => {
    quarto = quartoAPI;
  },

  name: "marimo",
  defaultExt: ".qmd",
  defaultYaml: () => ["format: html", "engine: marimo"],
  defaultContent: () => [
    "```{python .marimo}",
    "import marimo as mo",
    "slider = mo.ui.slider(1, 10, 1)",
    "slider",
    "```",
  ],
  validExtensions: () => [".qmd", ".md"],

  claimsFile: (file: string, extension: string) => {
    if (![".qmd", ".md"].includes(extension.toLowerCase())) return false;
    try {
      return containsMarimoFence(Deno.readTextFileSync(file));
    } catch {
      return false;
    }
  },

  claimsLanguage: (language: string, firstClass?: string): boolean | number => {
    if (
      (language === "python" || language === "sql" ||
        language === "markdown") &&
      firstClass === "marimo"
    ) {
      return 2;
    }
    if (
      language === "python.marimo" ||
      language === "sql.marimo" ||
      language === "markdown.marimo" ||
      language === "marimo"
    ) {
      return 1;
    }
    return false;
  },

  canFreeze: false,
  generatesFigures: true,

  checkInstallation: async (configuration: CheckConfiguration) => {
    const report: Record<string, unknown> = {};
    if (configuration.jsonResult) {
      const render = (configuration.jsonResult.render ??= {}) as Record<
        string,
        unknown
      >;
      render.marimo = report;
    }
    const checkRender = async () => {
      const result = await quarto.system.checkRender({
        content: "```{python .marimo}\n1 + 1\n```\n",
        language: "python",
        services: configuration.services,
      });
      if (result.error) {
        if (configuration.jsonResult) {
          report.error = result.error.message;
          return;
        }
        throw result.error;
      }
      report.ok = true;
    };
    if (configuration.jsonResult) {
      await checkRender();
    } else {
      const message = "Checking marimo engine render...";
      await quarto.console.withSpinner(
        { message, doneMessage: `${message}OK\n` },
        checkRender,
      );
    }
  },

  launch: (_context: EngineProjectContext): ExecutionEngineInstance => ({
    name: marimoEngineDiscovery.name,
    canFreeze: marimoEngineDiscovery.canFreeze,

    markdownForFile(file: string): Promise<MappedString> {
      return Promise.resolve(quarto.mappedString.fromFile(file));
    },

    target: (
      file: string,
      _quiet?: boolean,
      markdown?: MappedString,
    ): Promise<ExecutionTarget | undefined> => {
      const source = markdown ?? quarto.mappedString.fromFile(file);
      return Promise.resolve({
        source: file,
        input: file,
        markdown: source,
        metadata: quarto.markdownRegex.extractYaml(source.value),
      });
    },

    partitionedMarkdown: (file: string) =>
      Promise.resolve(
        quarto.markdownRegex.partition(Deno.readTextFileSync(file)),
      ),

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
      const interactive = quarto.format.isHtmlCompatible(options.format);
      const execution = await quarto.console.withSpinner(
        { message: "Executing marimo cells..." },
        async () =>
          await runMarimoCompiler(quarto, {
            moduleUrl: import.meta.url,
            source: options.target.markdown.value,
            input: options.target.input,
            interactive,
            globalEval: options.target.metadata.eval !== false,
            externalEnv: options.target.metadata["external-env"] === true,
            pyproject: String(options.target.metadata.pyproject ?? ""),
          }),
      );
      const chunks = await quarto.markdownRegex.breakQuartoMd(
        options.target.markdown,
        false,
        false,
        MARIMO_CELL_REGEX,
      );
      const marimoCells = chunks.cells.filter(isMarimoCell);
      const projected = execution.kind === "page"
        ? projectInteractivePage(execution.page)
        : await projectStaticPage(execution.outputs, htmlToMarkdown);
      validateProjectionCount(projected, marimoCells.length);

      let index = 0;
      const markdown = chunks.cells
        .map((cell) =>
          isMarimoCell(cell)
            ? projected[index++] ?? ""
            : cell.sourceVerbatim.value
        )
        .join("");
      const includes: PandocIncludes = {};
      if (execution.kind === "page") {
        const extensionDir = dirname(fromFileUrl(import.meta.url));
        includes["include-in-header"] = [
          writeBrowserHeader(extensionDir, options.tempDir),
        ];
      }
      return {
        engine: "marimo",
        markdown,
        supporting: [],
        filters: [],
        includes,
      };
    },

    dependencies: (
      _options: DependenciesOptions,
    ): Promise<DependenciesResult> => Promise.resolve({ includes: {} }),

    postprocess: (_options: PostProcessOptions): Promise<void> =>
      Promise.resolve(),
  }),
};

async function htmlToMarkdown(html: string): Promise<string> {
  const result = await quarto.system.pandoc(
    ["-f", "html", "-t", "markdown"],
    html,
  );
  if (!result.success) {
    throw new Error(result.stderr || "Pandoc could not convert marimo HTML");
  }
  return result.stdout || "";
}

export default marimoEngineDiscovery;
