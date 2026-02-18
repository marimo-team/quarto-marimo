// Loader shim — downloads the engine bundle from GitHub releases on first
// use and caches it locally so import.meta.url resolves to a file:// path.
const VERSION = "0.4.4";
const baseUrl = new URL(".", import.meta.url);
const bundleName = `marimo-engine-v${VERSION}.js`;
const bundlePath = new URL(bundleName, baseUrl);

let needsDownload = false;
try {
  await Deno.stat(bundlePath);
} catch {
  needsDownload = true;
}

if (needsDownload) {
  const releaseUrl =
    `https://github.com/marimo-team/quarto-marimo/releases/download/v${VERSION}/${bundleName}`;
  let resp;
  try {
    resp = await fetch(releaseUrl);
  } catch (e) {
    throw new Error(
      `Failed to download marimo engine v${VERSION}. ` +
        `Run \`make build\` locally to build the engine bundle.\n` +
        `  ${e.message}`,
    );
  }
  if (!resp.ok) {
    throw new Error(
      `Failed to download marimo engine v${VERSION} (HTTP ${resp.status}). ` +
        `Run \`make build\` locally to build the engine bundle.`,
    );
  }
  await Deno.writeTextFile(bundlePath, await resp.text());
}

const { default: engine } = await import(bundlePath.href);
export default engine;
