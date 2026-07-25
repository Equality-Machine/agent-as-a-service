#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function flag(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

async function installSkill(target, source) {
  await mkdir(path.dirname(target), { recursive: true });
  await rm(target, { recursive: true, force: true });
  await symlink(source, target, "dir");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cloudUrl = flag("cloud-url");
if (!cloudUrl) {
  process.stderr.write(
    "Usage: node scripts/install.mjs --cloud-url https://YOUR-AAAS-SITE [--client codex|claude|both]\n",
  );
  process.exit(2);
}
const client = flag("client", "both");
const cloudRunnerId = flag("cloud-runner-id");
const cloudRunnerToken = flag("cloud-runner-token");
if (!["codex", "claude", "both"].includes(client)) {
  throw new Error("--client must be codex, claude, or both");
}
const skillSource = path.join(root, "skills", "aaas");
const server = path.join(root, "src", "aaas-mcp-stdio.mjs");

if (client === "codex" || client === "both") {
  await installSkill(path.join(os.homedir(), ".codex", "skills", "aaas"), skillSource);
  const codex =
    process.env.AAAS_CODEX_BIN ??
    "/Applications/ChatGPT.app/Contents/Resources/codex";
  const existing = spawnSync(codex, ["mcp", "get", "aaas"], { stdio: "ignore" });
  if (existing.status === 0) run(codex, ["mcp", "remove", "aaas"]);
  run(codex, [
    "mcp",
    "add",
    "aaas",
    "--env",
    `AAAS_CLOUD_URL=${cloudUrl}`,
    ...(cloudRunnerId
      ? ["--env", `AAAS_CLOUD_RUNNER_ID=${cloudRunnerId}`]
      : []),
    ...(cloudRunnerToken
      ? ["--env", `AAAS_CLOUD_RUNNER_TOKEN=${cloudRunnerToken}`]
      : []),
    "--",
    process.execPath,
    server,
  ]);
}

if (client === "claude" || client === "both") {
  await installSkill(path.join(os.homedir(), ".claude", "skills", "aaas"), skillSource);
  const existing = spawnSync("claude", ["mcp", "get", "aaas"], { stdio: "ignore" });
  if (existing.status === 0) run("claude", ["mcp", "remove", "--scope", "user", "aaas"]);
  run("claude", [
    "mcp",
    "add",
    "--scope",
    "user",
    "aaas",
    "-e",
    `AAAS_CLOUD_URL=${cloudUrl}`,
    ...(cloudRunnerId
      ? ["-e", `AAAS_CLOUD_RUNNER_ID=${cloudRunnerId}`]
      : []),
    ...(cloudRunnerToken
      ? ["-e", `AAAS_CLOUD_RUNNER_TOKEN=${cloudRunnerToken}`]
      : []),
    "--",
    process.execPath,
    server,
  ]);
}

process.stdout.write(
  `AaaS installed for ${client}. Restart the client, then say “发布当前对话”.\n`,
);
