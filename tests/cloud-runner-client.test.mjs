import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CloudState } from "../src/cloud-state.mjs";
import { CloudRunner } from "../src/runner-client.mjs";
import { fingerprintFile } from "../src/runtimes/fingerprint.mjs";

test("cloud runner forks once, resumes the consumer branch, and reports through leases", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-cloud-runner-"));
  const snapshotPath = path.join(root, "snapshot.jsonl");
  await writeFile(snapshotPath, '{"immutable":true}\n');
  const digest = await fingerprintFile(snapshotPath);
  const state = new CloudState(root);
  const runnerIdentity = await state.ensureRunner("local");
  await state.putSource({
    handle: "src_test",
    provider: "codex",
    originalSessionId: "publisher-source",
    snapshotPath,
    cwd: root,
    digest,
    beforeTurnId: "turn-in-progress",
  });

  const jobs = [
    {
      id: "job-first",
      sourceHandle: "src_test",
      sourceDigest: digest,
      input: "first",
      runtimeSessionId: null,
      leaseToken: "lease-first",
    },
    {
      id: "job-second",
      sourceHandle: "src_test",
      sourceDigest: digest,
      input: "second",
      runtimeSessionId: "consumer-fork",
      leaseToken: "lease-second",
    },
  ];
  const finished = [];
  const cloudClient = {
    async nextJob(id, token) {
      assert.equal(id, runnerIdentity.id);
      assert.equal(token, runnerIdentity.token);
      const job = jobs.shift();
      return job ? { job } : null;
    },
    async finishJob(id, token, payload) {
      assert.equal(id, runnerIdentity.id);
      assert.equal(token, runnerIdentity.token);
      finished.push(payload);
    },
  };
  const calls = [];
  const runtime = {
    async fork({ source, message }) {
      calls.push({ method: "fork", source, message });
      return { runtimeSessionId: "consumer-fork", text: "first reply" };
    },
    async continue({ runtimeSessionId, message }) {
      calls.push({ method: "continue", runtimeSessionId, message });
      return { runtimeSessionId, text: "second reply" };
    },
  };
  const runner = new CloudRunner({
    dataDir: root,
    cloudUrl: "https://aaas.example",
    cloudClient,
    runtimes: { codex: runtime },
  });

  assert.equal((await runner.runOnce()).status, "completed");
  assert.equal((await runner.runOnce()).status, "completed");
  assert.deepEqual(
    calls.map((call) => call.method),
    ["fork", "continue"],
  );
  assert.equal(calls[0].source.path, snapshotPath);
  assert.equal(calls[0].source.beforeTurnId, "turn-in-progress");
  assert.equal(calls[1].runtimeSessionId, "consumer-fork");
  assert.deepEqual(
    finished.map((result) => result.output),
    ["first reply", "second reply"],
  );
});

test("a running cloud runner discovers enrollment written after startup", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-cloud-runner-reload-"));
  const calls = [];
  const cloudClient = {
    async nextJob(id, token) {
      calls.push({ id, token });
      return null;
    },
  };
  const runner = new CloudRunner({
    dataDir: root,
    cloudUrl: "https://aaas.example",
    cloudClient,
    runtimes: {},
  });

  assert.deepEqual(await runner.runOnce(), { status: "unconfigured" });

  const enrollmentState = new CloudState(root);
  const identity = await enrollmentState.ensureRunner("local");

  assert.deepEqual(await runner.runOnce(), { status: "idle" });
  assert.deepEqual(calls, [{ id: identity.id, token: identity.token }]);
});
