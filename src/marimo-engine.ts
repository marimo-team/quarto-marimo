/*
 * marimo-engine.ts
 *
 * Quarto external engine for marimo
 */

import { fromFileUrl, join, dirname } from "path";
import { delay } from "https://deno.land/std@0.224.0/async/delay.ts";

import type {
  DependenciesOptions,
  DependenciesResult,
  ExecuteOptions,
  ExecuteResult,
  ExecutionEngineDiscovery,
  ExecutionTarget,
  ExecutionEngineInstance,
  MappedString,
  PandocIncludes,
  PostProcessOptions,
  EngineProjectContext,
  QuartoAPI,
  QuartoMdCell,
} from "@quarto/types";

import { MARIMO_CELL_REGEX } from "../lib/cell-execution-regex.ts";

let quarto: QuartoAPI;

// Type for marimo cell output from extract.py
interface MarimoOutput {
  type: "html" | "figure" | "para" | "blockquote";
  value: string;
  display_code: boolean;
  reactive: boolean;
  code: string;
}

// Type for marimo execution result from extract.py
interface MarimoExecutionResult {
  header: string;
  outputs: MarimoOutput[];
  count: number;
}

// Helper function to execute external processes
async function executePython(
  command: string,
  args: string[] = [],
  stdin: string = ""
): Promise<string> {
  const cmd = new Deno.Command(command, {
    args: args,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const process = cmd.spawn();

  // Input handling
  if (stdin) {
    const writer = process.stdin.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(stdin));
    await writer.close();
  } else {
    process.stdin.close();
  }

  // Wait for process to complete
  const output = await process.output();

  const decoder = new TextDecoder();

  // Log stderr if present
  const stderr = decoder.decode(output.stderr);
  if (stderr) {
    quarto.console.info(`Subprocess stderr: ${stderr}`);
  }

  // Handle errors
  if (!output.success) {
    throw new Error(`Process execution failed: ${stderr}`);
  }

  // Return output
  return decoder.decode(output.stdout);
}

// Construct UV command for dependencies
async function constructUvCommand(header: string): Promise<string[]> {
  // Get the directory of the current module
  const currentDir = dirname(fromFileUrl(import.meta.url));

  // Create a platform-appropriate path to the script
  const scriptPath = join(currentDir, "command.py");

  // Run uv with correct arguments (matching the Lua implementation)
  const result = await executePython(
    "uv",
    ["run", "--with", "marimo", scriptPath],
    header
  );

  return JSON.parse(result);
}

// Check if a cell is a marimo code block
function isMarimoCell(cell: QuartoMdCell): boolean {
  if (typeof cell.cell_type !== "object" || !("language" in cell.cell_type)) {
    return false;
  }
  const lang = cell.cell_type.language;
  // Handle {python.marimo} syntax (quarto parses as language "python.marimo")
  if (lang === "python.marimo") {
    return true;
  }
  // Handle {python .marimo} and legacy python {.marimo} syntax
  if (lang === "python") {
    const firstLine = cell.sourceVerbatim.value.split('\n')[0] || '';
    return /\.marimo/.test(firstLine);
  }
  return false;
}

// Convert HTML to markdown using pandoc (for PDF output)
async function htmlToMarkdown(html: string): Promise<string> {
  const result = await quarto.system.pandoc(
    ["-f", "html", "-t", "markdown"],
    html
  );
  if (!result.success) {
    quarto.console.warning(`Pandoc conversion failed: ${result.stderr}`);
    return html; // Fall back to original HTML
  }
  return result.stdout || "";
}

// Render a single marimo output to markdown
async function renderOutput(
  output: MarimoOutput,
  mimeSensitive: boolean
): Promise<string> {
  let result = "";

  // Add code block if display_code is true
  if (output.display_code && output.code) {
    result += "```python\n" + output.code + "\n```\n\n";
  }

  // Render based on output type and format
  if (!mimeSensitive) {
    // HTML output - wrap everything in raw HTML blocks
    if (output.value) {
      result += "```{=html}\n" + output.value + "\n```\n\n";
    }
  } else {
    // PDF/LaTeX output - handle based on type
    switch (output.type) {
      case "figure":
        if (output.value) {
          result += `![Generated Figure](${output.value})\n\n`;
        }
        break;

      case "para":
        if (output.value) {
          result += output.value + "\n\n";
        }
        break;

      case "blockquote":
        if (output.value) {
          result += "> " + output.value + "\n\n";
        }
        break;

      case "html":
      default:
        if (output.value) {
          // Check if HTML contains a table - if so, use raw HTML block
          if (/<table[\s>]/i.test(output.value)) {
            result += "```{=html}\n" + output.value + "\n```\n\n";
          } else {
            // Convert HTML to markdown using pandoc
            const markdown = await htmlToMarkdown(output.value);
            result += markdown + "\n\n";
          }
        }
        break;
    }
  }

  return result;
}

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

  claimsFile: (_file: string, _ext: string) => {
    return false; // Don't claim files automatically
  },

  claimsLanguage: (language: string, firstClass?: string): boolean | number => {
    // Claim {python .marimo} with priority 2 (overrides Jupyter's fallback)
    if (language === "python" && firstClass === "marimo") {
      return 2;
    }
    // Claim {python.marimo} with priority 1 (no competition for this language)
    if (language === "python.marimo") {
      return 1;
    }
    return false; // Don't claim other python blocks
  },

  canFreeze: false,

  generatesFigures: true,

  checkInstallation: async () => {
    await quarto.console.withSpinner(
      { message: "Checking Marimo installation..." },
      async () => {
        await delay(2000);
      },
    );
  },

  launch: (context: EngineProjectContext): ExecutionEngineInstance => {
    return {
      name: marimoEngineDiscovery.name,
      canFreeze: marimoEngineDiscovery.canFreeze,

      markdownForFile(file: string): Promise<MappedString> {
        return Promise.resolve(quarto.mappedString.fromFile(file));
      },

      target: (
        file: string,
        _quiet?: boolean,
        markdown?: MappedString
      ): Promise<ExecutionTarget | undefined> => {
        const md = markdown ?? quarto.mappedString.fromFile(file);
        const metadata = quarto.markdownRegex.extractYaml(md.value);
        return Promise.resolve({
          source: file,
          input: file,
          markdown: md,
          metadata,
        });
      },

      partitionedMarkdown: (file: string) => {
        return Promise.resolve(
          quarto.markdownRegex.partition(Deno.readTextFileSync(file))
        );
      },

      execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { target, format } = options;
        const markdown = target.markdown.value;

        // Determine MIME sensitivity
        const outputFormat = format.pandoc.to || "html";
        const mimeSensitive = outputFormat === "pdf" || outputFormat === "latex";

        // Setup environment based on metadata
        const useExternalEnv = target.metadata["external-env"] === true;
        const pyprojectConfig = target.metadata["pyproject"];

        try {
          // Get platform-appropriate paths
          const currentDir = dirname(fromFileUrl(import.meta.url));
          const extractPath = join(currentDir, "extract.py");

          // Build command based on environment mode
          let command: string;
          let args: string[];

          if (useExternalEnv) {
            command = "python";
            args = [extractPath];
          } else {
            // Get UV command with dependencies
            const header = pyprojectConfig ? String(pyprojectConfig) : "";
            const uvFlags = await constructUvCommand(header);
            command = "uv";
            args = [...uvFlags, extractPath];
          }

          // Add file and MIME sensitivity arguments
          args.push(target.input, mimeSensitive ? "yes" : "no");

          // Log the command being run
          quarto.console.info(`Running: ${command} ${args.join(" ")}`);

          // Execute Python script to get cell outputs
          const result = await executePython(command, args, markdown);
          const marimoExecution: MarimoExecutionResult = JSON.parse(result);

          // Break markdown into cells using custom regex for marimo syntax
          const chunks = await quarto.markdownRegex.breakQuartoMd(
            target.markdown,
            false,             // validate
            false,             // lenient
            MARIMO_CELL_REGEX  // custom regex for {marimo} and python {.marimo}
          );

          // Process each cell, replacing marimo cells with outputs
          const processedCells: string[] = [];
          let marimoIndex = 0;

          for (const cell of chunks.cells) {
            if (isMarimoCell(cell)) {
              // Replace marimo cell with rendered output
              if (marimoIndex < marimoExecution.outputs.length) {
                const output = marimoExecution.outputs[marimoIndex];
                const rendered = await renderOutput(output, mimeSensitive);
                processedCells.push(rendered);
              } else {
                quarto.console.warning(
                  `Marimo cell ${marimoIndex} has no corresponding output`
                );
                processedCells.push(cell.sourceVerbatim.value);
              }
              marimoIndex++;
            } else {
              // Pass non-marimo cells through unchanged
              processedCells.push(cell.sourceVerbatim.value);
            }
          }

          // Verify we consumed all outputs
          if (marimoIndex !== marimoExecution.count) {
            quarto.console.warning(
              `Expected ${marimoExecution.count} marimo cells, found ${marimoIndex}`
            );
          }

          const processedMarkdown = processedCells.join("");

          // Setup includes for HTML formats
          const includes: PandocIncludes = {};
          if (outputFormat === "html" && marimoExecution.header) {
            // Write header content to a temp file (like Jupyter does)
            const tempFile = Deno.makeTempFileSync({
              dir: options.tempDir,
              prefix: "marimo-header-",
              suffix: ".html",
            });
            Deno.writeTextFileSync(tempFile, marimoExecution.header);
            includes["include-in-header"] = [tempFile];
          }

          return {
            engine: "marimo",
            markdown: processedMarkdown,
            supporting: [],
            filters: [],
            includes: Object.keys(includes).length > 0 ? includes : undefined,
          };
        } catch (error) {
          quarto.console.error(`Error executing marimo: ${error}`);
          return {
            engine: "marimo",
            markdown: `\`\`\`\nError executing marimo: ${
              (error as Error).message
            }\n\`\`\`\n\n${markdown}`,
            supporting: [],
            filters: [],
          };
        }
      },

      dependencies: (_options: DependenciesOptions): Promise<DependenciesResult> => {
        return Promise.resolve({
          includes: {},
        });
      },

      postprocess: (_options: PostProcessOptions): Promise<void> =>
        Promise.resolve(),
    };
  },
};

export default marimoEngineDiscovery;
