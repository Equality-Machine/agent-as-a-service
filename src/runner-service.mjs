import { spawnSync } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildRunnerServicePlan,
  runnerServiceLocation,
} from "./installer/service-plan.mjs";

function run(command, args, { ignoreFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error && !ignoreFailure) throw result.error;
  if (result.status !== 0 && !ignoreFailure) {
    throw new Error(
      result.stderr?.trim() || `${command} exited with status ${result.status}`,
    );
  }
  return result;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function getRunnerServiceStatus({
  platform = process.platform,
  home = process.env.AAAS_HOME ?? os.homedir(),
  uid = process.getuid?.() ?? 0,
} = {}) {
  let location;
  try {
    location = runnerServiceLocation({ platform, home, uid });
  } catch {
    return { installed: false, running: false, platform };
  }
  const installed = await exists(location.filePath);
  if (!installed) return { installed: false, running: false, platform };

  const result =
    location.manager === "launchd"
      ? run("launchctl", ["print", location.service], { ignoreFailure: true })
      : run(
          "systemctl",
          [
            ...(location.manager === "systemd-user" ? ["--user"] : []),
            "is-active",
            "--quiet",
            location.service,
          ],
          { ignoreFailure: true },
        );
  return {
    installed: true,
    running: result.status === 0,
    platform,
  };
}

export async function installRunnerService({
  root,
  node = process.execPath,
  cloudUrl,
  dataDir,
  platform = process.platform,
  home = process.env.AAAS_HOME ?? os.homedir(),
  uid = process.getuid?.() ?? 0,
  start = true,
}) {
  const plan = buildRunnerServicePlan({
    platform,
    root: path.resolve(root),
    node: path.resolve(node),
    cloudUrl,
    dataDir: path.resolve(dataDir),
    home: path.resolve(home),
    uid,
  });
  await mkdir(path.dirname(plan.filePath), { recursive: true });
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await writeFile(plan.filePath, plan.document, { mode: plan.mode });
  if (start) {
    for (const command of plan.startCommands) {
      run(command.command, command.args, {
        ignoreFailure: command.ignoreFailure,
      });
    }
  }
  return {
    installed: true,
    running: start,
    platform,
    service: plan.service,
    filePath: plan.filePath,
  };
}
