#!/usr/bin/env node
import os from "node:os";
import path from "node:path";

import { CloudState } from "./cloud-state.mjs";

function flag(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const dataDir = path.resolve(
  flag(
    "data-dir",
    process.env.AAAS_DATA_DIR ?? path.join(os.homedir(), ".aaas-cloud-runner"),
  ),
);
const state = new CloudState(dataDir);
const runner = await state.ensureRunner("cloud");
process.stdout.write(
  `${JSON.stringify(
    {
      runnerId: runner.id,
      runnerToken: runner.token,
      dataDir,
      note: "Keep runnerToken secret. Configure it only on the publishing client and this server.",
    },
    null,
    2,
  )}\n`,
);
