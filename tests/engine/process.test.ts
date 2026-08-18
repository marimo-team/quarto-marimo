import { assertRejects } from "@std/assert";

import type { QuartoAPI } from "@quarto/types";

import { executeProcess } from "../../src/engine/process.ts";

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
