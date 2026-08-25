import { dirname, fromFileUrl, join } from "path";

import type { QuartoAPI } from "@quarto/types";
import {
  type CompiledMarimoPage,
  isCompiledMarimoPage,
} from "@marimo-team/mdx-marimo/bridge/protocol";

const defaultCompilerTimeoutMs = 300_000;

export type StaticMarimoOutput = {
  type: "html" | "figure" | "para" | "plain" | "blockquote";
  value: string;
  displayCode: boolean;
  code: string;
  language: string;
};

export type MarimoExecution =
  | { kind: "page"; page: CompiledMarimoPage }
  | { kind: "static"; outputs: StaticMarimoOutput[] };

export async function runMarimoCompiler(
  quarto: QuartoAPI,
  options: {
    moduleUrl: string;
    source: string;
    input: string;
    interactive: boolean;
    globalEval: boolean;
    externalEnv: boolean;
    pyproject: string;
  },
): Promise<MarimoExecution> {
  const extensionDir = dirname(fromFileUrl(options.moduleUrl));
  const extractPath = join(extensionDir, "python", "extract.py");
  let command: string;
  let args: string[];
  let temporaryDirectory: string | undefined;

  if (options.externalEnv) {
    command = Deno.env.get("QUARTO_PYTHON") || "python";
    args = [extractPath];
  } else {
    command = "uv";
    const uvCommand = await constructUvCommand(
      quarto,
      extensionDir,
      options.pyproject,
    );
    temporaryDirectory = uvCommand.temporaryDirectory;
    args = [...uvCommand.args, extractPath];
  }
  args.push(
    options.input,
    options.interactive ? "html" : "static",
    options.globalEval ? "yes" : "no",
  );

  let output: string;
  try {
    output = await executeProcess(quarto, command, args, options.source);
  } finally {
    if (temporaryDirectory) {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  }
  const value: unknown = JSON.parse(output);
  if (isPageExecution(value) || isStaticExecution(value)) return value;
  throw new TypeError("marimo compiler returned an invalid execution payload");
}

async function constructUvCommand(
  quarto: QuartoAPI,
  extensionDir: string,
  pyproject: string,
): Promise<{ args: string[]; temporaryDirectory: string }> {
  const commandPath = join(extensionDir, "python", "command.py");
  const temporaryDirectory = await Deno.makeTempDir({
    prefix: "quarto-marimo-",
  });
  try {
    const output = await executeProcess(
      quarto,
      "uv",
      ["run", "--with", "marimo", commandPath],
      pyproject,
      compilerTimeoutMs(),
      {
        TEMP: temporaryDirectory,
        TMP: temporaryDirectory,
        TMPDIR: temporaryDirectory,
      },
    );
    const value: unknown = JSON.parse(output);
    if (
      !Array.isArray(value) ||
      !value.every((entry) => typeof entry === "string")
    ) {
      throw new TypeError(
        "marimo dependency resolver returned invalid uv arguments",
      );
    }
    return { args: value, temporaryDirectory };
  } catch (error: unknown) {
    await removeTemporaryDirectory(temporaryDirectory);
    throw error;
  }
}

export async function executeProcess(
  quarto: QuartoAPI,
  command: string,
  args: string[],
  stdin: string,
  timeoutMs = compilerTimeoutMs(),
  env?: Record<string, string>,
): Promise<string> {
  const child = new Deno.Command(command, {
    args,
    env,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const outputPromise = child.output();
  const writer = child.stdin.getWriter();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    try {
      child.kill("SIGTERM");
    } catch {
      // The process exited between the timeout and signal delivery.
    }
  }, timeoutMs);

  let output: Deno.CommandOutput;
  try {
    await writer.write(new TextEncoder().encode(stdin));
    await writer.close();
    output = await outputPromise;
  } catch (error: unknown) {
    if (!timedOut) throw error;
    await outputPromise.catch(() => undefined);
    throw timeoutError(command, args, timeoutMs);
  } finally {
    clearTimeout(timeout);
  }
  if (timedOut) throw timeoutError(command, args, timeoutMs);
  const stderr = new TextDecoder().decode(output.stderr);
  if (stderr) quarto.console.info(stderr.trim());
  if (!output.success) {
    throw new Error(
      stderr.trim() || `${command} exited with code ${output.code}`,
    );
  }
  return new TextDecoder().decode(output.stdout);
}

function compilerTimeoutMs(): number {
  const seconds = Number(
    Deno.env.get("QUARTO_MARIMO_TIMEOUT_SECONDS") ?? "",
  );
  return Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : defaultCompilerTimeoutMs;
}

function timeoutError(
  command: string,
  args: string[],
  timeoutMs: number,
): Error {
  return new Error(
    `marimo compilation timed out after ${timeoutMs / 1000}s while running ${
      [command, ...args].join(" ")
    }`,
  );
}

async function removeTemporaryDirectory(path: string): Promise<void> {
  await Deno.remove(path, { recursive: true }).catch(() => undefined);
}

function isPageExecution(
  value: unknown,
): value is { kind: "page"; page: CompiledMarimoPage } {
  return (
    isRecord(value) &&
    value.kind === "page" &&
    isCompiledMarimoPage(value.page)
  );
}

function isStaticExecution(
  value: unknown,
): value is { kind: "static"; outputs: StaticMarimoOutput[] } {
  return (
    isRecord(value) &&
    value.kind === "static" &&
    Array.isArray(value.outputs) &&
    value.outputs.every(isStaticOutput)
  );
}

function isStaticOutput(value: unknown): value is StaticMarimoOutput {
  return (
    isRecord(value) &&
    (value.type === "html" ||
      value.type === "figure" ||
      value.type === "para" ||
      value.type === "plain" ||
      value.type === "blockquote") &&
    typeof value.value === "string" &&
    typeof value.displayCode === "boolean" &&
    typeof value.code === "string" &&
    typeof value.language === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
