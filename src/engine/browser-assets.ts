import { join } from "path";

const EXTENSION_CONFIG = "_extension.yml";

export function writeBrowserHeader(
  extensionDir: string,
  tempDir: string,
): string {
  const version = extensionVersion(extensionDir);
  const assetsDir = join(extensionDir, "assets");
  const browser = Deno.readTextFileSync(
    join(assetsDir, `browser-v${version}.js`),
  )
    .replace(/<\/script/gi, "<\\/script");
  const styles = Deno.readTextFileSync(
    join(assetsDir, `islands-bridge-v${version}.css`),
  )
    .replace(/<\/style/gi, "<\\/style");
  const header = [
    `<style data-marimo-islands>${styles}</style>`,
    `<script type="module" data-marimo-islands>${browser}</script>`,
  ].join("\n");
  const path = Deno.makeTempFileSync({
    dir: tempDir,
    prefix: "marimo-header-",
    suffix: ".html",
  });
  Deno.writeTextFileSync(path, header);
  return path;
}

function extensionVersion(extensionDir: string): string {
  const config = Deno.readTextFileSync(join(extensionDir, EXTENSION_CONFIG));
  const match = config.match(/^version:\s*["']?([^"'\s#]+)["']?\s*$/m);
  if (!match) throw new Error("marimo extension version is missing");
  return match[1];
}
