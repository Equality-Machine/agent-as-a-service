#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installRunnerService } from "../src/runner-service.mjs";

function flag(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

if (hasFlag("help")) {
  process.stdout.write(`Usage:
  node scripts/install-runner.mjs --cloud-url URL [--data-dir PATH] [--no-start]

Installs an AaaS Runner as a macOS LaunchAgent or Linux systemd service.
`);
  process.exit(0);
}

const cloudUrl = flag("cloud-url", process.env.AAAS_CLOUD_URL);
if (!cloudUrl) {
  process.stderr.write(
    "Usage: node scripts/install-runner.mjs --cloud-url https://YOUR-AAAS-SITE [--data-dir PATH]\n",
  );
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = path.resolve(process.env.AAAS_HOME ?? os.homedir());
const dataDir = path.resolve(
  flag("data-dir", process.env.AAAS_DATA_DIR ?? path.join(home, ".aaas")),
);
const result = await installRunnerService({
  root,
  cloudUrl,
  dataDir,
  home,
  start: !hasFlag("no-start"),
});
process.stdout.write(
  `AaaS Runner installed as ${result.service} (${result.running ? "running" : "not started"}).\n`,
);
