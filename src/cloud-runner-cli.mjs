#!/usr/bin/env node
import os from "node:os";
import path from "node:path";

import { CloudRunner } from "./runner-client.mjs";

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const dataDir = path.resolve(
  flag(
    "data-dir",
    process.env.AAAS_DATA_DIR ?? path.join(os.homedir(), ".aaas"),
  ),
);
const cloudUrl = flag(
  "cloud-url",
  process.env.AAAS_CLOUD_URL ?? "http://127.0.0.1:3000",
);
const runner = new CloudRunner({ dataDir, cloudUrl });
const abortController = new AbortController();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => abortController.abort());
}

process.stdout.write(`AaaS runner connected to ${cloudUrl}\n`);
await runner.run(abortController.signal);
