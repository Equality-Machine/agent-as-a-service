import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { resolveInstallRole } from "../src/installer/roles.mjs";
import { buildRunnerServicePlan } from "../src/installer/service-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("consumer is the safe default and never installs a runner", () => {
  assert.deepEqual(resolveInstallRole(), {
    role: "consumer",
    installClients: true,
    installRunner: false,
    runnerKind: null,
  });
  assert.deepEqual(resolveInstallRole("publisher"), {
    role: "publisher",
    installClients: true,
    installRunner: true,
    runnerKind: "local",
  });
  assert.deepEqual(resolveInstallRole("runner"), {
    role: "runner",
    installClients: false,
    installRunner: true,
    runnerKind: "cloud",
  });
});

test("bootstrap help documents all three roles without requiring Node or Git", () => {
  const result = spawnSync("bash", [path.join(root, "install.sh"), "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /consumer.*default/i);
  assert.match(result.stdout, /publisher/i);
  assert.match(result.stdout, /runner/i);
});

test("consumer installation configures a client without creating a runner", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "aaas-installer-home-"));
  const fakeCodex = path.join(home, "codex");
  const log = path.join(home, "codex.log");
  await writeFile(
    fakeCodex,
    `#!/bin/sh
if [ "$1" = "mcp" ] && [ "$2" = "get" ]; then
  exit 1
fi
printf '%s\\n' "$*" >> "$AAAS_TEST_LOG"
`,
  );
  await chmod(fakeCodex, 0o755);

  const result = spawnSync(
    "bash",
    [
      path.join(root, "install.sh"),
      "--source-dir",
      root,
      "--role",
      "consumer",
      "--client",
      "codex",
      "--cloud-url",
      "https://aaas.example",
      "--data-dir",
      path.join(home, ".aaas"),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        HOME: home,
        AAAS_HOME: home,
        AAAS_CODEX_BIN: fakeCodex,
        AAAS_TEST_LOG: log,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /role consumer/i);
  assert.equal(
    (await lstat(path.join(home, ".codex", "skills", "aaas"))).isDirectory(),
    true,
  );
  assert.match(await readFile(log, "utf8"), /mcp add aaas/);
  await assert.rejects(
    () => lstat(path.join(home, ".aaas", "cloud-state.json")),
    /ENOENT/,
  );
});

test("the package CLI installs a stable Skill and MCP without a runner by default", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "aaas-npx-home-"));
  const installDir = path.join(home, ".local", "share", "efflora-aaas");
  const fakeCodex = path.join(home, "codex");
  const log = path.join(home, "codex.log");
  await writeFile(
    fakeCodex,
    `#!/bin/sh
if [ "$1" = "mcp" ] && [ "$2" = "get" ]; then
  exit 1
fi
printf '%s\\n' "$*" >> "$AAAS_TEST_LOG"
`,
  );
  await chmod(fakeCodex, 0o755);

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts", "aaas.mjs"),
      "--install-dir",
      installDir,
      "--client",
      "codex",
      "--cloud-url",
      "https://aaas.example",
      "--data-dir",
      path.join(home, ".aaas"),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        HOME: home,
        AAAS_HOME: home,
        AAAS_CODEX_BIN: fakeCodex,
        AAAS_TEST_LOG: log,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /role consumer/i);
  assert.equal(
    (await lstat(path.join(home, ".codex", "skills", "aaas"))).isDirectory(),
    true,
  );
  assert.equal(
    (await lstat(path.join(installDir, "src", "aaas-mcp-stdio.mjs"))).isFile(),
    true,
  );
  assert.match(
    await readFile(log, "utf8"),
    new RegExp(
      `mcp add aaas.*${installDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/src\\/aaas-mcp-stdio\\.mjs`,
    ),
  );
  await assert.rejects(
    () => lstat(path.join(home, ".aaas", "cloud-state.json")),
    /ENOENT/,
  );
});

test("the packed npm artifact is directly executable with npx", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "aaas-packed-npx-home-"));
  const packDir = path.join(home, "package");
  const installDir = path.join(home, "runtime");
  const fakeCodex = path.join(home, "codex");
  await mkdir(packDir, { recursive: true });
  await writeFile(
    fakeCodex,
    `#!/bin/sh
if [ "$1" = "mcp" ] && [ "$2" = "get" ]; then
  exit 1
fi
exit 0
`,
  );
  await chmod(fakeCodex, 0o755);

  const packed = spawnSync(
    "npm",
    ["pack", "--json", "--pack-destination", packDir],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  assert.equal(packed.status, 0, packed.stderr);
  const [{ filename }] = JSON.parse(packed.stdout);
  const tarball = path.join(packDir, filename);

  const result = spawnSync(
    "npx",
    [
      "--yes",
      "--package",
      tarball,
      "aaas",
      "--install-dir",
      installDir,
      "--client",
      "codex",
      "--cloud-url",
      "https://aaas.example",
      "--data-dir",
      path.join(home, ".aaas"),
    ],
    {
      cwd: home,
      env: {
        ...process.env,
        HOME: home,
        AAAS_HOME: home,
        AAAS_CODEX_BIN: fakeCodex,
      },
      encoding: "utf8",
      timeout: 120_000,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /role consumer/i);
  assert.equal(
    (await lstat(path.join(home, ".codex", "skills", "aaas"))).isDirectory(),
    true,
  );
  assert.equal(
    (await lstat(path.join(installDir, "src", "aaas-mcp-stdio.mjs"))).isFile(),
    true,
  );
  await assert.rejects(
    () => lstat(path.join(home, ".aaas", "cloud-state.json")),
    /ENOENT/,
  );
});

test("publisher installation enrolls a local runner and service on demand", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "aaas-publisher-home-"));
  const fakeCodex = path.join(home, "codex");
  await writeFile(
    fakeCodex,
    `#!/bin/sh
if [ "$1" = "mcp" ] && [ "$2" = "get" ]; then
  exit 1
fi
exit 0
`,
  );
  await chmod(fakeCodex, 0o755);

  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts", "install.mjs"),
      "--role",
      "publisher",
      "--client",
      "codex",
      "--cloud-url",
      "https://aaas.example",
      "--home",
      home,
      "--no-start",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        HOME: home,
        AAAS_HOME: home,
        AAAS_CODEX_BIN: fakeCodex,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /role publisher/i);
  const state = JSON.parse(
    await readFile(path.join(home, ".aaas", "cloud-state.json"), "utf8"),
  );
  assert.equal(state.runner.kind, "local");
  const servicePath =
    process.platform === "darwin"
      ? path.join(
          home,
          "Library",
          "LaunchAgents",
          "com.efflora.aaas-runner.plist",
        )
      : path.join(
          home,
          ".config",
          "systemd",
          "user",
          "aaas-runner.service",
        );
  assert.equal((await lstat(servicePath)).isFile(), true);
});

test("runner service plans support macOS and Linux user services", () => {
  const common = {
    root: "/opt/aaas",
    node: "/opt/aaas/runtime/node/bin/node",
    cloudUrl: "https://aaas.example",
    dataDir: "/home/tester/.aaas",
    home: "/home/tester",
    uid: 501,
  };
  const mac = buildRunnerServicePlan({ ...common, platform: "darwin" });
  assert.match(mac.filePath, /Library\/LaunchAgents\/com\.efflora\.aaas-runner\.plist$/);
  assert.match(mac.document, /AAAS_CLOUD_URL/);
  assert.deepEqual(mac.startCommands.at(-1).args.slice(0, 2), [
    "bootstrap",
    "gui/501",
  ]);

  const linux = buildRunnerServicePlan({
    ...common,
    platform: "linux",
    uid: 1000,
  });
  assert.equal(
    linux.filePath,
    "/home/tester/.config/systemd/user/aaas-runner.service",
  );
  assert.match(linux.document, /Restart=always/);
  assert.deepEqual(linux.startCommands.at(-1), {
    command: "systemctl",
    args: ["--user", "enable", "--now", "aaas-runner.service"],
  });
});
