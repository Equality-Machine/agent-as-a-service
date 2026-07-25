import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createAaasServer } from "../src/server.mjs";

test("MCP exposes start, continue, and end with the same conversation semantics", async (t) => {
  const runtime = {
    fingerprintSource: async () => "digest",
    fork: async ({ message }) => ({ runtimeSessionId: "forked", text: `start:${message}` }),
    continue: async ({ runtimeSessionId, message }) => ({
      runtimeSessionId,
      text: `continue:${message}`,
    }),
  };
  const dataDir = await mkdtemp(path.join(tmpdir(), "aaas-mcp-"));
  const app = createAaasServer({ dataDir, runtimes: { claude: runtime } });
  await app.listen(0, "127.0.0.1");
  t.after(() => app.close());
  const baseUrl = `http://127.0.0.1:${app.address().port}`;
  const agent = await (
    await fetch(`${baseUrl}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "MCP agent",
        provider: "claude",
        sourceSessionId: "source",
        cwd: dataDir,
      }),
    })
  ).json();

  async function rpc(id, method, params = {}) {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    assert.equal(response.status, 200);
    return response.json();
  }

  const initialized = await rpc(1, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });
  assert.equal(initialized.result.serverInfo.name, "aaas");
  const tools = await rpc(2, "tools/list");
  assert.deepEqual(
    tools.result.tools.map((tool) => tool.name),
    ["list_agents", "agent_start", "agent_continue", "agent_end"],
  );
  const first = await rpc(3, "tools/call", {
    name: "agent_start",
    arguments: { agent: agent.id, input: "one" },
  });
  assert.equal(first.result.structuredContent.output, "start:one");
  const conversationId = first.result.structuredContent.conversation_id;
  const second = await rpc(4, "tools/call", {
    name: "agent_continue",
    arguments: { conversation_id: conversationId, input: "two" },
  });
  assert.equal(second.result.structuredContent.output, "continue:two");
  const ended = await rpc(5, "tools/call", {
    name: "agent_end",
    arguments: { conversation_id: conversationId },
  });
  assert.equal(ended.result.structuredContent.status, "closed");
});
