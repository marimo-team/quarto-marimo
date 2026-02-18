/*
 * Mock types for @quarto/types
 *
 * Minimal interfaces matching what src/marimo-engine.ts imports,
 * so tests can run without the Quarto runtime.
 */

export interface MappedString {
  value: string;
}

export interface PandocIncludes {
  [key: string]: string[];
}

export interface ExecuteOptions {
  target: ExecutionTarget;
  format: { pandoc: { to?: string } };
  tempDir: string;
}

export interface ExecuteResult {
  engine: string;
  markdown: string;
  supporting: string[];
  filters: string[];
  includes?: PandocIncludes;
}

export interface ExecutionTarget {
  source: string;
  input: string;
  markdown: MappedString;
  metadata: Record<string, unknown>;
}

export interface ExecutionEngineInstance {
  name: string;
  canFreeze: boolean;
  markdownForFile(file: string): Promise<MappedString>;
  target(
    file: string,
    quiet?: boolean,
    markdown?: MappedString,
  ): Promise<ExecutionTarget | undefined>;
  partitionedMarkdown(file: string): Promise<unknown>;
  execute(options: ExecuteOptions): Promise<ExecuteResult>;
  dependencies(options: DependenciesOptions): Promise<DependenciesResult>;
  postprocess(options: PostProcessOptions): Promise<void>;
}

export interface EngineProjectContext {
  [key: string]: unknown;
}

export interface QuartoMdCell {
  cell_type:
    | { language: string }
    | string;
  sourceVerbatim: MappedString;
}

export interface QuartoAPI {
  console: {
    info(msg: string): void;
    warning(msg: string): void;
    error(msg: string): void;
    withSpinner(
      opts: { message: string },
      fn: () => Promise<void>,
    ): Promise<void>;
  };
  system: {
    pandoc(
      args: string[],
      input: string,
    ): Promise<{ success: boolean; stdout?: string; stderr?: string }>;
  };
  mappedString: {
    fromFile(file: string): MappedString;
  };
  markdownRegex: {
    extractYaml(value: string): Record<string, unknown>;
    partition(text: string): unknown;
    breakQuartoMd(
      markdown: MappedString,
      validate: boolean,
      lenient: boolean,
      regex?: RegExp,
    ): Promise<{ cells: QuartoMdCell[] }>;
  };
}

export interface ExecutionEngineDiscovery {
  init(quartoAPI: QuartoAPI): void;
  name: string;
  defaultExt: string;
  defaultYaml(): string[];
  defaultContent(): string[];
  validExtensions(): string[];
  claimsFile(file: string, ext: string): boolean;
  claimsLanguage(language: string, firstClass?: string): boolean | number;
  canFreeze: boolean;
  generatesFigures: boolean;
  checkInstallation(): Promise<void>;
  launch(context: EngineProjectContext): ExecutionEngineInstance;
}

export interface DependenciesOptions {
  [key: string]: unknown;
}

export interface DependenciesResult {
  includes: PandocIncludes;
}

export interface PostProcessOptions {
  [key: string]: unknown;
}
