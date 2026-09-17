import { assertEquals, assertRejects } from "@std/assert";

import type { QuartoAPI } from "@quarto/types";

import { executeProcess, runMarimoCompiler } from "../../src/engine/process.ts";

Deno.test({
  name: "external environments use QUARTO_PYTHON",
  ignore: Deno.build.os === "windows",
  async fn() {
    const command = await Deno.makeTempFile();
    const previous = Deno.env.get("QUARTO_PYTHON");
    try {
      await Deno.writeTextFile(
        command,
        '#!/bin/sh\nprintf \'%s\\n\' \'{"kind":"static","outputs":[]}\'\n',
      );
      await Deno.chmod(command, 0o755);
      Deno.env.set("QUARTO_PYTHON", command);

      const quarto = {
        console: { info: () => {} },
      } as unknown as QuartoAPI;
      const result = await runMarimoCompiler(quarto, {
        moduleUrl: import.meta.url,
        source: "",
        input: "page.qmd",
        interactive: false,
        globalEval: true,
        externalEnv: true,
        pyproject: "",
      });

      assertEquals(result, { kind: "static", outputs: [] });
    } finally {
      if (previous === undefined) {
        Deno.env.delete("QUARTO_PYTHON");
      } else {
        Deno.env.set("QUARTO_PYTHON", previous);
      }
      await Deno.remove(command);
    }
  },
});

Deno.test("compiler processes stop at the configured timeout", async () => {
  const quarto = {
    console: { info: () => {} },
  } as unknown as QuartoAPI;

  await assertRejects(
    () =>
      executeProcess(
        quarto,
        Deno.execPath(),
        ["eval", "setInterval(() => {}, 1000)"],
        "",
        25,
      ),
    Error,
    "marimo compilation timed out",
  );
});

Deno.test({
  name: "compiler processes run Python in UTF-8 mode and exchange UTF-8 bytes",
  ignore: Deno.build.os === "windows",
  async fn() {
    const command = await Deno.makeTempFile();
    try {
      // Echo the UTF-8 controls and the raw stdin bytes back as a payload so
      // the test observes exactly what a Python child would see.
      await Deno.writeTextFile(
        command,
        '#!/bin/sh\ninput=$(cat)\nprintf \'{"env":"%s","stdin":"%s"}\' "$PYTHONUTF8:$PYTHONIOENCODING" "$input"\n',
      );
      await Deno.chmod(command, 0o755);

      const quarto = {
        console: { info: () => {} },
      } as unknown as QuartoAPI;
      const output = await executeProcess(
        quarto,
        command,
        [],
        "こんにちわ 日本語",
      );

      assertEquals(JSON.parse(output), {
        env: "1:utf-8",
        stdin: "こんにちわ 日本語",
      });
    } finally {
      await Deno.remove(command);
    }
  },
});
