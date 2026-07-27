import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CloudClient } from "../../src/cloud-client.mjs";
import { CloudState } from "../../src/cloud-state.mjs";
import { fingerprintFile } from "../../src/runtimes/fingerprint.mjs";

const agentId = process.env.AAAS_REFERENCE_AGENT_ID;
const enabled = process.env.AAAS_LIVE_PRODUCTION_RUNNER === "1" && agentId;

test(
  "production installed runner keeps a consumer fork continuous and the source immutable",
  { skip: !enabled, timeout: 180_000 },
  async (context) => {
    const dataDir = path.resolve(
      process.env.AAAS_DATA_DIR ?? path.join(os.homedir(), ".aaas"),
    );
    const state = new CloudState(dataDir);
    const agent = (await state.load()).agents[agentId];
    assert.ok(agent, `Reference Agent ${agentId} is not in local publisher state`);
    const source = await state.getSource(agent.sourceHandle);
    assert.ok(source, `Source ${agent.sourceHandle} was not found`);
    const before = await fingerprintFile(source.snapshotPath);

    const cloud = new CloudClient({
      baseUrl:
        process.env.AAAS_CLOUD_URL ??
        "https://aaas-agent-service.b4yesc4t.chatgpt.site",
    });
    const marker = `AAAS-INSTALLER-E2E-${Date.now()}`;
    const first = await cloud.invokeAndWait(
      {
        agentId,
        input: `Reply with exactly ${marker} and nothing else.`,
      },
      { timeoutMs: 120_000 },
    );
    assert.match(first.message, new RegExp(marker));

    const second = await cloud.invokeAndWait(
      {
        conversationId: first.conversationId,
        input: `Reply with exactly ${marker}-CONTINUED and nothing else.`,
      },
      { timeoutMs: 120_000 },
    );
    assert.equal(second.conversationId, first.conversationId);
    assert.match(second.message, new RegExp(`${marker}-CONTINUED`));
    await cloud.endConversation(first.conversationId);

    assert.equal(await fingerprintFile(source.snapshotPath), before);
    context.diagnostic(
      JSON.stringify({
        agentId,
        conversationId: first.conversationId,
        marker,
        sourceDigestUnchanged: true,
      }),
    );
  },
);
