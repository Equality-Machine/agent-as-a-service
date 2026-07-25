#!/usr/bin/env node
import os from "node:os";
import path from "node:path";

import { ClaudeRuntime } from "./runtimes/claude.mjs";
import { CodexRuntime } from "./runtimes/codex.mjs";
import { RemoteRuntime } from "./runtimes/remote.mjs";
import { createAaasServer } from "./server.mjs";

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const command = process.argv[2] ?? "serve";
if (!["serve", "runner"].includes(command)) {
  process.stderr.write("Usage: node src/cli.mjs <serve|runner> [--host HOST] [--port PORT]\n");
  process.exit(2);
}

const host = flag("host", process.env.AAAS_HOST ?? "127.0.0.1");
const port = Number(flag("port", process.env.AAAS_PORT ?? (command === "runner" ? 8788 : 8787)));
const dataDir = path.resolve(
  flag("data-dir", process.env.AAAS_DATA_DIR ?? path.join(os.homedir(), ".aaas")),
);
const runnerToken = process.env.AAAS_RUNNER_TOKEN ?? null;
const runtimes = {
  claude: new ClaudeRuntime({
    executable: process.env.AAAS_CLAUDE_BIN ?? "claude",
    allowedTools: process.env.AAAS_CLAUDE_ALLOWED_TOOLS ?? "Read,Grep,Glob",
  }),
  codex: new CodexRuntime({
    executable:
      process.env.AAAS_CODEX_BIN ??
      "/Applications/ChatGPT.app/Contents/Resources/codex",
  }),
};
const app = createAaasServer({
  dataDir,
  runtimes,
  runnerToken,
  remoteRuntime: runnerToken ? new RemoteRuntime({ token: runnerToken }) : null,
  adminToken: process.env.AAAS_ADMIN_TOKEN ?? null,
  apiToken: process.env.AAAS_API_TOKEN ?? null,
});

await app.listen(port, host);
process.stdout.write(
  `${command === "runner" ? "AaaS runner" : "AaaS"} listening at http://${host}:${port}\n`,
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
