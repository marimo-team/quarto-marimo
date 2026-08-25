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
