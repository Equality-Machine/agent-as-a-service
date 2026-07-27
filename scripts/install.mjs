#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CloudState } from "../src/cloud-state.mjs";
import { resolveInstallRole } from "../src/installer/roles.mjs";
import { installRunnerService } from "../src/runner-service.mjs";

const DEFAULT_CLOUD_URL =
  "https://aaas-agent-service.b4yesc4t.chatgpt.site";

function flag(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function isExecutable(file) {
  if (!file) return false;
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findOnPath(name) {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    const candidate = path.join(directory, name);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function firstWorkingExecutable(candidates) {
  const visited = new Set();
  for (const candidate of candidates) {
    if (!candidate || visited.has(candidate) || !isExecutable(candidate)) {
      continue;
    }
    visited.add(candidate);
    const probe = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      timeout: 5_000,
    });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

function detectClientBinaries() {
  const codexCandidates = [
    process.env.AAAS_CODEX_BIN,
    findOnPath("codex"),
    process.env.AAAS_CODEX_APP_BIN,
    "/Applications/ChatGPT.app/Contents/Resources/codex",
  ];
  const claudeCandidates = [
    process.env.AAAS_CLAUDE_BIN,
    findOnPath("claude"),
  ];
  return {
    codex: firstWorkingExecutable(codexCandidates),
    claude: firstWorkingExecutable(claudeCandidates),
  };
}

function selectedClients(choice, binaries) {
  if (choice === "none") return [];
  if (choice === "auto") {
    const detected = Object.entries(binaries)
      .filter(([, executable]) => executable)
      .map(([name]) => name);
    if (!detected.length) {
      throw new Error(
        "No working Codex or Claude Code executable was detected. Install or repair one, or set AAAS_CODEX_BIN / AAAS_CLAUDE_BIN.",
      );
    }
    return detected;
  }
  const requested = choice === "both" ? ["codex", "claude"] : [choice];
  for (const name of requested) {
    if (!binaries[name]) {
      throw new Error(
        `${name} was requested but no working executable was found. Set AAAS_${name.toUpperCase()}_BIN.`,
      );
    }
  }
  return requested;
}

async function installSkill(target, source) {
  await mkdir(path.dirname(target), { recursive: true });
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
}

function mcpEnvironment(cloudUrl, home, dataDir) {
  return [
    `AAAS_CLOUD_URL=${cloudUrl}`,
    `AAAS_HOME=${home}`,
    `AAAS_DATA_DIR=${dataDir}`,
  ];
}

async function installCodex({ executable, root, home, cloudUrl, dataDir }) {
  await installSkill(
    path.join(home, ".codex", "skills", "aaas"),
    path.join(root, "skills", "aaas"),
  );
  const existing = spawnSync(executable, ["mcp", "get", "aaas"], {
    stdio: "ignore",
  });
  if (existing.status === 0) run(executable, ["mcp", "remove", "aaas"]);
  const envArgs = mcpEnvironment(cloudUrl, home, dataDir).flatMap((entry) => [
    "--env",
    entry,
  ]);
  run(executable, [
    "mcp",
    "add",
    "aaas",
    ...envArgs,
    "--",
    process.execPath,
    path.join(root, "src", "aaas-mcp-stdio.mjs"),
  ]);
}

async function installClaude({ executable, root, home, cloudUrl, dataDir }) {
  await installSkill(
    path.join(home, ".claude", "skills", "aaas"),
    path.join(root, "skills", "aaas"),
  );
  const existing = spawnSync(executable, ["mcp", "get", "aaas"], {
    stdio: "ignore",
  });
  if (existing.status === 0) {
    run(executable, ["mcp", "remove", "--scope", "user", "aaas"]);
  }
  const envArgs = mcpEnvironment(cloudUrl, home, dataDir).flatMap((entry) => [
    "-e",
    entry,
  ]);
  run(executable, [
    "mcp",
    "add",
    "--scope",
    "user",
    "aaas",
    ...envArgs,
    "--",
    process.execPath,
    path.join(root, "src", "aaas-mcp-stdio.mjs"),
  ]);
}

if (hasFlag("help")) {
  process.stdout.write(`Usage:
  node scripts/install.mjs [--role consumer|publisher|runner]
    [--client auto|codex|claude|both|none]
    [--cloud-url URL] [--data-dir PATH] [--no-start]

consumer is the default and installs Skill + MCP without a Runner.
publisher additionally installs a persistent local Runner.
runner installs only a persistent server Runner.
`);
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = path.resolve(
  flag("home", process.env.AAAS_HOME ?? os.homedir()),
);
const cloudUrl = flag(
  "cloud-url",
  process.env.AAAS_CLOUD_URL ?? DEFAULT_CLOUD_URL,
);
const dataDir = path.resolve(
  flag("data-dir", process.env.AAAS_DATA_DIR ?? path.join(home, ".aaas")),
);
const role = resolveInstallRole(flag("role", "consumer"));
const clientChoice = flag("client", "auto");
if (!["auto", "codex", "claude", "both", "none"].includes(clientChoice)) {
  throw new Error("--client must be auto, codex, claude, both, or none");
}

const binaries = detectClientBinaries();
let clients = [];
if (role.installClients) {
  if (clientChoice === "none") {
    throw new Error("consumer and publisher roles require at least one client");
  }
  clients = selectedClients(clientChoice, binaries);
  for (const client of clients) {
    const input = {
      executable: binaries[client],
      root,
      home,
      cloudUrl,
      dataDir,
    };
    if (client === "codex") await installCodex(input);
    else await installClaude(input);
  }
}

let runner = null;
let service = null;
if (role.installRunner) {
  if (role.role === "runner" && !binaries.codex && !binaries.claude) {
    throw new Error(
      "A server Runner needs an authenticated Codex or Claude Code CLI. Install one or set AAAS_CODEX_BIN / AAAS_CLAUDE_BIN first.",
    );
  }
  const state = new CloudState(dataDir);
  const existing = await state.getRunner();
  if (existing && existing.kind !== role.runnerKind) {
    throw new Error(
      `Runner ${existing.id} is already ${existing.kind}; use a different --data-dir for ${role.runnerKind}.`,
    );
  }
  runner = await state.ensureRunner(role.runnerKind);
  service = await installRunnerService({
    root,
    cloudUrl,
    dataDir,
    home,
    start: !hasFlag("no-start"),
  });
}

if (role.role === "consumer") {
  process.stdout.write(
    `Installed role consumer for ${clients.join(" + ")}. No Runner was created.\n`,
  );
  process.stdout.write(
    "Restart the client. You can use another Agent immediately; publishing will offer to install a Runner on demand.\n",
  );
} else if (role.role === "publisher") {
  process.stdout.write(
    `Installed role publisher for ${clients.join(" + ")} with ${service.service} (${service.running ? "running" : "not started"}).\n`,
  );
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        role: "runner",
        runnerId: runner.id,
        runnerToken: runner.token,
        service: service.service,
        running: service.running,
        dataDir,
        note: "Keep runnerToken secret and pair it only with an authorized publisher.",
      },
      null,
      2,
    )}\n`,
  );
}
