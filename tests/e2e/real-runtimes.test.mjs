import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ClaudeRuntime } from "../../src/runtimes/claude.mjs";
import { CodexRuntime } from "../../src/runtimes/codex.mjs";
import { createAaasServer } from "../../src/server.mjs";
import { discoverSessions } from "../../src/session-discovery.mjs";

const runReal = process.env.AAAS_REAL_E2E === "1";

async function accessibleSession(provider) {
  const sessions = await discoverSessions({ provider, limit: 80 });
  for (const session of sessions) {
    if (Date.now() - new Date(session.updatedAt).getTime() < 60 * 60_000) continue;
    try {
      await access(session.cwd);
      return session;
    } catch {
      // Keep looking for a source whose original working directory still exists.
    }
  }
  throw new Error(`No accessible ${provider} session found`);
}

async function verifyRealFork(provider, runtime) {
  const source = await accessibleSession(provider);
  const dataDir = await mkdtemp(path.join(tmpdir(), `aaas-real-${provider}-`));
  const app = createAaasServer({ dataDir, runtimes: { [provider]: runtime } });
  await app.listen(0, "127.0.0.1");
  const baseUrl = `http://127.0.0.1:${app.address().port}`;
  const marker = `AAAS-${provider.toUpperCase()}-${Date.now()}`;
  try {
    const publishResponse = await fetch(`${baseUrl}/api/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `Real ${provider} acceptance`,
        provider,
        sourceSessionId: source.sessionId,
        sourceSessionPath: source.path,
        cwd: source.cwd,
      }),
    });
    const publishText = await publishResponse.text();
    assert.equal(publishResponse.status, 201, publishText);
    const agent = JSON.parse(publishText);
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agent: agent.id,
        input: `Reply with exactly ${marker}. Do not use tools.`,
      }),
    });
    const responseText = await response.text();
    assert.equal(response.status, 201, responseText);
    const body = JSON.parse(responseText);
    assert.match(body.output[0].text, new RegExp(marker));
    assert.ok(body.conversation_id);
    const internal = await app.service.getBranch(body.conversation_id);
    assert.notEqual(internal.runtimeSessionId, source.sessionId);

    const continuationMarker = `${marker}-CONTINUED`;
    const continuationResponse = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversation: body.conversation_id,
        input: `Reply with exactly ${continuationMarker}. Do not use tools.`,
      }),
    });
    const continuationText = await continuationResponse.text();
    assert.equal(continuationResponse.status, 201, continuationText);
    const continuation = JSON.parse(continuationText);
    assert.equal(continuation.conversation_id, body.conversation_id);
    assert.match(
      continuation.output[0].text,
      new RegExp(continuationMarker),
    );
    const continuedInternal = await app.service.getBranch(body.conversation_id);
    assert.equal(continuedInternal.runtimeSessionId, internal.runtimeSessionId);
    assert.equal(await runtime.fingerprintSource(source), agent.source_digest);
    return {
      provider,
      sourceSessionId: source.sessionId,
      branchSessionId: internal.runtimeSessionId,
      conversationId: body.conversation_id,
      marker,
      continuationMarker,
    };
  } finally {
    await app.close();
  }
}

test(
  "real Claude session forks without changing its source",
  { skip: !runReal, timeout: 600_000 },
  async (t) => {
    const proof = await verifyRealFork("claude", new ClaudeRuntime());
    t.diagnostic(JSON.stringify(proof));
  },
);

test(
  "real Codex session forks without changing its source",
  { skip: !runReal, timeout: 600_000 },
  async (t) => {
    const proof = await verifyRealFork("codex", new CodexRuntime());
    t.diagnostic(JSON.stringify(proof));
  },
);
