import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  lstat,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const enabled = process.env.AAAS_LIVE_PUBLIC_INSTALL === "1";
const rawInstaller =
  "https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh";

test(
  "public GitHub one-liner installs a consumer without a runner",
  { skip: !enabled },
  async () => {
    const home = await mkdtemp(path.join(tmpdir(), "aaas-public-install-"));
    const installer = path.join(home, "install.sh");
    const fakeCodex = path.join(home, "codex");
    const response = await fetch(rawInstaller);
    assert.equal(response.status, 200);
    await writeFile(installer, await response.text(), { mode: 0o755 });
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
      "bash",
      [
        installer,
        "--role",
        "consumer",
        "--client",
        "codex",
        "--install-dir",
        path.join(home, "app"),
        "--data-dir",
        path.join(home, ".aaas"),
      ],
      {
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
    assert.match(
      await readFile(path.join(home, "app", "package.json"), "utf8"),
      /agent-as-a-service/,
    );
    assert.equal(
      (await lstat(path.join(home, ".codex", "skills", "aaas"))).isSymbolicLink(),
      true,
    );
    await assert.rejects(
      () => lstat(path.join(home, ".aaas", "cloud-state.json")),
      /ENOENT/,
    );
  },
);
