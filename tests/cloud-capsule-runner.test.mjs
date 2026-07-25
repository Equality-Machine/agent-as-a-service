import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { encryptSourceCapsule } from "../src/capsule.mjs";
import { CloudState } from "../src/cloud-state.mjs";
import { CloudRunner } from "../src/runner-client.mjs";
import { fingerprintFile } from "../src/runtimes/fingerprint.mjs";

test("a server runner downloads and decrypts a portable source on first job", async () => {
  const publisherDir = await mkdtemp(path.join(tmpdir(), "aaas-cloud-publisher-"));
  const serverDir = await mkdtemp(path.join(tmpdir(), "aaas-cloud-server-"));
  const publisherSnapshot = path.join(publisherDir, "source.jsonl");
  await writeFile(publisherSnapshot, '{"cloud":"portable"}\n');
  const digest = await fingerprintFile(publisherSnapshot);
  const serverState = new CloudState(serverDir);
  const runnerIdentity = await serverState.ensureRunner("cloud");
  const encrypted = await encryptSourceCapsule(
    {
      provider: "codex",
      originalSessionId: "publisher-session",
      snapshotPath: publisherSnapshot,
      beforeTurnId: "publishing-turn",
    },
    runnerIdentity.token,
  );
  const finished = [];
  const cloudClient = {
    async nextJob() {
      return {
        job: {
          id: "job-cloud",
          sourceHandle: "src_cloud",
          sourceDigest: digest,
          capsuleAvailable: true,
          input: "hello",
          runtimeSessionId: null,
          leaseToken: "lease-cloud",
        },
      };
    },
    async getCapsule(id, token, handle) {
      assert.equal(id, runnerIdentity.id);
      assert.equal(token, runnerIdentity.token);
      assert.equal(handle, "src_cloud");
      return { capsule: encrypted };
    },
    async finishJob(id, token, payload) {
      finished.push(payload);
    },
  };
  const runtime = {
    async fork({ source }) {
      assert.match(source.path, /src_cloud\.jsonl$/);
      assert.notEqual(source.path, publisherSnapshot);
      assert.equal(source.beforeTurnId, "publishing-turn");
      return { runtimeSessionId: "server-fork", text: "cloud reply" };
    },
  };
  const runner = new CloudRunner({
    dataDir: serverDir,
    cloudUrl: "https://aaas.example",
    cloudClient,
    runtimes: { codex: runtime },
  });

  assert.equal((await runner.runOnce()).status, "completed");
  const imported = await new CloudState(serverDir).getSource("src_cloud");
  assert.equal(imported.encryptedTransfer, true);
  assert.equal(await fingerprintFile(imported.snapshotPath), digest);
  assert.equal(finished[0].output, "cloud reply");
});
