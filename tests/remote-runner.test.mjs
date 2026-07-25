import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { RemoteRuntime } from "../src/runtimes/remote.mjs";
import { createAaasServer } from "../src/server.mjs";

test("remote placement delegates fork and continuation to an authenticated runner", async (t) => {
  const token = "runner-test-token";
  const calls = [];
  const runtime = {
    async fingerprintSource(source) {
      return `fingerprint:${source.sessionId}`;
    },
    async fork({ source, message }) {
      calls.push(["fork", source.sessionId, message]);
      return { runtimeSessionId: "remote-fork", text: "remote first" };
    },
    async continue({ runtimeSessionId, message }) {
      calls.push(["continue", runtimeSessionId, message]);
      return { runtimeSessionId, text: "remote second" };
    },
  };
  const runnerDir = await mkdtemp(path.join(tmpdir(), "aaas-runner-"));
  const runner = createAaasServer({
    dataDir: runnerDir,
    runtimes: { claude: runtime },
    runnerToken: token,
  });
  await runner.listen(0, "127.0.0.1");
  t.after(() => runner.close());
  const runnerUrl = `http://127.0.0.1:${runner.address().port}`;

  const controlDir = await mkdtemp(path.join(tmpdir(), "aaas-control-"));
  const control = createAaasServer({
    dataDir: controlDir,
    runtimes: { claude: runtime },
    remoteRuntime: new RemoteRuntime({ token }),
  });
  await control.listen(0, "127.0.0.1");
  t.after(() => control.close());
  const controlUrl = `http://127.0.0.1:${control.address().port}`;

  const publish = await fetch(`${controlUrl}/api/agents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Remote agent",
      provider: "claude",
      sourceSessionId: "source",
      cwd: runnerDir,
      placement: "remote",
      runnerUrl,
    }),
  });
  assert.equal(publish.status, 201);
  const agent = await publish.json();
  const branchResponse = await fetch(`${controlUrl}/api/agents/${agent.id}/branches`, {
    method: "POST",
  });
  const branch = await branchResponse.json();
  for (const message of ["first", "second"]) {
    const response = await fetch(`${controlUrl}/api/branches/${branch.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    assert.equal(response.status, 200, await response.text());
  }
  assert.deepEqual(calls, [
    ["fork", "source", "first"],
    ["continue", "remote-fork", "second"],
  ]);

  const unauthorized = await fetch(`${runnerUrl}/internal/runtime/fingerprint`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "claude", source: { sessionId: "source" } }),
  });
  assert.equal(unauthorized.status, 401);
});
