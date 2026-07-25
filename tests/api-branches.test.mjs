import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createAaasServer } from "../src/server.mjs";

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json();
  assert.equal(response.status, options.expectedStatus ?? 200, JSON.stringify(body));
  return body;
}

test("each use forks the source and keeps its own continuous conversation", async (t) => {
  const calls = [];
  let forkNumber = 0;
  const runtime = {
    async fingerprintSource(source) {
      return `unchanged:${source.sessionId}`;
    },
    async fork({ source, message }) {
      const runtimeSessionId = `fork-${++forkNumber}`;
      calls.push(["fork", source.sessionId, runtimeSessionId, message]);
      return { runtimeSessionId, text: `started ${runtimeSessionId}: ${message}` };
    },
    async continue({ runtimeSessionId, message }) {
      calls.push(["continue", runtimeSessionId, message]);
      return { runtimeSessionId, text: `${runtimeSessionId} remembers: ${message}` };
    },
  };
  const dataDir = await mkdtemp(path.join(tmpdir(), "aaas-test-"));
  const app = createAaasServer({ dataDir, runtimes: { claude: runtime } });
  await app.listen(0, "127.0.0.1");
  t.after(() => app.close());
  const baseUrl = `http://127.0.0.1:${app.address().port}`;

  const agent = await request(baseUrl, "/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: "Experienced researcher",
      provider: "claude",
      sourceSessionId: "source-session",
      cwd: dataDir,
      placement: "local",
    }),
    expectedStatus: 201,
  });
  const branchA = await request(baseUrl, `/api/agents/${agent.id}/branches`, {
    method: "POST",
    body: "{}",
    expectedStatus: 201,
  });
  const branchB = await request(baseUrl, `/api/agents/${agent.id}/branches`, {
    method: "POST",
    body: "{}",
    expectedStatus: 201,
  });

  await request(baseUrl, `/api/branches/${branchA.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: "A-one" }),
  });
  await request(baseUrl, `/api/branches/${branchA.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: "A-two" }),
  });
  await request(baseUrl, `/api/branches/${branchB.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: "B-one" }),
  });

  assert.deepEqual(calls, [
    ["fork", "source-session", "fork-1", "A-one"],
    ["continue", "fork-1", "A-two"],
    ["fork", "source-session", "fork-2", "B-one"],
  ]);
  assert.notEqual(branchA.id, branchB.id);
});
