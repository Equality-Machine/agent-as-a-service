import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { Publisher } from "../src/publisher.mjs";

test("Claude publication excludes an in-progress tool turn and allocates a template session", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-claude-publish-"));
  const sourcePath = path.join(root, "claude.jsonl");
  await writeFile(
    sourcePath,
    [
      JSON.stringify({
        type: "user",
        sessionId: "claude-source",
        cwd: root,
        message: { role: "user", content: "stable context" },
      }),
      JSON.stringify({
        type: "assistant",
        sessionId: "claude-source",
        message: { role: "assistant", stop_reason: "end_turn", content: [] },
      }),
      JSON.stringify({
        type: "user",
        sessionId: "claude-source",
        message: { role: "user", content: "publish now" },
      }),
      JSON.stringify({
        type: "assistant",
        sessionId: "claude-source",
        message: { role: "assistant", stop_reason: null, content: [] },
      }),
      "",
    ].join("\n"),
  );
  const publisher = new Publisher({
    dataDir: path.join(root, "state"),
    cloudUrl: "https://aaas.example",
    env: {},
    cloudClient: { baseUrl: "https://aaas.example" },
    sessionResolver: async () => ({
      provider: "claude",
      sessionId: "claude-source",
      cwd: root,
      path: sourcePath,
    }),
  });

  const snapshot = await publisher.snapshot({
    provider: "claude",
    sessionId: "claude-source",
  });
  const frozen = await readFile(snapshot.snapshotPath, "utf8");
  assert.match(frozen, /stable context/);
  assert.doesNotMatch(frozen, /publish now/);
  assert.match(snapshot.templateSessionId, /^[0-9a-f-]{36}$/);
});
