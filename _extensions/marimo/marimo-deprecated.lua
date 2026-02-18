-- Deprecated: The marimo Lua filter has been replaced by an engine extension.
-- This stub exists for backwards compatibility with projects that still have
-- `filters: marimo-team/marimo` in their YAML frontmatter.

function Pandoc(doc)
  quarto.log.warning(
    "\n" ..
    "========================================================\n" ..
    "DEPRECATION WARNING: `filters: marimo-team/marimo` is\n" ..
    "no longer needed. The marimo engine extension now\n" ..
    "auto-detects `{python .marimo}` code blocks.\n" ..
    "\n" ..
    "Please remove the `filters:` line from your YAML\n" ..
    "frontmatter. This compatibility shim will be removed\n" ..
    "in a future release.\n" ..
    "========================================================"
  )
  return doc
end
