#!/usr/bin/env node
import os from "node:os";
import path from "node:path";

import { Publisher } from "./publisher.mjs";

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const cloudUrl = flag(
  "cloud-url",
  process.env.AAAS_CLOUD_URL ?? "http://127.0.0.1:3000",
);
const dataDir = path.resolve(
  flag(
    "data-dir",
    process.env.AAAS_DATA_DIR ?? path.join(os.homedir(), ".aaas"),
  ),
);
const name = flag("name", null);
if (!name) {
  process.stderr.write(
    "Usage: node src/publish-cli.mjs --name NAME [--description TEXT] [--execution-mode local|cloud]\n",
  );
  process.exit(2);
}

const publisher = new Publisher({
  dataDir,
  cloudUrl,
  publisherToken: process.env.AAAS_PUBLISH_TOKEN ?? null,
});
const agent = await publisher.publishCurrent({
  name,
  description: flag("description", ""),
  executionMode: flag("execution-mode", "local"),
  provider: flag("provider", undefined),
  sessionId: flag("session-id", undefined),
});
process.stdout.write(`${JSON.stringify(agent, null, 2)}\n`);
