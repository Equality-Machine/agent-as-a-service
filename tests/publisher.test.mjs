import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CloudState } from "../src/cloud-state.mjs";
import { Publisher } from "../src/publisher.mjs";
import { fingerprintFile } from "../src/runtimes/fingerprint.mjs";

test("publisher freezes the current Codex session and publishes only an opaque handle", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-publisher-"));
  const sourcePath = path.join(root, "active.jsonl");
  const sessionId = "codex-current-session";
  await writeFile(
    sourcePath,
    [
      JSON.stringify({
        type: "session_meta",
        payload: { id: sessionId, cwd: root },
      }),
      JSON.stringify({
        type: "turn_context",
        payload: { turn_id: "turn-completed" },
      }),
      JSON.stringify({
        type: "response_item",
        payload: { type: "message", role: "assistant", content: [] },
      }),
      JSON.stringify({
        type: "turn_context",
        payload: { turn_id: "turn-publishing-now" },
      }),
      JSON.stringify({
        type: "response_item",
        payload: { type: "function_call", name: "publish_current_agent" },
      }),
      "",
    ].join("\n"),
  );

  let cloudPayload;
  const cloudClient = {
    baseUrl: "https://aaas.example",
    async publish(payload) {
      cloudPayload = payload;
      return {
        agent: {
          id: "agt_test",
          versionId: "ver_test",
          name: payload.name,
          executionMode: payload.executionMode,
        },
      };
    },
  };
  const publisher = new Publisher({
    dataDir: path.join(root, "state"),
    cloudUrl: "https://aaas.example",
    env: { CODEX_THREAD_ID: sessionId },
    cloudClient,
    sessionResolver: async () => ({
      provider: "codex",
      sessionId,
      cwd: root,
      path: sourcePath,
    }),
  });

  const published = await publisher.publishCurrent({
    name: "Snapshot agent",
    executionMode: "local",
  });
  const state = new CloudState(path.join(root, "state"));
  const localSource = await state.getSource(published.sourceHandle);
  const snapshotBefore = await readFile(localSource.snapshotPath, "utf8");
  await appendFile(sourcePath, '{"later":"publisher keeps talking"}\n');

  assert.equal(localSource.beforeTurnId, "turn-publishing-now");
  assert.equal(await readFile(localSource.snapshotPath, "utf8"), snapshotBefore);
  assert.equal(await fingerprintFile(localSource.snapshotPath), localSource.digest);
  assert.equal(cloudPayload.sourceHandle, localSource.handle);
  assert.equal(cloudPayload.sourceDigest, localSource.digest);
  assert.ok(!JSON.stringify(cloudPayload).includes(sourcePath));
  assert.ok(!JSON.stringify(cloudPayload).includes("turn-publishing-now"));
  assert.equal(published.shareUrl, "https://aaas.example/?agent=agt_test");
});
