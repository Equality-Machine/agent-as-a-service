import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createAaasServer } from "../src/server.mjs";

test("Responses API implicitly creates a conversation and continues it", async (t) => {
  const calls = [];
  const runtime = {
    async fingerprintSource() {
      return "sha256:frozen";
    },
    async fork({ message }) {
      calls.push(["fork", message]);
      return { runtimeSessionId: "private-runtime-id", text: "first answer" };
    },
    async continue({ runtimeSessionId, message }) {
      calls.push(["continue", runtimeSessionId, message]);
      return { runtimeSessionId, text: "second answer" };
    },
  };
  const dataDir = await mkdtemp(path.join(tmpdir(), "aaas-responses-"));
  const app = createAaasServer({ dataDir, runtimes: { claude: runtime } });
  await app.listen(0, "127.0.0.1");
  t.after(() => app.close());
  const baseUrl = `http://127.0.0.1:${app.address().port}`;

  const agentResponse = await fetch(`${baseUrl}/api/agents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Researcher",
      provider: "claude",
      sourceSessionId: "secret-source",
      sourceSessionPath: "/private/source.jsonl",
      cwd: "/private/workspace",
    }),
  });
  const agent = await agentResponse.json();

  const firstResponse = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agent: agent.id, input: "first question" }),
  });
  assert.equal(firstResponse.status, 201);
  const first = await firstResponse.json();
  assert.equal(first.status, "completed");
  assert.equal(first.output[0].text, "first answer");
  assert.ok(first.conversation_id);
  assert.equal("runtimeSessionId" in first, false);

  const secondResponse = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ conversation: first.conversation_id, input: "follow up" }),
  });
  assert.equal(secondResponse.status, 201);
  const second = await secondResponse.json();
  assert.equal(second.conversation_id, first.conversation_id);
  assert.equal(second.output[0].text, "second answer");

  const close = await fetch(
    `${baseUrl}/v1/conversations/${first.conversation_id}/close`,
    { method: "POST" },
  );
  assert.equal(close.status, 200);
  assert.deepEqual(calls, [
    ["fork", "first question"],
    ["continue", "private-runtime-id", "follow up"],
  ]);

  const publicAgents = await (await fetch(`${baseUrl}/api/agents`)).json();
  assert.equal(JSON.stringify(publicAgents).includes("secret-source"), false);
  assert.equal(JSON.stringify(publicAgents).includes("/private/"), false);
});
