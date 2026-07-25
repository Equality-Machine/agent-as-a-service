#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function flag(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const cloudUrl = flag("cloud-url", process.env.AAAS_CLOUD_URL);
if (!cloudUrl) {
  process.stderr.write(
    "Usage: node scripts/install-runner.mjs --cloud-url https://YOUR-AAAS-SITE [--data-dir PATH]\n",
  );
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(flag("data-dir", path.join(os.homedir(), ".aaas")));
const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
const label = "com.efflora.aaas-runner";
const plist = path.join(launchAgentsDir, `${label}.plist`);
const domain = `gui/${process.getuid()}`;
const service = `${domain}/${label}`;
await mkdir(launchAgentsDir, { recursive: true });
await mkdir(dataDir, { recursive: true, mode: 0o700 });

const document = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(path.join(root, "src", "cloud-runner-cli.mjs"))}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(root)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AAAS_CLOUD_URL</key>
    <string>${escapeXml(cloudUrl)}</string>
    <key>AAAS_DATA_DIR</key>
    <string>${escapeXml(dataDir)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>StandardOutPath</key>
  <string>${escapeXml(path.join(dataDir, "runner.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(path.join(dataDir, "runner.error.log"))}</string>
</dict>
</plist>
`;

spawnSync("launchctl", ["bootout", service], { stdio: "ignore" });
await writeFile(plist, document, { mode: 0o600 });
const loaded = spawnSync("launchctl", ["bootstrap", domain, plist], {
  encoding: "utf8",
});
if (loaded.status !== 0) {
  throw new Error(
    loaded.stderr?.trim() || `launchctl bootstrap exited with ${loaded.status}`,
  );
}
process.stdout.write(
  `AaaS runner installed and started as ${label} for ${cloudUrl}\n`,
);
