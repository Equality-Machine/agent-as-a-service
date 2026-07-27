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
  const stages = [];
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
    async heartbeatJob(id, token, payload) {
      assert.equal(id, runnerIdentity.id);
      assert.equal(token, runnerIdentity.token);
      stages.push(payload.stage);
      return { cancelRequested: false };
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
  assert.deepEqual(stages, [
    "loading_source",
    "starting_runtime",
    "running",
    "finalizing",
    "loading_source",
    "starting_runtime",
    "running",
    "finalizing",
  ]);
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

test("a running cloud runner reloads a snapshot published while a job is claimed", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-cloud-runner-snapshot-reload-"));
  const snapshotPath = path.join(root, "fresh-snapshot.jsonl");
  await writeFile(snapshotPath, '{"fresh":true}\n');
  const digest = await fingerprintFile(snapshotPath);
  const enrollmentState = new CloudState(root);
  const identity = await enrollmentState.ensureRunner("local");
  const finished = [];
  let claimed = false;
  const cloudClient = {
    async nextJob(id, token) {
      assert.equal(id, identity.id);
      assert.equal(token, identity.token);
      if (claimed) return null;
      claimed = true;
      const publisherState = new CloudState(root);
      await publisherState.putSource({
        handle: "src_fresh",
        provider: "codex",
        originalSessionId: "publisher-source",
        snapshotPath,
        cwd: root,
        digest,
      });
      return {
        job: {
          id: "job-fresh",
          sourceHandle: "src_fresh",
          sourceDigest: digest,
          input: "fresh",
          runtimeSessionId: null,
          leaseToken: "lease-fresh",
        },
      };
    },
    async finishJob(_id, _token, payload) {
      finished.push(payload);
    },
  };
  const runner = new CloudRunner({
    dataDir: root,
    cloudUrl: "https://aaas.example",
    cloudClient,
    runtimes: {
      codex: {
        async fork() {
          return { runtimeSessionId: "consumer-fresh", text: "fresh reply" };
        },
      },
    },
  });

  assert.deepEqual(await runner.runOnce(), {
    status: "completed",
    jobId: "job-fresh",
  });
  assert.equal(finished[0].output, "fresh reply");
});

test("runner aborts an active runtime when the lease reports cancellation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-cloud-runner-cancel-"));
  const snapshotPath = path.join(root, "snapshot.jsonl");
  await writeFile(snapshotPath, '{"immutable":true}\n');
  const digest = await fingerprintFile(snapshotPath);
  const state = new CloudState(root);
  await state.ensureRunner("local");
  await state.putSource({
    handle: "src_cancel",
    provider: "codex",
    originalSessionId: "publisher-source",
    snapshotPath,
    cwd: root,
    digest,
  });
  const finished = [];
  const cloudClient = {
    async nextJob() {
      return {
        job: {
          id: "job-cancel",
          sourceHandle: "src_cancel",
          sourceDigest: digest,
          input: "cancel me",
          runtimeSessionId: null,
          leaseToken: "lease-cancel",
        },
      };
    },
    async heartbeatJob(_id, _token, payload) {
      return { cancelRequested: payload.stage === "running" };
    },
    async finishJob(_id, _token, payload) {
      finished.push(payload);
    },
  };
  const runtime = {
    async fork({ signal }) {
      signal?.throwIfAborted();
      throw new Error("runtime should have been cancelled before starting");
    },
  };
  const runner = new CloudRunner({
    dataDir: root,
    cloudUrl: "https://aaas.example",
    cloudClient,
    runtimes: { codex: runtime },
  });

  assert.deepEqual(await runner.runOnce(), {
    status: "cancelled",
    jobId: "job-cancel",
  });
  assert.equal(finished[0].cancelled, true);
  assert.equal(finished[0].error, "Cancelled by user");
});

test("runner stops and drains lease heartbeats before completing a job", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-cloud-runner-heartbeat-stop-"));
  const snapshotPath = path.join(root, "snapshot.jsonl");
  await writeFile(snapshotPath, '{"immutable":true}\n');
  const digest = await fingerprintFile(snapshotPath);
  const state = new CloudState(root);
  await state.ensureRunner("local");
  await state.putSource({
    handle: "src_heartbeat",
    provider: "codex",
    originalSessionId: "publisher-source",
    snapshotPath,
    cwd: root,
    digest,
  });
  let finished = false;
  let heartbeatAfterFinish = 0;
  const cloudClient = {
    async nextJob() {
      return {
        job: {
          id: "job-heartbeat",
          sourceHandle: "src_heartbeat",
          sourceDigest: digest,
          input: "finish cleanly",
          runtimeSessionId: null,
          leaseToken: "lease-heartbeat",
        },
      };
    },
    async heartbeatJob() {
      await new Promise((resolve) => setTimeout(resolve, 3));
      if (finished) heartbeatAfterFinish += 1;
      return { cancelRequested: false };
    },
    async finishJob() {
      finished = true;
    },
  };
  const runner = new CloudRunner({
    dataDir: root,
    cloudUrl: "https://aaas.example",
    cloudClient,
    heartbeatMs: 1,
    runtimes: {
      codex: {
        async fork() {
          await new Promise((resolve) => setTimeout(resolve, 8));
          return { runtimeSessionId: "consumer-heartbeat", text: "done" };
        },
      },
    },
  });

  assert.equal((await runner.runOnce()).status, "completed");
  assert.equal(heartbeatAfterFinish, 0);
});
