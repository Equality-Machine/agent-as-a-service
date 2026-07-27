#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageEntries = [
  "package.json",
  "install.sh",
  "scripts",
  "skills",
  "src",
  "README.md",
  "SECURITY.md",
];

function valueFor(args, name, fallback = null) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}

function withoutFlag(args, name) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === `--${name}`) {
      index += 1;
      continue;
    }
    result.push(args[index]);
  }
  return result;
}

function printHelp() {
  process.stdout.write(`Agent as a Service

Usage:
  aaas [install] [--client auto|codex|claude|both]
  aaas publisher [--client auto|codex|claude|both]
  aaas runner [--client auto|codex|claude|both]

The default install adds only the AaaS Skill and MCP. It never installs a
Runner. Publishing your own Agent checks for a Runner and offers to install it.

Examples:
  npx -y @efflora/aaas
  npx -y github:Equality-Machine/agent-as-a-service
`);
}

async function materializeRuntime(installDir) {
  const targetRoot = path.resolve(installDir);
  const home = path.resolve(os.homedir());
  if (targetRoot === path.parse(targetRoot).root || targetRoot === home) {
    throw new Error(
      `Refusing unsafe --install-dir ${targetRoot}; choose a dedicated directory.`,
    );
  }
  if (targetRoot === sourceRoot) return targetRoot;

  await mkdir(targetRoot, { recursive: true });
  for (const entry of packageEntries) {
    const source = path.join(sourceRoot, entry);
    const target = path.join(targetRoot, entry);
    await rm(target, { recursive: true, force: true });
    await cp(source, target, { recursive: true, force: true });
  }
  return targetRoot;
}

const rawArgs = process.argv.slice(2);
if (rawArgs.includes("--help") || rawArgs.includes("-h") || rawArgs[0] === "help") {
  printHelp();
  process.exit(0);
}

const knownCommands = new Set(["install", "publisher", "runner", "mcp"]);
const command = knownCommands.has(rawArgs[0]) ? rawArgs[0] : "install";
let args = command === rawArgs[0] ? rawArgs.slice(1) : rawArgs;

if (command === "mcp") {
  await import("../src/aaas-mcp-stdio.mjs");
} else {
  const installDir = path.resolve(
    valueFor(
      args,
      "install-dir",
      process.env.AAAS_INSTALL_DIR ??
        path.join(os.homedir(), ".local", "share", "efflora-aaas"),
    ),
  );
  args = withoutFlag(args, "install-dir");

  const requestedRole =
    command === "publisher" ? "publisher" : command === "runner" ? "runner" : null;
  if (requestedRole && args.includes("--role")) {
    throw new Error(
      `Do not combine the ${command} command with --role; use one or the other.`,
    );
  }
  if (requestedRole) args.push("--role", requestedRole);

  const stableRoot = await materializeRuntime(installDir);
  const result = spawnSync(
    process.execPath,
    [path.join(stableRoot, "scripts", "install.mjs"), ...args],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exit(result.status ?? 1);
  }
}
