#!/usr/bin/env node
"use strict";
// Standalone entry: `node backend/cli.js --port 8780` (replacement for `python3 server.py`).

const { startServer } = require("./server");

function parsePort(argv) {
  const idx = argv.indexOf("--port");
  if (idx >= 0 && argv[idx + 1]) return Number.parseInt(argv[idx + 1], 10);
  const eq = argv.find((a) => a.startsWith("--port="));
  if (eq) return Number.parseInt(eq.slice(7), 10);
  return 8780;
}

(async () => {
  const port = parsePort(process.argv.slice(2));
  try {
    const { manager } = require("./sources/manager");
    console.log(`Loaded music source plugins: ${manager.listSources().map((s) => s.name).join(", ")}`);
  } catch (err) {
    console.warn("Source plugins failed to load:", err.message);
  }
  const { url } = await startServer({ port });
  console.log(`Echo player ready at ${url}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
