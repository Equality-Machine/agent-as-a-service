import path from "node:path";

export const RUNNER_LABEL = "com.efflora.aaas-runner";
export const RUNNER_UNIT = "aaas-runner.service";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function quoteSystemd(value) {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("%", "%%")}"`;
}

export function runnerServiceLocation({
  platform,
  home,
  uid,
}) {
  if (platform === "darwin") {
    return {
      filePath: path.join(
        home,
        "Library",
        "LaunchAgents",
        `${RUNNER_LABEL}.plist`,
      ),
      manager: "launchd",
      service: `gui/${uid}/${RUNNER_LABEL}`,
    };
  }
  if (platform === "linux") {
    const system = uid === 0;
    return {
      filePath: system
        ? path.join("/etc/systemd/system", RUNNER_UNIT)
        : path.join(home, ".config", "systemd", "user", RUNNER_UNIT),
      manager: system ? "systemd-system" : "systemd-user",
      service: RUNNER_UNIT,
    };
  }
  throw new Error(`AaaS Runner service is not supported on ${platform}`);
}

export function buildRunnerServicePlan({
  platform,
  root,
  node,
  cloudUrl,
  dataDir,
  home,
  uid,
}) {
  const location = runnerServiceLocation({ platform, home, uid });
  const runner = path.join(root, "src", "cloud-runner-cli.mjs");
  if (platform === "darwin") {
    const domain = `gui/${uid}`;
    const document = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${RUNNER_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(node)}</string>
    <string>${escapeXml(runner)}</string>
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
    return {
      ...location,
      document,
      mode: 0o600,
      startCommands: [
        {
          command: "launchctl",
          args: ["bootout", location.service],
          ignoreFailure: true,
        },
        {
          command: "launchctl",
          args: ["bootstrap", domain, location.filePath],
        },
      ],
    };
  }

  const userArgs = uid === 0 ? [] : ["--user"];
  const document = `[Unit]
Description=Efflora Agent as a Service Runner
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
ExecStart=${quoteSystemd(node)} ${quoteSystemd(runner)}
WorkingDirectory=${quoteSystemd(root)}
Environment=${quoteSystemd(`AAAS_CLOUD_URL=${cloudUrl}`)}
Environment=${quoteSystemd(`AAAS_DATA_DIR=${dataDir}`)}
Restart=always
RestartSec=5

[Install]
WantedBy=${uid === 0 ? "multi-user.target" : "default.target"}
`;
  return {
    ...location,
    document,
    mode: 0o644,
    startCommands: [
      { command: "systemctl", args: [...userArgs, "daemon-reload"] },
      {
        command: "systemctl",
        args: [...userArgs, "enable", "--now", RUNNER_UNIT],
      },
    ],
  };
}
